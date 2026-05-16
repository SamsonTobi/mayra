"""Drive `agent-browser` via subprocess; JSON in/out only (no shell interpolation)."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

import httpx
from websockets.asyncio.client import connect as ws_connect
from websockets.exceptions import WebSocketException

from mayra_orchestrator.errors import BrowserError

_AGENT_BROWSER_HINT = (
    "Install: npm i -g agent-browser && agent-browser install. "
    "If it is installed, ensure the npm global bin is on PATH, or set MAYRA_AGENT_BROWSER_BIN "
    "to the full path of the agent-browser executable."
)
_CDP_HOSTS = ("127.0.0.1", "localhost")
_CDP_CONNECT_TIMEOUT = 3.0
_CDP_COMMAND_TIMEOUT = 10.0
_CDP_MAX_WS_MESSAGE = 64 * 1024 * 1024
_POLICY_PATH = Path(__file__).with_name("policies") / "mayra-default.json"
_RETRYABLE_BROWSER_ERRORS = (
    "connection attempt failed",
    "connected host has failed to respond",
    "timed out",
    "timeout",
    "connection refused",
    "forcibly closed",
    "no chrome devtools endpoint responded",
    "winerror 10060",
    "winerror 10054",
)


def _is_retryable_browser_error(exc: BrowserError) -> bool:
    message = str(exc).lower()
    return any(token in message for token in _RETRYABLE_BROWSER_ERRORS)


def _agent_browser_failure_message(payload: dict[str, Any]) -> str:
    """Human-readable error when agent-browser reports failure or omits detail."""
    err = payload.get("error")
    if isinstance(err, str) and err.strip():
        val = err.strip()
        if val == "None":
            return json.dumps(payload, default=str)
        return val
    if err not in (None, "", False):
        return str(err)
    try:
        clipped = json.dumps(payload, default=str)
    except TypeError:
        clipped = str(payload)
    return clipped if len(clipped) <= 800 else f"{clipped[:800]}…"


def _ensure_agent_browser_ok(payload: dict[str, Any]) -> None:
    """Raise BrowserError if payload indicates failure; ignore null/empty `error` on success."""
    if payload.get("success") is False:
        raise BrowserError(_agent_browser_failure_message(payload))
    err = payload.get("error")
    if err is None or err is False:
        return
    if isinstance(err, str):
        cleaned = err.strip()
        if not cleaned or cleaned == "None":
            return
        raise BrowserError(cleaned)
    if str(err).strip() == "None":
        return
    raise BrowserError(str(err))


def _lookup_agent_browser_exe() -> str | None:
    """Resolve agent-browser CLI; Windows uses .cmd shims under the npm global prefix."""
    raw = os.environ.get("MAYRA_AGENT_BROWSER_BIN", "agent-browser").strip()
    if not raw:
        raw = "agent-browser"
    p = Path(raw)
    if p.is_file():
        return str(p.resolve())
    found = shutil.which(raw)
    if found:
        return found
    if os.name == "nt" and not raw.lower().endswith(".cmd"):
        found = shutil.which(f"{raw}.cmd")
        if found:
            return found
    return None


def _require_agent_browser_exe() -> str:
    exe = _lookup_agent_browser_exe()
    if exe is None:
        raise BrowserError(f"agent-browser not found on PATH. {_AGENT_BROWSER_HINT}")
    return exe


def snapshot_node_count(snapshot_json: dict[str, Any]) -> int:
    """Derive ref/node count from `agent-browser snapshot --json` output."""
    data = snapshot_json.get("data")
    if isinstance(data, dict):
        refs = data.get("refs")
        if isinstance(refs, dict):
            return len(refs)
        snap = data.get("snapshot")
        if isinstance(snap, str):
            return len(set(re.findall(r"@e\d+", snap)))
    nodes = snapshot_json.get("nodes")
    if isinstance(nodes, list):
        return len(nodes)
    return 0


async def _probe_cdp_endpoint(cdp_port: int) -> dict[str, Any]:
    """Fast CDP liveness check. Avoid `agent-browser connect`, which can hang."""
    timeout = httpx.Timeout(_CDP_CONNECT_TIMEOUT, connect=_CDP_CONNECT_TIMEOUT)
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=timeout) as client:
        for host in _CDP_HOSTS:
            url = f"http://{host}:{cdp_port}/json/version"
            try:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
            except (httpx.HTTPError, ValueError) as e:
                errors.append(f"{url}: {e}")
                continue
            if isinstance(payload, dict):
                return payload
            errors.append(f"{url}: expected JSON object")

    detail = "; ".join(errors[-2:]) if errors else "no attempts made"
    raise BrowserError(f"no Chrome DevTools endpoint responded on port {cdp_port}: {detail}")


async def _cdp_page_ws_url(cdp_port: int) -> str:
    """Return the first page target WebSocket URL from a DevTools HTTP endpoint."""
    timeout = httpx.Timeout(_CDP_CONNECT_TIMEOUT, connect=_CDP_CONNECT_TIMEOUT)
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=timeout) as client:
        for host in _CDP_HOSTS:
            for path in ("/json", "/json/list"):
                url = f"http://{host}:{cdp_port}{path}"
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    targets = response.json()
                except (httpx.HTTPError, ValueError) as e:
                    errors.append(f"{url}: {e}")
                    continue
                if not isinstance(targets, list):
                    errors.append(f"{url}: expected JSON array")
                    continue
                fallback: str | None = None
                for target in targets:
                    if not isinstance(target, dict):
                        continue
                    ws_url = target.get("webSocketDebuggerUrl")
                    if not isinstance(ws_url, str) or not ws_url:
                        continue
                    fallback = fallback or ws_url
                    if target.get("type") == "page":
                        return ws_url
                if fallback:
                    return fallback

    detail = "; ".join(errors[-2:]) if errors else "no page targets found"
    raise BrowserError(f"no CDP page target found on port {cdp_port}: {detail}")


async def _cdp_call(cdp_port: int, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute one CDP command against the selected page target."""
    ws_url = await _cdp_page_ws_url(cdp_port)
    msg_id = 1
    payload = {"id": msg_id, "method": method}
    if params is not None:
        payload["params"] = params
    try:
        async with ws_connect(
            ws_url,
            open_timeout=_CDP_CONNECT_TIMEOUT,
            close_timeout=1,
            max_size=_CDP_MAX_WS_MESSAGE,
        ) as ws:
            await ws.send(json.dumps(payload))
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=_CDP_COMMAND_TIMEOUT)
                message = json.loads(raw)
                if message.get("id") != msg_id:
                    continue
                if "error" in message:
                    err_payload = message["error"]
                    if err_payload not in (None, "", False):
                        detail = (
                            json.dumps(err_payload, default=str)
                            if isinstance(err_payload, dict)
                            else str(err_payload)
                        )
                        raise BrowserError(f"CDP {method} failed: {detail}")
                result = message.get("result", {})
                return result if isinstance(result, dict) else {}
    except (TimeoutError, WebSocketException, OSError, json.JSONDecodeError) as e:
        raise BrowserError(f"CDP {method} failed on port {cdp_port}: {e}") from e


class AgentBrowserAdapter:
    """Minimal surface for Phase 3: CDP connect, snapshot, screenshot, doctor."""

    def __init__(self, *, data_dir: Path | None = None) -> None:
        self._data_dir = data_dir
        self._session_ports: dict[str, int] = {}

    def _base(self, session_id: str, allowed_domains: list[str] | None = None) -> list[str]:
        if session_id not in self._session_ports:
            raise BrowserError(f"unknown session {session_id!r} (call open first)")
        port = self._session_ports[session_id]
        cmd = [
            _require_agent_browser_exe(),
            "--cdp",
            str(port),
            "--session",
            session_id,
            "--json",
            "--content-boundaries",
            "--max-output",
            "20000",
            "--action-policy",
            str(_POLICY_PATH),
            "--confirm-actions",
            "eval,download,upload",
        ]
        if self._data_dir:
            cmd.extend(["--download-path", str(self._data_dir / "downloads")])
        if allowed_domains:
            cmd.extend(["--allowed-domains", ",".join(allowed_domains)])
        return cmd

    async def _exec(self, *argv: str, timeout: float = 120.0) -> dict[str, Any]:
        env = os.environ.copy()
        env["AGENT_BROWSER_DEFAULT_TIMEOUT"] = str(int(timeout * 1000))
        try:
            proc = await asyncio.create_subprocess_exec(
                *argv,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
        except FileNotFoundError as e:
            raise BrowserError(
                f"agent-browser executable not found ({argv[0]!r}). {_AGENT_BROWSER_HINT}",
            ) from e
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except TimeoutError:
            proc.kill()
            await proc.wait()
            raise BrowserError("agent-browser subprocess timed out") from None

        err = stderr.decode("utf-8", errors="replace").strip()
        out = stdout.decode("utf-8", errors="replace").strip()
        if proc.returncode != 0:
            msg = err or out or f"agent-browser exited {proc.returncode}"
            if msg.strip() == "None":
                msg = f"agent-browser exited {proc.returncode} with string 'None'"
            raise BrowserError(msg)

        if not out:
            return {}
        try:
            return json.loads(out)
        except json.JSONDecodeError as e:
            raise BrowserError(f"agent-browser stdout is not JSON: {out[:500]!r}") from e

    async def _exec_read(self, argv: list[str], *, timeout: float) -> dict[str, Any]:
        for attempt in range(2):
            try:
                return await self._exec(*argv, timeout=timeout)
            except BrowserError as exc:
                if attempt == 0 and _is_retryable_browser_error(exc):
                    await asyncio.sleep(0.4)
                    continue
                raise

    async def run_doctor(self) -> dict[str, Any]:
        """Run `agent-browser doctor --json` (non-fatal: orchestrator still boots)."""
        exe = _lookup_agent_browser_exe()
        if exe is None:
            return {
                "ok": False,
                "missing": True,
                "message": f"agent-browser not found on PATH. {_AGENT_BROWSER_HINT}",
            }
        try:
            return await self._exec(exe, "doctor", "--json", timeout=60.0)
        except BrowserError as e:
            return {"ok": False, "missing": False, "message": str(e)}

    async def open(self, cdp_port: int, session_id: str) -> None:
        """Attach to an existing Chromium CDP port (remote debugging)."""
        _require_agent_browser_exe()
        await _probe_cdp_endpoint(cdp_port)
        self._session_ports[session_id] = cdp_port

    async def snapshot(self, session_id: str, allowed_domains: list[str] | None = None) -> dict[str, Any]:
        """Accessibility snapshot with agent-browser refs usable for later actions."""
        argv = [*self._base(session_id, allowed_domains), "snapshot"]
        for attempt in range(2):
            payload = await self._exec_read(argv, timeout=60.0)
            if payload.get("success") is False:
                err = BrowserError(_agent_browser_failure_message(payload))
                if attempt == 0 and _is_retryable_browser_error(err):
                    await asyncio.sleep(0.4)
                    continue
                raise err
            return payload
        return {}

    async def screenshot_png_bytes(self, session_id: str) -> bytes:
        """Capture viewport screenshot as PNG bytes via CDP."""
        if session_id not in self._session_ports:
            raise BrowserError(f"unknown session {session_id!r} (call open first)")
        port = self._session_ports[session_id]
        for attempt in range(2):
            try:
                result = await _cdp_call(
                    port,
                    "Page.captureScreenshot",
                    {"format": "png", "fromSurface": True},
                )
                break
            except BrowserError as exc:
                if attempt == 0 and _is_retryable_browser_error(exc):
                    await asyncio.sleep(0.4)
                    continue
                raise
        encoded = result.get("data")
        if not isinstance(encoded, str) or not encoded:
            raise BrowserError("CDP Page.captureScreenshot returned no image data")
        try:
            return base64.b64decode(encoded, validate=True)
        except ValueError as e:
            raise BrowserError("CDP Page.captureScreenshot returned invalid base64") from e

    async def screenshot_annotated(self, task_id: str, allowed_domains: list[str] | None = None) -> tuple[bytes, str]:
        """Annotated screenshot for a known CDP session id (same id passed to `open`)."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            payload = await self._exec_read(
                [
                    *self._base(task_id, allowed_domains),
                    "screenshot",
                    str(tmp_path),
                    "--annotate",
                ],
                timeout=120.0,
            )
            if payload.get("success") is False:
                raise BrowserError(_agent_browser_failure_message(payload))
            if not tmp_path.is_file():
                raise BrowserError("annotated screenshot missing")
            return tmp_path.read_bytes(), "image/png"
        finally:
            tmp_path.unlink(missing_ok=True)

    async def execute(self, task_id: str, action: object, cmds: list[str], allowed_domains: list[str] | None = None) -> None:
        """Execute a validated action command against the attached CDP session."""
        _ = action
        for attempt in range(2):
            try:
                payload = await self._exec(*self._base(task_id, allowed_domains), *cmds, timeout=120.0)
                _ensure_agent_browser_ok(payload)
                return
            except BrowserError as exc:
                if attempt == 0 and _is_retryable_browser_error(exc):
                    await asyncio.sleep(0.4)
                    continue
                raise

    async def close_all(self) -> None:
        self._session_ports.clear()
