"""Cloud Chromium process manager — launches and cleans up headless Chromium in-container.

In cloud mode (Path A), Chromium runs inside the Modal container alongside the
orchestrator. This class handles process lifecycle: picking a free CDP port,
launching Chromium with the right flags, waiting for the CDP endpoint, and
killing processes on session end / container shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import socket
from pathlib import Path

import httpx

from mayra_orchestrator.errors import BrowserError

log = logging.getLogger(__name__)

_CDP_PROBE_TIMEOUT = 10.0  # seconds to wait for Chromium CDP to respond
_CDP_PROBE_INTERVAL = 0.2  # poll interval


def _pick_free_port() -> int:
    """Bind to port 0 on loopback, read the assigned port, release it."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _chromium_executable() -> str:
    """Find the Chromium binary in the container."""
    import os
    # Honor the env var that agent-browser also uses
    env_path = os.environ.get("AGENT_BROWSER_EXECUTABLE_PATH")
    if env_path and Path(env_path).is_file():
        return env_path
    # Common Debian/Ubuntu paths
    for candidate in ("/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"):
        if Path(candidate).is_file():
            return candidate
    raise BrowserError(
        "Chromium not found in container. Set AGENT_BROWSER_EXECUTABLE_PATH or install chromium."
    )


class CloudLauncher:
    """Manages headless Chromium processes in the container."""

    def __init__(self, flags: str = "--no-sandbox,--headless=new,--disable-gpu,--disable-dev-shm-usage") -> None:
        self._flags = [f.strip() for f in flags.split(",") if f.strip()]
        # Map of cdp_port → asyncio.subprocess.Process
        self._processes: dict[int, asyncio.subprocess.Process] = {}

    async def launch(self) -> int:
        """Launch a headless Chromium instance and return its CDP port.

        Picks a free loopback port, starts Chromium with --remote-debugging-port,
        waits for the CDP endpoint to respond, then returns the port.
        """
        port = _pick_free_port()
        exe = _chromium_executable()
        argv = [
            exe,
            f"--remote-debugging-port={port}",
            "--remote-debugging-address=127.0.0.1",
            *self._flags,
            "--no-first-run",
            "--no-default-browser-check",
            "about:blank",
        ]
        log.info("[cloud_launcher] launching Chromium on port %d: %s", port, exe)
        proc = await asyncio.create_subprocess_exec(
            *argv,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        self._processes[port] = proc

        # Wait for CDP endpoint to respond
        await self._wait_for_cdp(port)
        log.info("[cloud_launcher] Chromium ready on port %d (pid=%d)", port, proc.pid)
        return port

    async def _wait_for_cdp(self, port: int) -> None:
        """Poll the CDP HTTP endpoint until it responds."""
        url = f"http://127.0.0.1:{port}/json/version"
        deadline = asyncio.get_event_loop().time() + _CDP_PROBE_TIMEOUT
        last_err = ""
        while asyncio.get_event_loop().time() < deadline:
            # Check if process died
            proc = self._processes.get(port)
            if proc and proc.returncode is not None:
                raise BrowserError(f"Chromium exited with code {proc.returncode} before CDP was ready")
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    r = await client.get(url)
                    if r.status_code == 200:
                        return
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                last_err = str(e)
            await asyncio.sleep(_CDP_PROBE_INTERVAL)
        raise BrowserError(f"Chromium CDP endpoint did not respond on port {port} within {_CDP_PROBE_TIMEOUT}s: {last_err}")

    async def kill(self, port: int) -> None:
        """Kill the Chromium process for the given CDP port."""
        proc = self._processes.pop(port, None)
        if proc is None:
            return
        if proc.returncode is None:
            try:
                proc.kill()
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except (ProcessLookupError, asyncio.TimeoutError):
                pass
        log.info("[cloud_launcher] killed Chromium on port %d", port)

    async def kill_all(self) -> None:
        """Kill all managed Chromium processes."""
        ports = list(self._processes.keys())
        for port in ports:
            await self.kill(port)
        log.info("[cloud_launcher] killed all Chromium processes (%d)", len(ports))

    def managed_ports(self) -> list[int]:
        """Return the list of CDP ports with active Chromium processes."""
        return list(self._processes.keys())
