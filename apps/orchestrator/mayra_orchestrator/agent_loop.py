"""Agent loop (Stage T5) + `TaskState` coordinator snapshot."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import time
import uuid
from collections import deque

log = logging.getLogger("mayra.orchestrator.agent_loop")
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI

from mayra_orchestrator.actions.mapper import to_agent_browser_command
from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.api.memory_tasks import TaskRecord
from mayra_orchestrator.browser.preview_image import save_png_as_preview_webp
from mayra_orchestrator.errors import (
    ActionValidationError,
    BrowserError,
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


class SteeringInterrupt(Exception):
    """Raised when a new steering message arrives during a model call."""


_BROWSER_RECOVERY_MAX_ATTEMPTS = 2
_BROWSER_RECOVERY_BACKOFF_S = 0.08
_BROWSER_PROBE_CACHE_S = 1.5


async def _recover_browser_session(
    browser: Any,
    session_id: str,
    port: int | None,
) -> int | None:
    """Best-effort in-place CDP recovery. Returns the live port on success, ``None`` on failure.

    Never relaunches Chrome — only re-probes and re-attaches. If the port is
    genuinely dead the caller preserves the old fail-the-task behaviour.
    """
    if port is None:
        return None
    # Prefer the adapter's own probe (checks the CDP endpoint for the
    # session) over the bare module-level helper.  The adapter method also
    # knows about persistent CDP sessions, so calling it gives the recovery
    # path a chance to detect zombie sessions and force a reconnect.
    probe = getattr(browser, "_probe_cdp_session", None)
    if probe is not None:
        for attempt in range(_BROWSER_RECOVERY_MAX_ATTEMPTS):
            try:
                ok = await probe(session_id)
            except BrowserError:
                ok = False
            if not ok:
                await asyncio.sleep(_BROWSER_RECOVERY_BACKOFF_S * (attempt + 1))
                continue
            forget = getattr(browser, "forget_session", None)
            if callable(forget):
                forget(session_id)
            try:
                await browser.open(port, session_id)
            except BrowserError:
                await asyncio.sleep(_BROWSER_RECOVERY_BACKOFF_S * (attempt + 1))
                continue
            verify = getattr(browser, "verify_session_lightweight", None)
            if verify is not None:
                try:
                    await verify(session_id)
                except BrowserError:
                    continue
            return port
        return None
    # Fallback: use the bare module-level probe (works with FakeSessionBrowser
    # and other adapters that expose _probe_cdp_endpoint as a method).
    probe_raw = getattr(browser, "_probe_cdp_endpoint", None)
    if probe_raw is None:
        return None
    for attempt in range(_BROWSER_RECOVERY_MAX_ATTEMPTS):
        try:
            await probe_raw(port)
        except BrowserError:
            await asyncio.sleep(_BROWSER_RECOVERY_BACKOFF_S * (attempt + 1))
            continue
        forget = getattr(browser, "forget_session", None)
        if callable(forget):
            forget(session_id)
        try:
            await browser.open(port, session_id)
        except BrowserError:
            await asyncio.sleep(_BROWSER_RECOVERY_BACKOFF_S * (attempt + 1))
            continue
        verify = getattr(browser, "verify_session_lightweight", None)
        if verify is not None:
            try:
                await verify(session_id)
            except BrowserError:
                continue
        return port
    return None


class _ChatReplyStreamer:
    """Emit only the natural-language part before the action contract delimiter."""

    _delimiter = "===ACTION==="

    def __init__(self, rec: TaskRecord) -> None:
        self._rec = rec
        self._buffer = ""
        self._emitted_length = 0
        self._closed = False
        self.emitted = False

    async def on_token(self, delta: str, thought: bool = False) -> None:
        if self._closed:
            return
        if thought:
            await self._emit(delta, thought=True)
            return
        self._buffer += delta
        idx = self._buffer.find(self._delimiter)
        if idx != -1:
            safe_part = self._buffer[:idx]
            to_emit = safe_part[self._emitted_length :]
            if to_emit:
                await self._emit(to_emit, thought=False)
                self._emitted_length = len(safe_part)
            self._closed = True
            return
        buffer_len = len(self._buffer)
        hold_back = 20
        if buffer_len > hold_back:
            safe_length = buffer_len - hold_back
            to_emit = self._buffer[self._emitted_length : safe_length]
            if to_emit:
                await self._emit(to_emit, thought=False)
                self._emitted_length = safe_length

    async def emit_chat(self, chat: str) -> None:
        if self._closed:
            return
        idx = self._buffer.find(self._delimiter)
        if idx != -1:
            chat_part = self._buffer[:idx]
        else:
            chat_part = chat
        to_emit = chat_part[self._emitted_length :]
        if to_emit:
            await self._emit(to_emit, thought=False)
            self._emitted_length = len(chat_part)
        self._closed = True

    async def _emit(self, text: str, thought: bool = False) -> None:
        if not text:
            return
        self.emitted = True
        payload: dict[str, Any] = {"kind": "token", "delta": text}
        if thought:
            payload["thought"] = True
        await _put_sse(self._rec, "token", payload)


async def run_agent_loop(app: FastAPI, task_id: str, correlation_id: str) -> None:
    rec = app.state.registry.tasks[task_id]
    log.info(
        "[agent_loop] starting task %s (status=%s, steps_remaining=%s, queued_messages=%d)",
        task_id[:8],
        rec.status,
        rec.steps_remaining,
        rec.messages.qsize(),
    )
    try:
        await _run_agent_loop_body(app, task_id, correlation_id, rec)
    except asyncio.CancelledError:
        await _emit_done(rec, task_id, "aborted")
        _overlay_terminal(rec, "idle", "Aborted")
        raise
    except MayraError as exc:
        log.exception("[agent_loop] task %s failed with MayraError code=%s", task_id[:8], exc.code)
        await _emit_error(rec, correlation_id, exc.code, str(exc))
        await _emit_done(rec, task_id, "failed")
        _overlay_terminal(rec, "error", "Error")
    except Exception as exc:  # noqa: BLE001
        log.exception("[agent_loop] task %s failed with unexpected error", task_id[:8])
        await _emit_error(rec, correlation_id, "internal_error", str(exc))
        await _emit_done(rec, task_id, "failed")
        _overlay_terminal(rec, "error", "Error")
    finally:
        log.info("[agent_loop] task %s ending; status=%s", task_id[:8], rec.status)
        app.state.registry.persist()
        await rec.sse_queue.put(None)


async def _run_agent_loop_body(
    app: FastAPI, task_id: str, correlation_id: str, rec: TaskRecord
) -> None:
    approvals = app.state.approval_registry
    browser = app.state.session_browser if rec.session_id else app.state.browser
    browser_session_id = rec.session_id or task_id
    # Stash for _overlay_terminal so the top-level run_agent_loop exception
    # handler can update the pill without needing browser/session_id in scope.
    rec._overlay_browser = browser  # type: ignore[attr-defined]
    rec._overlay_session_id = browser_session_id  # type: ignore[attr-defined]
    model = app.state.model_client

    log.info("[agent_loop] _run_agent_loop_body START task=%s session=%s", task_id[:8], browser_session_id[:8] if browser_session_id else "none")

    step_cap = rec.steps_remaining if rec.steps_remaining is not None else rec.max_steps
    budget = StepBudget(max_steps=step_cap, remaining=step_cap)
    history: deque[str] = deque([*rec.initial_messages, *rec.agent_history], maxlen=512)
    log.info("[agent_loop] warming up providers and browser in parallel...")
    # Run browser warmup concurrently with provider warmup so the CDP
    # WebSocket handshake + Chrome's first-screenshot compositor priming
    # overlap with the provider health check (~200-500 ms) the user is
    # already paying for.  Without this, the very first screenshot in a
    # task pays the full cold-start cost on top of the provider warmup.
    await asyncio.gather(
        _warmup_providers(app, rec),
        _warmup_browser(app, browser, browser_session_id),
    )
    log.info("[agent_loop] warmup complete, entering main loop")
    await _update_browser_overlay(browser, browser_session_id, "idle", "Ready", "")
    stuck_repeats = 0

    while True:
        try:
            budget.consume_step()
        except BudgetExhaustedError:
            rec.agent_history = list(history)
            rec.steps_remaining = 0
            await _emit_status(
                rec,
                f"Step budget exhausted ({step_cap} steps). Send a message to continue this task.",
                "warn",
            )
            await _emit_done(rec, task_id, "budget_exhausted")
            _overlay_terminal(rec, "idle", "Budget reached")
            return

        await _drain_user_messages(rec, history)
        step_no = step_cap - budget.remaining

        # Detect conversational / non-action messages (e.g. "hold on", "wait a sec",
        # "hi", "thanks", or messages with no action intent when on about:blank).
        # Skip the expensive browser gather — the model replies with text only.
        _latest_user = _latest_user_message(history)
        if _latest_user and (
            _is_conversational_message(_latest_user)
            or not _has_action_intent(_latest_user)
        ):
            log.info("[agent_loop] step=%d conversational msg, skipping browser gather", step_no)
            bundle = build_prompt(
                goal=rec.goal,
                history=tuple(history),
                snapshot=Snapshot(),
                screenshot_bytes=b"",
                screenshot_mime="image/png",
                allowed_domains=rec.allowed_domains,
                step=step_no,
                max_steps=step_cap,
                active_tabs=None,
                model_override=getattr(rec, "_model_override", None),
                current_url="about:blank",
            )
            await _update_browser_overlay(browser, browser_session_id, "thinking", "Thinking", f"Step {step_no}")
            chat_stream = _ChatReplyStreamer(rec)
            try:
                raw, used_provider, used_model = await _complete_with_limits(
                    app, model, bundle, chat_stream.on_token, rec, history
                )
            except SteeringInterrupt:
                budget.refund_step()
                continue
            try:
                chat, action = parse_chat_and_action(raw)
            except SchemaRepairableError:
                await chat_stream.emit_chat(raw)
                history.append(f"assistant:{raw}")
                rec.agent_history = list(history)
                app.state.registry.persist()
                continue
            await chat_stream.emit_chat(chat)
            history.append(f"assistant:{chat}")
            rec.agent_history = list(history)
            app.state.registry.persist()
            # Conversational messages are done — emit done so the loop stops.
            # The user can send their actual task as a follow-up message.
            await _emit_done(rec, task_id, "success")
            return

        await _emit_status(
            rec,
            f"Reading the page…",
        )
        await _update_browser_overlay(browser, browser_session_id, "observing", "Reading page", f"Step {step_no}")
        # Move port lookup here so _get_active_tabs can run concurrently with
        # the snapshot and screenshot subprocesses instead of sequentially after.
        # Use getattr so browser adapters that don't expose _session_ports
        # (e.g. stub browsers, fakes) don't raise AttributeError.
        port = getattr(browser, "_session_ports", {}).get(browser_session_id)
        log.info(
            "[agent_loop] step=%d starting browser gather (snapshot+screenshot+tabs) port=%s",
            step_no, port,
        )
        _t_browser = time.perf_counter()
        # Top-level gather timeout prevents indefinite hangs when a subprocess
        # or CDP call fails to respect its internal timeout (known Windows issue).
        _GATHER_TIMEOUT = 90.0
        try:
            snap_dict, (screenshot_bytes, screenshot_mime), active_tabs = await asyncio.wait_for(
                asyncio.gather(
                    _snapshot_browser(browser, browser_session_id, rec.allowed_domains),
                    _capture_model_screenshot(browser, browser_session_id, rec.allowed_domains),
                    _get_active_tabs(port),
                ),
                timeout=_GATHER_TIMEOUT,
            )
            log.info("[agent_loop] step=%d browser gather COMPLETED successfully", step_no)
        except TimeoutError:
            log.error(
                "[agent_loop] step=%d browser gather timed out after %.0fs",
                step_no,
                _GATHER_TIMEOUT,
            )
            raise BrowserError(
                f"Browser snapshot/screenshot timed out after {_GATHER_TIMEOUT:.0f}s"
            ) from None
        except BrowserError as exc:
            log.warning(
                "[agent_loop] step=%d browser gather failed: %s — attempting recovery", step_no, exc
            )
            await _emit_status(rec, f"Browser connection dropped ({exc}). Reconnecting…", "warn")
            recovered_port = await _recover_browser_session(browser, browser_session_id, port)
            if recovered_port is None:
                raise
            port = recovered_port
            budget.refund_step()
            continue
        log.info(
            "[agent_loop] step=%d browser_gather=%dms (snap+shot+tabs concurrent)",
            step_no,
            int((time.perf_counter() - _t_browser) * 1000),
        )
        effective_domains = _effective_allowed_domains(rec.allowed_domains, snap_dict, active_tabs)
        snapshot = Snapshot.from_json(snap_dict).prune()
        observation_hash = _observation_hash(snap_dict)

        if rec.last_observation_hash is not None and observation_hash == rec.last_observation_hash:
            stuck_repeats += 1
        else:
            stuck_repeats = 0
        # Also track repeated identical actions (same action + target, regardless of page hash)
        _last_action_key = getattr(rec, "_last_action_key", "")
        _current_action_key = ""  # filled in after parse; checked after action extraction below
        if stuck_repeats >= 2:
            # Don't reset stuck_repeats — keep nudging every step so the model
            # doesn't drift back into the same loop after one warning.
            history.append(
                "system:The page did not change since the last step. "
                "Try a different element, scroll, or wait for content to load. "
                "Do NOT repeat the same reasoning or action."
            )
            await _emit_status(
                rec,
                "Page unchanged since the last step; try a different approach.",
                "warn",
            )

        # Hard stop: if the page hasn't changed for too many steps, the model
        # is stuck in a reasoning loop. Pause and ask the user for direction.
        _STUCK_HARD_LIMIT = 6
        if stuck_repeats >= _STUCK_HARD_LIMIT:
            log.warning("[agent_loop] step=%d stuck for %d steps — pausing", step_no, stuck_repeats)
            await _emit_status(
                rec,
                "The agent is stuck — the page hasn't changed after several attempts. "
                "Send a follow-up message to steer it, or abort the task.",
                "warn",
            )
            await _emit_done(rec, task_id, "budget_exhausted")
            _overlay_terminal(rec, "idle", "Stuck")
            return

        if await _handle_manual_takeover(
            app, rec, task_id, browser, browser_session_id, snap_dict, observation_hash
        ):
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
                app=app,
            )
            await _emit_done(rec, task_id, "aborted")
            _overlay_terminal(rec, "awaiting_approval", "2FA required")
            return
        observation_path = await _save_step_observation_screenshot(
            app, task_id, step_no, screenshot_bytes
        )
        # Deep-debug: save the snapshot JSON next to the screenshot so we can
        # see exactly which @eXX ref mapped to which element at the moment of
        # the click. Critical for telling apart "model clicked the wrong
        # element" from "model clicked the right element but the click was
        # intercepted / handler threw / element was in an iframe".
        await _save_step_snapshot_json(app, task_id, step_no, snap_dict)
        # Extract current page URL for the prompt
        _snap_data = snap_dict.get("data", snap_dict) if isinstance(snap_dict.get("data"), dict) else snap_dict
        _current_url = _snap_data.get("url") or _snap_data.get("pageUrl") or _snap_data.get("page_url")
        image_note = f" with screenshot ({len(screenshot_bytes)} bytes)" if screenshot_bytes else ""
        await _emit_status(
            rec, f"Thinking…{image_note}",
        )
        await _update_browser_overlay(browser, browser_session_id, "thinking", "Thinking", f"Step {step_no}")
        bundle = build_prompt(
            goal=rec.goal,
            history=tuple(history),
            snapshot=snapshot,
            screenshot_bytes=screenshot_bytes,
            screenshot_mime=screenshot_mime,
            allowed_domains=effective_domains,
            step=step_no,
            max_steps=step_cap,
            active_tabs=active_tabs,
            model_override=getattr(rec, "_model_override", None),
            current_url=_current_url if isinstance(_current_url, str) else None,
        )

        chat_stream = _ChatReplyStreamer(rec)
        _t_model = time.perf_counter()
        try:
            raw, used_provider, used_model = await _complete_with_limits(
                app, model, bundle, chat_stream.on_token, rec, history
            )
        except SteeringInterrupt:
            budget.refund_step()
            continue
        log.info(
            "[agent_loop] step=%d model_call=%dms provider=%s model=%s",
            step_no,
            int((time.perf_counter() - _t_model) * 1000),
            used_provider,
            used_model,
        )

        try:
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
                        _overlay_terminal(rec, "error", "Repair failed")
                        return
                    await _emit_status(
                        rec,
                        "The model returned invalid action JSON; asking it for one repair.",
                        "warn",
                    )
                    await _update_browser_overlay(browser, browser_session_id, "thinking", "Repairing", f"Step {step_no}")
                    repair_bundle = build_repair_prompt(
                        bundle,
                        invalid_output=raw,
                        validation_error=str(exc),
                    )
                    try:
                        raw, used_provider, used_model = await _complete_with_limits(
                            app, model, repair_bundle, _discard_token, rec, history
                        )
                    except SteeringInterrupt:
                        budget.refund_step()
                        raise
        except SteeringInterrupt:
            budget.refund_step()
            continue

        await chat_stream.emit_chat(chat)
        history.append(f"assistant:{chat}")
        await _emit_step_meta(
            rec,
            provider=used_provider,
            model=used_model,
            observation_screenshot_path=observation_path,
            app=app,
        )

        # Detect repeated chat text — the model is stuck in a reasoning loop
        # if it says the same thing across multiple steps without making progress.
        _chat_sig = (chat or "").strip().lower()[:200]
        _prev_chat_sig = getattr(rec, "_last_chat_sig", "")
        if _chat_sig and _chat_sig == _prev_chat_sig:
            _chat_repeats = getattr(rec, "_chat_repeats", 0) + 1
        else:
            _chat_repeats = 0
        rec._last_chat_sig = _chat_sig  # type: ignore[attr-defined]
        rec._chat_repeats = _chat_repeats  # type: ignore[attr-defined]
        if _chat_repeats >= 2:
            rec._chat_repeats = 0  # type: ignore[attr-defined]
            if _chat_repeats >= 3:
                # 3+ repeats — the model is truly stuck. Force done.
                await _emit_status(
                    rec,
                    "The agent seems stuck. Stopping to avoid wasting steps.",
                    "warn",
                )
                await _emit_done(rec, task_id, "degraded")
                return
            history.append(
                "system:You have repeated the same reasoning multiple times without acting. "
                "Take a DIFFERENT action now — click a different element, scroll, navigate, "
                "or report done if the goal is achieved."
            )
            await _emit_status(
                rec,
                "The agent is repeating itself — nudging it to try a different approach.",
                "warn",
            )

        # Detect repeated identical actions (same action + target) even if page hash changes
        _current_action_key = f"{action.action}:{action.target_ref}"
        _prev_key = getattr(rec, "_last_action_key", "")
        if _current_action_key == _prev_key and action.action in ("click", "type"):
            _action_repeats = getattr(rec, "_action_repeats", 0) + 1
        else:
            _action_repeats = 0
        rec._last_action_key = _current_action_key  # type: ignore[attr-defined]
        rec._action_repeats = _action_repeats  # type: ignore[attr-defined]
        # Hard stop: if the model repeats the exact same click/type action too
        # many times in a row, it's stuck in a loop. This is independent of the
        # observation-hash stuck counter — pages with dynamic ad content (Meta
        # Pixel, GPT PubAds) change the hash on every snapshot even when the
        # agent is effectively stuck clicking the same dead link.
        _ACTION_REPEAT_HARD_LIMIT = 4
        if _action_repeats >= _ACTION_REPEAT_HARD_LIMIT:
            log.warning(
                "[agent_loop] step=%d action_repeats=%d for %s ref=%s — hard stop",
                step_no, _action_repeats, action.action, action.target_ref,
            )
            await _emit_status(
                rec,
                f"The agent repeated the same action ({action.action} ref={action.target_ref}) "
                f"{_action_repeats} times with no effect. Pausing — send a follow-up "
                f"message to steer it, or abort the task.",
                "warn",
            )
            await _emit_done(rec, task_id, "budget_exhausted")
            _overlay_terminal(rec, "idle", "Stuck")
            return
        if _action_repeats >= 2:
            # Nudge the model to try a different action. Do NOT reset
            # _action_repeats here — the counter must accumulate to trigger
            # the hard stop above. Resetting it (the old behavior) defeated
            # the hard stop and let the agent loop forever on sites like
            # Jumia where click no-ops are common (overlay/iframe/synthetic
            # event dead-ends).
            history.append(
                "system:You have just attempted the same action ("
                f"{action.action} ref={action.target_ref}) twice in a row with no effect. "
                "Repeating it again will not help. Take a DIFFERENT action now: "
                "click a different element, scroll, navigate directly to a URL, "
                "or use a semantic locator like text:<label>."
            )
            await _emit_status(
                rec,
                "Repeated action not working. Try a different approach or scroll first.",
                "warn",
            )
            # NOTE: do NOT reset stuck_repeats here. The page-stuck counter and
            # the action-repeat counter track different failure modes; resetting
            # stuck_repeats here used to defeat the hard-stop at _STUCK_HARD_LIMIT.

        if (
            isinstance(action.target_ref, str)
            and action.target_ref.startswith("@")
            and snapshot.find(action.target_ref) is None
        ):
            await _emit_error(
                rec, correlation_id, "action_validation_error", "snapshot missing target_ref"
            )
            await _emit_done(rec, task_id, "failed")
            _overlay_terminal(rec, "error", "Validation error")
            return

        ctx = _LoopRiskCtx(effective_domains, stale=False)
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
            await _emit_approval(
                rec, correlation_id, approval_id, display_action, approval_screenshot_path, app=app
            )
            await _update_browser_overlay(
                browser, browser_session_id, "awaiting_approval",
                "Approval needed", str(gated.action).capitalize(),
            )
            try:
                await asyncio.wait_for(rec.approval_event.wait(), timeout=300.0)
            except TimeoutError:
                await _emit_done(rec, task_id, "failed")
                _overlay_terminal(rec, "error", "Approval timed out")
                return
            if rec.approval_decision is not True:
                await _emit_done(rec, task_id, "aborted")
                _overlay_terminal(rec, "idle", "Aborted")
                return

        if gated.action == "done":
            await _emit_done(rec, task_id, "success")
            _overlay_terminal(rec, "done", "Done")
            return

        # Detect when the model is stuck in a wait loop (e.g. "awaiting user instruction"
        # repeated across multiple steps). After 4 consecutive idle waits without any
        # meaningful action being taken, pause and tell the user the agent is waiting.
        _IDLE_WAIT_REASONS = (
            "awaiting", "instruction", "guidance", "pause", "standstill",
            "user input", "user direction", "further direction", "further input",
            "waiting for user", "waiting for input", "waiting for direction",
        )
        if gated.action == "wait" and gated.reason:
            reason_lower = gated.reason.lower()
            if any(token in reason_lower for token in _IDLE_WAIT_REASONS):
                _consecutive_idle_waits = getattr(rec, "_consecutive_idle_waits", 0) + 1
                rec._consecutive_idle_waits = _consecutive_idle_waits  # type: ignore[attr-defined]
            else:
                rec._consecutive_idle_waits = 0  # type: ignore[attr-defined]
        else:
            rec._consecutive_idle_waits = 0  # type: ignore[attr-defined]

        if getattr(rec, "_consecutive_idle_waits", 0) >= 4:
            rec._consecutive_idle_waits = 0  # type: ignore[attr-defined]
            await _emit_status(
                rec,
                "The agent appears to be waiting for further direction. "
                "Send a follow-up message to continue, or abort the task.",
                "warn",
            )
            await _emit_done(rec, task_id, "budget_exhausted")
            _overlay_terminal(rec, "idle", "Waiting for input")
            return

        # If the user sent a steering message while the model was deciding,
        # skip the pending browser action and restart the step with the new
        # instruction in history.
        if await _drain_steering_messages(rec, history):
            budget.refund_step()
            await _update_browser_overlay(browser, browser_session_id, "thinking", "Replanning", "Steering message")
            await _emit_status(
                rec,
                "Steering message received. Replanning the next step...",
                "info",
            )
            continue

        try:
            cmds = to_agent_browser_command(gated)
        except ActionValidationError as exc:
            await _emit_error(rec, correlation_id, "action_validation_error", str(exc))
            await _emit_done(rec, task_id, "failed")
            _overlay_terminal(rec, "error", "Validation error")
            return

        await _update_browser_overlay(
            browser, browser_session_id, "acting",
            _action_label(gated.action), _action_detail(display_action, step_no),
        )

        # Diagnostic: capture open tabs BEFORE the action so we can compare
        # against the tab set AFTER the action. A click that opens a new tab
        # (target="_blank") is the prime suspect when the snapshot keeps showing
        # the same page — the new tab opens in the background and the snapshot
        # may still be reading the original tab.
        _pre_tabs = await _get_active_tabs(port) if port else []
        _pre_tab_urls = {t.get("url", "") for t in _pre_tabs}
        log.info(
            "[agent_loop] step=%d pre-action tabs (%d): %s",
            step_no, len(_pre_tabs),
            " | ".join(f"{t.get('title', '')!r}@{t.get('url', '')}" for t in _pre_tabs) or "(none)",
        )
        # Also capture a DOM state signature (focus, input values, DOM size,
        # scroll position) so we can tell apart a real no-op click from a
        # click that focuses an input / toggles a menu / reveals an error
        # message without changing the URL. Without this the detector fires
        # false positives on login forms (clicking the password field is not
        # a no-op even though the URL doesn't change).
        _dom_sig = getattr(browser, "dom_state_signature", None)
        _pre_dom_sig = await _dom_sig(browser_session_id) if _dom_sig else ""

        try:
            await _execute_browser(browser, browser_session_id, gated, cmds, effective_domains)
        except BrowserError as exc:
            err_str = str(exc).lower()
            # Soft errors: element not found / stale ref / not clickable.
            # These are NOT connection issues — the browser is fine, the model
            # just picked a bad target. Log it, tell the model, and continue
            # to the next step so it can try something different.
            _SOFT_ERROR_TOKENS = (
                "could not locate element",
                "element not found",
                "stale element",
                "element is not clickable",
                "not interactable",
                "element click intercepted",
                "no such element",
                "invalid selector",
                "element reference not found",
                "node is detached",
            )
            if any(tok in err_str for tok in _SOFT_ERROR_TOKENS):
                log.info(
                    "[agent_loop] step=%d soft action error: %s — continuing to next step",
                    step_no, exc,
                )
                await _emit_status(
                    rec,
                    f"Action failed in step {step_no}: {exc}. The model should try a different approach.",
                    "warn",
                )
                history.append(
                    f"action:step={step_no} executed={gated.action} ref={gated.target_ref} "
                    f"value={display_action.value!r} reason={gated.reason!r} "
                    f"FAILED: {exc}"
                )
                await _emit_action_log(
                    rec, display_action, executed=False, step=step_no, screenshot_path=observation_path, app=app
                )
                rec.agent_history = list(history)
                app.state.registry.persist()
                continue
            # Real connection drop — attempt recovery and retry once.
            log.warning(
                "[agent_loop] step=%d execute failed: %s — attempting recovery", step_no, exc
            )
            await _emit_status(
                rec, f"Browser connection dropped during action ({exc}). Reconnecting…", "warn"
            )
            recovered_port = await _recover_browser_session(browser, browser_session_id, port)
            if recovered_port is None:
                raise
            port = recovered_port
            try:
                await _execute_browser(browser, browser_session_id, gated, cmds, effective_domains)
            except BrowserError:
                raise

        # Diagnostic: capture tabs AFTER the action and compare to pre-action.
        # If a click dispatched but the tab set is byte-identical AND the DOM
        # state signature is also identical, the click was a real no-op (the
        # page is truly unchanged). If only the URL is unchanged but the DOM
        # signature differs, the click did something useful (focused an input,
        # revealed an error, toggled a menu) and we should NOT fire the no-op
        # warning — that would be a false positive that confuses the model.
        _post_tabs = await _get_active_tabs(port) if port else []
        _post_tab_urls = {t.get("url", "") for t in _post_tabs}
        log.info(
            "[agent_loop] step=%d post-action tabs (%d): %s",
            step_no, len(_post_tabs),
            " | ".join(f"{t.get('title', '')!r}@{t.get('url', '')}" for t in _post_tabs) or "(none)",
        )
        _post_dom_sig = await _dom_sig(browser_session_id) if _dom_sig else ""
        _clicked_node = snapshot.find(gated.target_ref) if gated.target_ref else None
        # Clicks on input fields / textboxes are expected to focus, not
        # navigate. Even if both URL and DOM signature are unchanged, the
        # focus may have moved without being captured by our signature (e.g.,
        # the input had no name/id). Skip the no-op warning for these — false
        # positives here are catastrophic because the model is mid-form-fill.
        _is_input_click = bool(
            _clicked_node and (
                _clicked_node.role in ("textbox", "combobox", "checkbox", "radio", "switch")
                or _clicked_node.tag in ("input", "textarea", "select")
            )
        )
        _url_unchanged = _pre_tabs and _pre_tab_urls == _post_tab_urls
        _dom_unchanged = _pre_dom_sig != "" and _pre_dom_sig == _post_dom_sig
        if (
            gated.action == "click"
            and _url_unchanged
            and _dom_unchanged
            and not _is_input_click
        ):
            _new_tabs = len(_post_tabs) - len(_pre_tabs)
            _node_desc = (
                f"role={_clicked_node.role} name={_clicked_node.name!r} tag={_clicked_node.tag!r}"
                if _clicked_node else "(ref not in snapshot)"
            )
            log.warning(
                "[agent_loop] step=%d click ref=%s dispatched (%s) but tab URL AND DOM state "
                "both unchanged (pre=%d post=%d new_tabs=%d) — real no-op: overlay, iframe, "
                "synthetic-event dead-end, or wrong element",
                step_no, gated.target_ref, _node_desc,
                len(_pre_tabs), len(_post_tabs), _new_tabs,
            )
            # Inject causal feedback into history so the model stops interpreting
            # "page didn't change" as "wait for it to load". Without this the
            # model says "I'll wait a moment to ensure the navigation completes"
            # and repeats the same click — exactly the loop we keep seeing.
            #
            # Recovery options are ordered by likelihood of helping:
            #   (a) different element with similar name — handles wrong-target clicks
            #   (b) semantic locator text:<label> — handles stale @eXX refs
            #   (c) scroll then re-click — handles overlay-intercepted clicks
            #   (d) reload via navigate to current URL — handles wedged JS state
            #       (broken click handlers, React hydration errors, zombie overlays)
            #   (e) navigate directly to the destination URL — handles "I can guess
            #       where the link was supposed to take me"
            # Note: reload loses form input, so the model should only pick (d) if
            # the current page is not mid-form-fill.
            _pre_url = next(iter(_pre_tab_urls), "")
            history.append(
                f"system:Your last action (click ref={gated.target_ref}, {_node_desc}) "
                f"was dispatched successfully but the page is byte-identical to before "
                f"(tab URL AND DOM state unchanged). The click was a NO-OP — it did not "
                f"navigate, focus an input, open a menu, or change anything. Do NOT repeat "
                f"the same click and do NOT wait. Try one of: "
                f"(a) click a different element with a similar name, "
                f"(b) use a semantic locator like text:<label> or role:button[name=Login Now], "
                f"(c) scroll to reveal the real link then re-click, "
                f"(d) reload the page by issuing a navigate action with value={_pre_url!r} "
                f"(this resets broken JavaScript state but loses any form input you've typed), or "
                f"(e) navigate directly to the destination URL if you can infer it."
            )
            _clicked_name = _clicked_node.name if _clicked_node else "unknown"
            await _emit_status(
                rec,
                f"Click on {gated.target_ref} ({_clicked_name!r}) "
                f"was a no-op — page didn't change. Telling the model to try a different approach.",
                "warn",
            )
        elif (
            gated.action == "click"
            and _url_unchanged
            and not _dom_unchanged
            and _clicked_node
            and _clicked_node.role in ("button", "link", "menuitem")
        ):
            # URL didn't change but DOM state did — the click did something
            # local (focus moved, error appeared, menu opened). Log it as
            # info so we can see what kind of state change happened without
            # firing the false-positive no-op warning at the model.
            log.info(
                "[agent_loop] step=%d click ref=%s (role=%s name=%r) — URL unchanged but "
                "DOM state changed (focus/input/visibility); not a no-op",
                step_no, gated.target_ref, _clicked_node.role, _clicked_node.name,
            )

        history.append(
            f"action:step={step_no} executed={gated.action} ref={gated.target_ref} "
            f"value={display_action.value!r} reason={gated.reason!r}"
        )
        await _emit_action_log(
            rec, display_action, executed=True, step=step_no, screenshot_path=observation_path, app=app
        )

        rec.last_observation_hash = observation_hash
        rec.agent_history = list(history)
        app.state.registry.persist()

        if budget.remaining <= 0 and not rec.exhaust_budget_probe:
            await _emit_done(rec, task_id, "success")
            return

        # Continue the loop for the next step (to let the model see the next screen)
        continue


async def _drain_user_messages(rec: TaskRecord, history: deque[str]) -> None:
    while True:
        try:
            msg = rec.messages.get_nowait()
        except asyncio.QueueEmpty:
            break
        history.append(f"user:{msg}")


async def _drain_steering_messages(rec: TaskRecord, history: deque[str]) -> bool:
    """Drain any steering messages queued since the last check.

    Returns ``True`` if at least one message was incorporated into the history.
    Clears the event so the loop can race against the next message.
    """
    if not rec.steering_message_event.is_set():
        return False
    rec.steering_message_event.clear()
    drained = False
    while True:
        try:
            msg = rec.messages.get_nowait()
        except asyncio.QueueEmpty:
            break
        history.append(f"user:{msg}")
        drained = True
    return drained


async def _snapshot_browser(
    browser: Any, session_id: str, allowed_domains: list[str]
) -> dict[str, Any]:
    log.info("[agent_loop] _snapshot_browser: entering, calling browser.snapshot")
    try:
        result = await browser.snapshot(session_id, allowed_domains)
        log.info("[agent_loop] _snapshot_browser: completed OK")
        return result
    except TypeError:
        log.info("[agent_loop] _snapshot_browser: TypeError fallback")
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
    except BrowserError:
        raise
    except Exception:
        log.exception("[agent_loop] _execute_browser: unexpected error")
        raise


async def _capture_model_screenshot(
    browser: Any, session_id: str, allowed_domains: list[str]
) -> tuple[bytes, str]:
    # Prefer the direct-CDP fast path (~50-150ms) over the annotated
    # subprocess path (~200-800ms). The model only needs pixels; the @e1/@e2
    # refs it reasons about come from the snapshot, not from image annotations.
    # Annotated screenshots are reserved for the approval-gate UI display.
    #
    # JPEG is preferred over PNG for the model payload: JPEG q80 encodes
    # ~5-10x faster and produces ~10x smaller base64 blobs, which cuts both
    # the CDP WebSocket transfer time and the model API upload time.  The
    # model reads text and identifies UI elements — it doesn't need PNG's
    # lossless quality.
    jpeg_capture = getattr(browser, "screenshot_jpeg_bytes", None)
    if jpeg_capture is not None:
        try:
            return await jpeg_capture(session_id), "image/jpeg"
        except BrowserError:
            pass
    direct_capture = getattr(browser, "screenshot_png_bytes", None)
    if direct_capture is not None:
        try:
            return await direct_capture(session_id), "image/png"
        except BrowserError:
            pass
    if getattr(browser, "screenshot_annotated", None):
        try:
            shot = await browser.screenshot_annotated(session_id, allowed_domains)
        except TypeError:
            shot = await browser.screenshot_annotated(session_id)
        if isinstance(shot, tuple) and len(shot) == 2:
            return shot[0], shot[1]
        if isinstance(shot, bytes):
            return shot, "image/png"
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
        await _emit_status(
            rec, "Paused after manual browser input; auto-resuming after idle.", "warn"
        )
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
        app=app,
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


async def _discard_token(delta: str, *args: Any, **kwargs: Any) -> None:
    _ = delta


def _ordered_provider_clients(app: FastAPI, rec: TaskRecord) -> list[Any]:
    app_providers = getattr(app.state, "providers", {})
    provider_name = getattr(rec, "provider", None)

    # If the caller specified a concrete provider name ("gemini", "openrouter"),
    # use that provider's client.
    if provider_name and provider_name in app_providers:
        return [app_providers[provider_name]]

    # If the caller specified something that is NOT a provider name (e.g. a model
    # ID like "minimax/mimo-v2.5"), treat it as a model override and route
    # through the OpenRouter client (which supports arbitrary model IDs).
    if provider_name and "openrouter" in app_providers:
        rec.provider = "openrouter"
        rec._model_override = provider_name  # type: ignore[attr-defined]
        return [app_providers["openrouter"]]

    # No provider preference — build ordered fallback list.
    # Prefer OpenRouter first because it supports many models and is the
    # common default when the user has configured multiple keys.
    ordered: list[Any] = []
    for p in ["openrouter", "gemini"]:
        if p in app_providers:
            ordered.append(app_providers[p])
    for p, client in app_providers.items():
        if p not in ("openrouter", "gemini"):
            ordered.append(client)
    return ordered


async def _warmup_providers(app: FastAPI, rec: TaskRecord) -> None:
    """Prime provider auth before the first vision call (avoids flaky first-request 401s).

    Runs only once per orchestrator process lifetime.  Subsequent tasks skip the
    health-check API call (~200–500 ms) because credentials are already primed.
    """
    if getattr(app.state, "providers_warmed", False):
        return
    for client in _ordered_provider_clients(app, rec):
        health = getattr(client, "health_check", None)
        if health is None:
            continue
        try:
            await health()
        except ProviderError:
            pass
        app.state.providers_warmed = True
        return


async def _warmup_browser(app: FastAPI, browser: Any, session_id: str) -> None:
    """Pre-connect the persistent CDP WebSocket so the first real screenshot
    skips the HTTP ``/json/list`` + WS handshake (~200-500 ms).

    Does NOT take a throwaway screenshot.  We tried that and it added
    ~10 s of overhead per task without speeding up the first real screenshot:
    Chrome's ``Page.captureScreenshot`` with ``fromSurface: true`` re-rasterizes
    the surface on every call, so priming the compositor doesn't help.  The
    fast subsequent screenshots the user sees come from Chrome reusing cached
    tiles when the page hasn't changed, not from a warm compositor.

    Best-effort: any failure is swallowed so a dead browser never blocks the
    task — the main loop's recovery path will handle it.
    """
    get_session = getattr(browser, "_get_cdp_session", None)
    if get_session is None:
        return
    try:
        await get_session(session_id)
        log.debug("[agent_loop] _warmup_browser: CDP WS pre-connected for %s", session_id[:8])
    except Exception as exc:  # noqa: BLE001 - warmup must never block the task
        log.debug("[agent_loop] _warmup_browser: CDP session warmup skipped: %s", exc)


def _effective_allowed_domains(
    configured: list[str],
    snap_dict: dict[str, Any],
    active_tabs: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Compute which domains the agent is allowed to interact with.

    When the user has explicitly configured domains, we add the current page
    host so the agent can continue interacting with the page it's already on.
    When no domains are configured, we return an empty list to signal
    unrestricted access (no approval gate for navigation).
    """
    merged = set(configured)
    if merged:
        # User configured specific domains — add the current page host
        # so the agent can interact with the page it's already on.
        host = _host_from_snapshot(snap_dict)
        if host:
            merged.add(host)
        if active_tabs:
            for tab in active_tabs:
                url = tab.get("url")
                if isinstance(url, str) and url:
                    try:
                        from urllib.parse import urlparse

                        hostname = urlparse(url).hostname
                        if hostname:
                            merged.add(hostname.lower())
                    except Exception:
                        pass
        if "example.com" in merged and len(merged) > 1:
            merged.remove("example.com")
        return list(merged)

    # No domains configured — unrestricted access.
    # Return empty so reclassify_risk skips domain checks and
    # _base doesn't pass --allowed-domains to the subprocess.
    return []


def _host_from_snapshot(snap_dict: dict[str, Any]) -> str | None:
    for key in ("url", "pageUrl", "page_url"):
        raw = snap_dict.get(key)
        if isinstance(raw, str) and raw:
            host = urlparse(raw).hostname
            return host.lower() if host else None
    data = snap_dict.get("data")
    if isinstance(data, dict):
        for key in ("url", "pageUrl", "page_url"):
            raw = data.get(key)
            if isinstance(raw, str) and raw:
                host = urlparse(raw).hostname
                return host.lower() if host else None
    return None


async def _save_step_observation_screenshot(
    app: FastAPI,
    task_id: str,
    step: int,
    screenshot_bytes: bytes,
) -> str | None:
    if not screenshot_bytes:
        return None
    root = getattr(getattr(app.state, "settings", None), "data_dir", None)
    if root is None:
        root = getattr(app.state, "data_dir", None)
    if root is None:
        return None
    path = root / "screenshots" / task_id / f"{step}-observation.webp"
    try:
        await asyncio.to_thread(save_png_as_preview_webp, screenshot_bytes, path)
    except Exception:  # noqa: BLE001
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, screenshot_bytes)
    return str(path)


async def _save_step_snapshot_json(
    app: FastAPI,
    task_id: str,
    step: int,
    snap_dict: dict[str, Any],
) -> str | None:
    """Persist the snapshot JSON for a step next to the observation screenshot.

    Deep-debug instrument: when a click gets stuck we want to see exactly what
    the snapshot gave the model — the role/name/tag of @e4, the full refs map,
    the page origin — so we can tell apart "model clicked the wrong element"
    from "model clicked the right element but the click was intercepted".
    The screenshot alone shows pixels but not which ref mapped to which button.
    """
    root = getattr(getattr(app.state, "settings", None), "data_dir", None)
    if root is None:
        root = getattr(app.state, "data_dir", None)
    if root is None:
        return None
    path = root / "screenshots" / task_id / f"{step}-snapshot.json"
    try:
        # Trim to the refs map + origin + title only — the full snapshot can be
        # 100KB+, and for debugging stuck clicks the refs are what we need.
        data = snap_dict.get("data", snap_dict)
        refs = data.get("refs") if isinstance(data, dict) else None
        trimmed = {
            "origin": data.get("origin") if isinstance(data, dict) else None,
            "title": data.get("title") if isinstance(data, dict) else None,
            "url": data.get("url") if isinstance(data, dict) else None,
            "refs": refs,
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_text, json.dumps(trimmed, default=str, indent=2))
    except Exception:  # noqa: BLE001 - snapshot saving must never break the loop
        log.debug("[agent_loop] _save_step_snapshot_json: failed for step %d", step)
        return None
    return str(path)


async def _emit_step_meta(
    rec: TaskRecord,
    *,
    provider: str,
    model: str,
    observation_screenshot_path: str | None,
    app: Any = None,
) -> None:
    payload: dict[str, Any] = {
        "kind": "step_meta",
        "provider": provider,
        "model": model,
    }
    if observation_screenshot_path:
        payload["observation_screenshot_path"] = observation_screenshot_path
        if app is not None:
            settings = getattr(app.state, "settings", None)
            if settings is not None:
                url = settings.screenshot_url_for(observation_screenshot_path)
                if url:
                    payload["observation_screenshot_url"] = url
    await _put_sse(rec, "step_meta", payload)


async def _complete_with_limits(
    app: FastAPI,
    model: Any,
    bundle: Any,
    on_token: Any,
    rec: TaskRecord,
    history: deque[str],
) -> tuple[str, str, str]:
    clients = _ordered_provider_clients(app, rec)
    preferred_only = bool(getattr(rec, "provider", None))

    if not clients:
        raw = await model.complete_streaming(bundle, temperature=0.0, on_token=on_token)
        provider = getattr(model, "provider", "unknown")
        # Report the model actually used (override wins over client default)
        # so logs and the UI's step_meta reflect reality instead of always
        # showing the client's default model.
        model_id = bundle.model_override or getattr(model, "model", "unknown")
        return raw, provider, model_id

    last_error: ProviderError | None = None
    original_streamer = on_token.__self__ if hasattr(on_token, "__self__") else None

    def _reset_streamer() -> None:
        if original_streamer and hasattr(original_streamer, "_buffer"):
            original_streamer._buffer = ""
            original_streamer._emitted_length = 0
            original_streamer._closed = False
            original_streamer.emitted = False

    async def _call_client(client: Any) -> str:
        provider_name = client.provider
        limiter = getattr(app.state, "rate_limit", {}).get(provider_name)
        semaphore = getattr(app.state, "semaphore", {}).get(provider_name)
        if limiter is None or semaphore is None:
            return await client.complete_streaming(bundle, temperature=0.0, on_token=on_token)
        async with limiter:
            async with semaphore:
                return await client.complete_streaming(bundle, temperature=0.0, on_token=on_token)

    async def _call_client_with_interrupt(client: Any) -> str:
        # Drain any messages that arrived before this call and reset the event
        # so we can detect new messages that arrive during the call.
        await _drain_steering_messages(rec, history)
        call_task = asyncio.create_task(_call_client(client))
        steer_task = asyncio.create_task(rec.steering_message_event.wait())
        done, _pending = await asyncio.wait(
            {call_task, steer_task}, return_when=asyncio.FIRST_COMPLETED
        )
        if steer_task in done:
            call_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await call_task
            _reset_streamer()
            raise SteeringInterrupt()
        steer_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await steer_task
        return await call_task

    max_unauth_attempts = 2 if preferred_only else 1
    for client in clients:
        rate_limit_retries = 0
        unauth_attempts = 0
        while True:
            _reset_streamer()
            try:
                raw = await _call_client_with_interrupt(client)
                # Report the model actually used in the request (override
                # wins over client default). Without this, the log line and
                # the UI's step_meta would always show the client's default
                # model even when the user picked a different one.
                used_model = bundle.model_override or client.model
                return raw, client.provider, used_model
            except SteeringInterrupt:
                raise
            except ProviderError as e:
                err_str = str(e.args[0]) if e.args else ""
                if "unauthorized" in err_str:
                    last_error = e
                    unauth_attempts += 1
                    if unauth_attempts < max_unauth_attempts:
                        await asyncio.sleep(0.45)
                        continue
                    if preferred_only:
                        raise
                    break
                if "rate_limited" in err_str:
                    last_error = e
                    rate_limit_retries += 1
                    if rate_limit_retries <= 3:
                        log.warning(
                            "[agent_loop] Rate limit hit for %s, retrying in 60s (attempt %d/3)...",
                            client.provider,
                            rate_limit_retries,
                        )
                        for sec in range(60, 0, -10):
                            await _emit_status(
                                rec,
                                f"Rate limit hit for {client.provider}. Retrying in {sec}s...",
                                "warn",
                            )
                            # Responsive cancellation-friendly sleep
                            for _ in range(5):
                                await asyncio.sleep(2.0)
                        await _emit_status(rec, f"Retrying with {client.provider} now...", "info")
                        await asyncio.sleep(1.0)
                        continue
                    break
                if "server_error" in err_str:
                    last_error = e
                    break
                # client_error (4xx other than 401/403) — not retryable on this provider,
                # but we can still try the next provider in the fallback chain.
                if "client_error" in err_str:
                    last_error = e
                    log.warning(
                        "[agent_loop] Client error from %s: %s — trying next provider",
                        client.provider,
                        err_str[:200],
                    )
                    break
                if "transport:" in err_str:
                    last_error = e
                    log.warning(
                        "[agent_loop] Transport error from %s: %s — trying next provider",
                        client.provider,
                        err_str[:200],
                    )
                    break
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
    rec.last_error_code = code
    rec.last_error_message = text
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
    app: Any = None,
) -> None:
    screenshot_url: str | None = None
    if app is not None and screenshot_path:
        settings = getattr(app.state, "settings", None)
        if settings is not None:
            screenshot_url = settings.screenshot_url_for(screenshot_path)
    action_msg = {
        "id": str(uuid.uuid4()),
        "kind": "action_log",
        "action": action.model_dump(mode="json"),
        "executed": executed,
        "screenshot_path": screenshot_path,
        "screenshot_url": screenshot_url,
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
    app: Any = None,
) -> None:
    _ = correlation_id
    screenshot_url: str | None = None
    if app is not None:
        settings = getattr(app.state, "settings", None)
        if settings is not None:
            screenshot_url = settings.screenshot_url_for(screenshot_path)
    ts = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=300)).isoformat()
    msg = {
        "id": approval_id,
        "kind": "approval_request",
        "action": action.model_dump(mode="json"),
        "screenshot_path": screenshot_path,
        "screenshot_url": screenshot_url,
        "expires_at": expires_at,
        "ts": ts,
    }
    await _put_sse(rec, "approval", {"kind": "approval", "message": msg})


_ACTION_LABELS = {
    "click": "Clicking",
    "type": "Typing",
    "scroll": "Scrolling",
    "navigate": "Navigating",
    "wait": "Waiting",
    "done": "Finishing",
}


def _action_label(action_name: str) -> str:
    return _ACTION_LABELS.get(action_name, "Acting")


def _action_detail(display_action: Action, step: int) -> str:
    parts = [f"Step {step}"]
    ref = getattr(display_action, "target_ref", None)
    val = getattr(display_action, "value", None)
    if ref and str(ref).startswith("@"):
        parts.append(str(ref))
    elif val:
        s = str(val)
        if len(s) > 40:
            s = s[:37] + "..."
        parts.append(s)
    return " · ".join(parts)


async def _update_browser_overlay(
    browser: Any, session_id: str, phase: str, label: str, detail: str = ""
) -> None:
    """Mirror agent state to the in-page status pill. Fire-and-forget.

    Silent no-op if the browser adapter doesn't expose ``update_overlay``
    (e.g. ``_StubBrowser``, ``FakeBrowser`` in tests, or any future adapter
    that opts out). Never raises — overlay failures must not break the loop.
    """
    update = getattr(browser, "update_overlay", None)
    if update is None:
        return
    try:
        await update(session_id, phase, label, detail)
    except Exception as exc:  # noqa: BLE001 - never break the loop
        log.debug("[agent_loop] overlay update failed: %s", exc)


async def _overlay_fade_out(rec: TaskRecord, delay: float = 4.0) -> None:
    """After showing a terminal state for ``delay`` seconds, fade the pill to idle."""
    browser = getattr(rec, "_overlay_browser", None)
    session_id = getattr(rec, "_overlay_session_id", None)
    if browser is None or session_id is None:
        return
    await asyncio.sleep(delay)
    await _update_browser_overlay(browser, session_id, "idle", "", "")


def _overlay_terminal(rec: TaskRecord, phase: str, label: str, detail: str = "") -> None:
    """Push a terminal state to the pill and schedule a fade-to-idle.

    Used for done/error/aborted — the pill shows the final state for a few
    seconds so the user can read it, then fades out.
    """
    browser = getattr(rec, "_overlay_browser", None)
    session_id = getattr(rec, "_overlay_session_id", None)
    if browser is None or session_id is None:
        return
    asyncio.create_task(_update_browser_overlay(browser, session_id, phase, label, detail))
    asyncio.create_task(_overlay_fade_out(rec))


async def _get_active_tabs(port: int | None) -> list[dict[str, Any]]:
    if not port:
        return []
    import httpx

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"http://127.0.0.1:{port}/json")
            if res.status_code == 200:
                targets = res.json()
                tabs = []
                for t in targets:
                    if isinstance(t, dict) and t.get("type") == "page":
                        tabs.append({"title": t.get("title", ""), "url": t.get("url", "")})
                return tabs
    except Exception:
        pass
    return []


_CONVERSATIONAL_PATTERNS: tuple[str, ...] = (
    # Pauses / holds
    "hold on", "wait a sec", "wait a moment", "give me a sec",
    "one moment", "just a moment", "hang on", "hold up", "pause",
    "stop", "don't do anything", "do nothing", "stay",
    "let me", "i need to", "i'll", "i will",
    "not yet", "don't start", "don't go", "don't proceed",
    # Greetings
    "hi", "hello", "hey", "hola", "howdy", "yo", "sup",
    "what's up", "whats up", "good morning", "good afternoon",
    "good evening", "greetings",
    # Thanks / reactions
    "thanks", "thank you", "thx", "cool", "nice", "awesome",
    "great", "ok", "okay", "got it", "understood",
    # Capability questions
    "what can you do", "who are you", "help", "what are you",
    "how do you work", "what do you do",
)


def _latest_user_message(history: deque[str]) -> str | None:
    """Return the most recent user message from the history deque."""
    for entry in reversed(history):
        if isinstance(entry, str) and entry.startswith("user:"):
            return entry.removeprefix("user:")
    return None


def _is_conversational_message(text: str) -> bool:
    """Check if a user message is conversational rather than action-oriented.

    Returns True for messages like "hold on", "wait a moment", etc. that don't
    require a browser action — just a text reply.
    """
    lower = text.lower().strip()
    # Very short messages are likely conversational
    if len(lower.split()) <= 3:
        return any(p in lower for p in _CONVERSATIONAL_PATTERNS)
    # Longer messages: check for strong conversational indicators
    for p in _CONVERSATIONAL_PATTERNS:
        if p in lower:
            return True
    return False


# Action verbs that indicate the user wants the agent to do something on the web.
# If none of these are present AND the page is about:blank, treat as conversational.
_ACTION_VERBS: tuple[str, ...] = (
    "go to", "navigate", "open", "visit", "browse",
    "click", "type", "fill", "enter", "submit",
    "search", "find", "look for", "scroll",
    "log in", "login", "sign in", "signin", "log me in",
    "download", "upload", "fill out", "complete",
    "check", "read", "get", "show me", "tell me about",
    "buy", "purchase", "order", "register", "sign up",
)


def _has_action_intent(text: str) -> bool:
    """Check if a user message contains action-oriented intent.

    Returns True if the message contains a URL or an action verb,
    indicating the user wants the agent to do something on the web.
    """
    lower = text.lower().strip()
    # Contains a URL?
    if "http://" in lower or "https://" in lower or "www." in lower:
        return True
    # Contains a .tld pattern (e.g. "go to google.com")?
    import re
    if re.search(r'\b\w+\.\w{2,}\b', lower):
        return True
    # Contains an action verb?
    return any(verb in lower for verb in _ACTION_VERBS)
