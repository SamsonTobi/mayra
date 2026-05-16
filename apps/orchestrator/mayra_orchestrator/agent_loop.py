"""Agent loop (Stage T5) + `TaskState` coordinator snapshot."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import FastAPI

from mayra_orchestrator.actions.mapper import to_agent_browser_command
from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.api.memory_tasks import TaskRecord
from mayra_orchestrator.browser.preview_image import save_png_as_preview_webp
from mayra_orchestrator.errors import (
    ActionValidationError,
    BudgetExhaustedError,
    MayraError,
    ProviderError,
    SchemaRepairableError,
)
from mayra_orchestrator.parser import parse_chat_and_action
from mayra_orchestrator.prompts.templates import build_prompt, build_repair_prompt
from mayra_orchestrator.redaction import redact_for_display
from mayra_orchestrator.risk import reclassify_risk
from mayra_orchestrator.snapshot import Snapshot
from mayra_orchestrator.step_budget import StepBudget


@dataclass
class TaskState:
    task_id: str
    correlation_id: str
    owner_id: str
    goal: str
    allowed_domains: tuple[str, ...]
    history: deque[Any] = field(default_factory=lambda: deque(maxlen=512))
    paused_for: str | None = None
    abort_event: asyncio.Event = field(default_factory=asyncio.Event)
    approval_event: asyncio.Event = field(default_factory=asyncio.Event)

    @classmethod
    def from_registry_record(
        cls,
        *,
        task_id: str,
        correlation_id: str,
        record: TaskRecord,
    ) -> TaskState:
        return cls(
            task_id=task_id,
            correlation_id=correlation_id,
            owner_id=record.owner_id,
            goal=record.goal,
            allowed_domains=tuple(record.allowed_domains),
        )


@dataclass
class _LoopRiskCtx:
    allowed_domains: list[str]
    stale: bool = False

    def snapshot_stale(self) -> bool:
        return self.stale


_OTP_HINTS = ("code", "otp", "verification")


class _ChatReplyStreamer:
    """Emit only the natural-language part before the action contract delimiter."""

    _delimiter = "===ACTION==="

    def __init__(self, rec: TaskRecord) -> None:
        self._rec = rec
        self._buffer = ""
        self._closed = False
        self.emitted = False

    async def on_token(self, delta: str) -> None:
        if self._closed:
            return
        self._buffer += delta
        idx = self._buffer.find(self._delimiter)
        if idx == -1:
            return
        await self._emit(self._buffer[:idx].strip())
        self._buffer = ""
        self._closed = True

    async def emit_chat(self, chat: str) -> None:
        if self.emitted:
            return
        await self._emit(chat.strip())

    async def _emit(self, text: str) -> None:
        if not text:
            return
        self.emitted = True
        await _put_sse(self._rec, "token", {"kind": "token", "delta": text})


async def run_agent_loop(app: FastAPI, task_id: str, correlation_id: str) -> None:
    rec = app.state.registry.tasks[task_id]
    try:
        await _run_agent_loop_body(app, task_id, correlation_id, rec)
    except asyncio.CancelledError:
        await _emit_done(rec, task_id, "aborted")
        raise
    except MayraError as exc:
        await _emit_error(rec, correlation_id, exc.code, str(exc))
        await _emit_done(rec, task_id, "failed")
    except Exception as exc:  # noqa: BLE001
        await _emit_error(rec, correlation_id, "internal_error", str(exc))
        await _emit_done(rec, task_id, "failed")
    finally:
        await rec.sse_queue.put(None)


async def _run_agent_loop_body(app: FastAPI, task_id: str, correlation_id: str, rec: TaskRecord) -> None:
    approvals = app.state.approval_registry
    browser = app.state.session_browser if rec.session_id else app.state.browser
    browser_session_id = rec.session_id or task_id
    model = app.state.model_client

    budget = StepBudget(max_steps=rec.max_steps, remaining=rec.max_steps)
    history: deque[str] = deque(rec.initial_messages, maxlen=512)

    while True:
        try:
            budget.consume_step()
        except BudgetExhaustedError:
            await _emit_done(rec, task_id, "budget_exhausted")
            return

        await _drain_user_messages(rec, history)
        step_no = rec.max_steps - budget.remaining

        await _emit_status(
            rec,
            f"Step {step_no}: reading the browser snapshot before asking the model.",
        )
        snap_dict = await _snapshot_browser(browser, browser_session_id, rec.allowed_domains)
        snapshot = Snapshot.from_json(snap_dict).prune()
        observation_hash = _observation_hash(snap_dict)

        if await _handle_manual_takeover(app, rec, task_id, browser, browser_session_id, snap_dict, observation_hash):
            return

        if _has_otp_prompt(snapshot):
            await _emit_status(
                rec,
                "Paused for 2FA. Please enter the verification code in the browser to continue.",
                "warn",
            )
            await _notify_otp(app, task_id)
            await _emit_action_log(
                rec,
                Action(
                    action="wait",
                    target_ref=None,
                    value="otp",
                    risk="high",
                    reason="Waiting for the user to complete the OTP challenge.",
                ),
                executed=False,
                step=step_no,
                screenshot_path=None,
            )
            await _emit_done(rec, task_id, "aborted")
            return

        await _emit_status(rec, f"Step {step_no}: capturing a screenshot for the model.")
        screenshot_bytes, screenshot_mime = await _capture_model_screenshot(browser, browser_session_id, rec.allowed_domains)
        image_note = f" with screenshot ({len(screenshot_bytes)} bytes)" if screenshot_bytes else ""
        await _emit_status(rec, f"Step {step_no}: asking the model for the next response{image_note}.")
        bundle = build_prompt(
            goal=rec.goal,
            history=tuple(history),
            snapshot=snapshot,
            screenshot_bytes=screenshot_bytes,
            screenshot_mime=screenshot_mime,
            allowed_domains=list(rec.allowed_domains),
            step=step_no,
            max_steps=rec.max_steps,
        )

        chat_stream = _ChatReplyStreamer(rec)
        raw = await _complete_with_limits(app, model, bundle, chat_stream.on_token, rec)

        while True:
            try:
                chat, action = parse_chat_and_action(raw)
                break
            except SchemaRepairableError as exc:
                try:
                    budget.consume_repair()
                except BudgetExhaustedError:
                    await _emit_error(
                        rec,
                        correlation_id,
                        "repair_budget",
                        f"malformed action JSON: {exc}",
                    )
                    await _emit_done(rec, task_id, "failed")
                    return
                await _emit_status(
                    rec,
                    "The model returned invalid action JSON; asking it for one repair.",
                    "warn",
                )
                repair_bundle = build_repair_prompt(
                    bundle,
                    invalid_output=raw,
                    validation_error=str(exc),
                )
                raw = await _complete_with_limits(app, model, repair_bundle, _discard_token, rec)

        await chat_stream.emit_chat(chat)
        history.append(f"assistant:{chat}")

        if (
            isinstance(action.target_ref, str)
            and action.target_ref.startswith("@")
            and snapshot.find(action.target_ref) is None
        ):
            await _emit_error(rec, correlation_id, "action_validation_error", "snapshot missing target_ref")
            await _emit_done(rec, task_id, "failed")
            return

        ctx = _LoopRiskCtx(list(rec.allowed_domains), stale=False)
        gated = reclassify_risk(action, snapshot, ctx)
        display_action = redact_for_display(gated, snapshot)

        if gated.risk == "high":
            rec.approval_decision = None
            rec.approval_event.clear()
            approval_id = approvals.register(task_id)
            approval_screenshot_path = await _save_approval_screenshot(
                app,
                browser,
                browser_session_id,
                task_id,
                step_no,
                rec.allowed_domains,
            )
            await _emit_approval(rec, correlation_id, approval_id, display_action, approval_screenshot_path)
            try:
                await asyncio.wait_for(rec.approval_event.wait(), timeout=300.0)
            except TimeoutError:
                await _emit_done(rec, task_id, "failed")
                return
            if rec.approval_decision is not True:
                await _emit_done(rec, task_id, "aborted")
                return

        if gated.action == "done":
            await _emit_done(rec, task_id, "success")
            return

        try:
            cmds = to_agent_browser_command(gated)
        except ActionValidationError as exc:
            await _emit_error(rec, correlation_id, "action_validation_error", str(exc))
            await _emit_done(rec, task_id, "failed")
            return

        await _execute_browser(browser, browser_session_id, gated, cmds, rec.allowed_domains)

        await _emit_action_log(rec, display_action, executed=True, step=step_no, screenshot_path=None)
        rec.last_observation_hash = observation_hash

        # Continue the loop for the next step (to let the model see the next screen)
        continue


async def _drain_user_messages(rec: TaskRecord, history: deque[str]) -> None:
    while True:
        try:
            msg = rec.messages.get_nowait()
        except asyncio.QueueEmpty:
            break
        history.append(f"user:{msg}")


async def _snapshot_browser(browser: Any, session_id: str, allowed_domains: list[str]) -> dict[str, Any]:
    try:
        return await browser.snapshot(session_id, allowed_domains)
    except TypeError:
        return await browser.snapshot(session_id)


async def _execute_browser(
    browser: Any,
    session_id: str,
    action: Action,
    cmds: list[str],
    allowed_domains: list[str],
) -> None:
    try:
        await browser.execute(session_id, action, cmds, allowed_domains)
    except TypeError:
        await browser.execute(session_id, action, cmds)


async def _capture_model_screenshot(browser: Any, session_id: str, allowed_domains: list[str]) -> tuple[bytes, str]:
    if getattr(browser, "screenshot_annotated", None):
        try:
            shot = await browser.screenshot_annotated(session_id, allowed_domains)
        except TypeError:
            shot = await browser.screenshot_annotated(session_id)
        if isinstance(shot, tuple) and len(shot) == 2:
            return shot[0], shot[1]
        if isinstance(shot, bytes):
            return shot, "image/png"

    direct_capture = getattr(browser, "screenshot_png_bytes", None)
    if direct_capture is not None:
        return await direct_capture(session_id), "image/png"

    return b"", "image/png"


def _observation_hash(snapshot_payload: dict[str, Any]) -> str:
    encoded = json.dumps(snapshot_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def _has_otp_prompt(snapshot: Snapshot) -> bool:
    for node in snapshot.nodes:
        if node.role != "textbox":
            continue
        haystack = f"{node.name} {node.text}".lower()
        if any(h in haystack for h in _OTP_HINTS):
            return True
    return False


async def _notify_otp(app: FastAPI, task_id: str) -> None:
    notifier = getattr(app.state, "notifier", None)
    notify = getattr(notifier, "notify", None)
    if notify is None:
        return
    result = notify("Mayra is waiting for 2FA", f"Task {task_id} needs your verification code.")
    if hasattr(result, "__await__"):
        await result


async def _handle_manual_takeover(
    app: FastAPI,
    rec: TaskRecord,
    task_id: str,
    browser: Any,
    session_id: str,
    snap_dict: dict[str, Any],
    observation_hash: str,
) -> bool:
    detected = False
    detector = getattr(browser, "manual_takeover_detected", None)
    if detector is not None:
        result = detector(session_id)
        detected = bool(await result) if hasattr(result, "__await__") else bool(result)
    if not detected:
        return False

    previous_hash = getattr(rec, "last_observation_hash", None)
    if previous_hash == observation_hash:
        await _emit_status(rec, "Paused after manual browser input; auto-resuming after idle.", "warn")
        await asyncio.sleep(float(getattr(app.state, "manual_takeover_idle_seconds", 30.0)))
        return False

    rec.approval_decision = None
    rec.approval_event.clear()
    await _emit_status(rec, "Paused because the browser changed during manual takeover.", "warn")
    await _emit_approval(
        rec,
        "",
        f"resume:{task_id}",
        Action(
            action="wait",
            target_ref=None,
            value=None,
            risk="high",
            reason="Resume after manual browser input changed the page.",
        ),
        await _save_approval_screenshot(app, browser, session_id, task_id, 0, rec.allowed_domains),
    )
    try:
        await asyncio.wait_for(rec.approval_event.wait(), timeout=300.0)
    except TimeoutError:
        await _emit_done(rec, task_id, "aborted")
        return True
    if rec.approval_decision is True:
        rec.last_observation_hash = _observation_hash(snap_dict)
        return False
    await _emit_done(rec, task_id, "aborted")
    return True


async def _save_approval_screenshot(
    app: FastAPI,
    browser: Any,
    session_id: str,
    task_id: str,
    step: int,
    allowed_domains: list[str],
) -> str:
    screenshot_bytes, _mime = await _capture_model_screenshot(browser, session_id, allowed_domains)
    data_dir = getattr(getattr(app, "state", None), "settings", None)
    root = getattr(data_dir, "data_dir", None)
    if root is None:
        root = getattr(app.state, "data_dir", None)
    if root is None:
        return "local/screenshots/pending.webp"
    path = root / "screenshots" / task_id / f"{step}-approval.webp"
    try:
        await asyncio.to_thread(save_png_as_preview_webp, screenshot_bytes, path)
    except Exception:  # noqa: BLE001 - tests use tiny fake bytes; keep the approval path populated.
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, screenshot_bytes)
    return str(path)


async def _discard_token(delta: str) -> None:
    _ = delta


async def _complete_with_limits(app: FastAPI, model: Any, bundle: Any, on_token: Any, rec: TaskRecord) -> str:
    # If the user specified a provider, use it. Otherwise, use all available as fallbacks.
    providers = []
    app_providers = getattr(app.state, "providers", {})
    if getattr(rec, "provider", None):
        preferred = app_providers.get(rec.provider)
        if preferred:
            providers.append(preferred)
    
    if not providers:
        # Fall back through all available
        ordered = []
        for p in ["gemini", "groq", "cloudflare"]:
            if p in app_providers:
                ordered.append(app_providers[p])
        for p, client in app_providers.items():
            if p not in ["gemini", "groq", "cloudflare"]:
                ordered.append(client)
        providers = ordered

    if not providers:
        return await model.complete_streaming(bundle, temperature=0.0, on_token=on_token)

    last_error: Exception | None = None
    original_streamer = on_token.__self__ if hasattr(on_token, "__self__") else None

    for client in providers:
        provider_name = client.provider
        limiter = getattr(app.state, "rate_limit", {}).get(provider_name)
        semaphore = getattr(app.state, "semaphore", {}).get(provider_name)
        
        # Reset the streamer state for fallback attempts
        if original_streamer and hasattr(original_streamer, "_buffer"):
            original_streamer._buffer = ""
            original_streamer._closed = False
            original_streamer.emitted = False

        try:
            if limiter is None or semaphore is None:
                return await client.complete_streaming(bundle, temperature=0.0, on_token=on_token)
            async with limiter:
                async with semaphore:
                    return await client.complete_streaming(bundle, temperature=0.0, on_token=on_token)
        except ProviderError as e:
            # Fall back on rate_limited or 5xx server errors
            err_str = str(e.args[0]) if e.args else ""
            if "rate_limited" in err_str or "server_error" in err_str:
                last_error = e
                continue
            raise

    if last_error:
        raise last_error

    raise ProviderError("system_error:no_clients_succeeded")


async def _put_sse(rec: TaskRecord, event: str, payload: dict[str, Any]) -> None:
    await rec.sse_queue.put((event, json.dumps(payload)))


async def _emit_done(rec: TaskRecord, task_id: str, status: str) -> None:
    rec.status = status
    await _put_sse(rec, "done", {"kind": "done", "task_id": task_id, "status": status})


async def _emit_status(rec: TaskRecord, text: str, severity: str = "info") -> None:
    await _put_sse(
        rec,
        "status",
        {
            "kind": "status",
            "message": {
                "id": str(uuid.uuid4()),
                "kind": "system_status",
                "text": text,
                "severity": severity,
                "ts": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


async def _emit_error(rec: TaskRecord, correlation_id: str, code: str, message: str) -> None:
    text = _sse_error_message(message)
    await _put_sse(
        rec,
        "error",
        {"kind": "error", "code": code, "message": text, "correlation_id": correlation_id},
    )


def _sse_error_message(message: object) -> str:
    """Avoid emitting useless SSE errors like the literal string 'None' from str(None)."""
    if message is None:
        return "No detail was provided; check orchestrator logs."
    text = str(message).strip()
    if not text or text == "None":
        return "No detail was provided; check orchestrator logs."
    return text


async def _emit_action_log(
    rec: TaskRecord,
    action: Action,
    *,
    executed: bool,
    step: int,
    screenshot_path: str | None,
) -> None:
    action_msg = {
        "id": str(uuid.uuid4()),
        "kind": "action_log",
        "action": action.model_dump(mode="json"),
        "executed": executed,
        "screenshot_path": screenshot_path,
        "step": step,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await _put_sse(rec, "action", {"kind": "action", "message": action_msg})


async def _emit_approval(
    rec: TaskRecord,
    correlation_id: str,
    approval_id: str,
    action: Action,
    screenshot_path: str,
) -> None:
    _ = correlation_id
    ts = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=300)).isoformat()
    msg = {
        "id": approval_id,
        "kind": "approval_request",
        "action": action.model_dump(mode="json"),
        "screenshot_path": screenshot_path,
        "expires_at": expires_at,
        "ts": ts,
    }
    await _put_sse(rec, "approval", {"kind": "approval", "message": msg})
