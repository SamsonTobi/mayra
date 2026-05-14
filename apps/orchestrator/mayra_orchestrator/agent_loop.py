"""Agent loop (Stage T5) + `TaskState` coordinator snapshot."""

from __future__ import annotations

import asyncio
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
from mayra_orchestrator.errors import ActionValidationError, BudgetExhaustedError, SchemaRepairableError
from mayra_orchestrator.parser import parse_chat_and_action
from mayra_orchestrator.prompts.templates import build_prompt
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


async def run_agent_loop(app: FastAPI, task_id: str, correlation_id: str) -> None:
    rec = app.state.registry.tasks[task_id]
    try:
        await _run_agent_loop_body(app, task_id, correlation_id, rec)
    except asyncio.CancelledError:
        await _emit_done(rec, task_id, "aborted")
        raise
    finally:
        await rec.sse_queue.put(None)


async def _run_agent_loop_body(app: FastAPI, task_id: str, correlation_id: str, rec: TaskRecord) -> None:
    approvals = app.state.approval_registry
    browser = app.state.browser
    model = app.state.model_client

    budget = StepBudget(max_steps=rec.max_steps, remaining=rec.max_steps)
    history: deque[str] = deque(maxlen=512)

    while True:
        try:
            budget.consume_step()
        except BudgetExhaustedError:
            await _emit_done(rec, task_id, "budget_exhausted")
            return

        await _drain_user_messages(rec, history)
        step_no = rec.max_steps - budget.remaining

        snap_dict = await browser.snapshot(task_id)
        snapshot = Snapshot.from_json(snap_dict).prune()

        shot = await browser.screenshot_annotated(task_id)
        if isinstance(shot, tuple) and len(shot) == 2:
            screenshot_bytes, screenshot_mime = shot[0], shot[1]
        elif isinstance(shot, bytes):
            screenshot_bytes, screenshot_mime = shot, "image/png"
        else:
            screenshot_bytes, screenshot_mime = b"", "image/png"

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

        async def on_token(delta: str) -> None:
            await _put_sse(rec, "token", {"kind": "token", "delta": delta})

        raw = await model.complete_streaming(bundle, temperature=0.0, on_token=on_token)

        while True:
            try:
                chat, action = parse_chat_and_action(raw)
                break
            except SchemaRepairableError:
                try:
                    budget.consume_repair()
                except BudgetExhaustedError:
                    await _emit_error(rec, correlation_id, "repair_budget", "malformed action JSON")
                    await _emit_done(rec, task_id, "failed")
                    return
                raw = await model.complete_streaming(bundle, temperature=0.0, on_token=on_token)

        history.append(f"assistant:{chat}")

        if action.target_ref.startswith("@") and snapshot.find(action.target_ref) is None:
            await _emit_error(rec, correlation_id, "action_validation_error", "snapshot missing target_ref")
            await _emit_done(rec, task_id, "failed")
            return

        ctx = _LoopRiskCtx(list(rec.allowed_domains), stale=False)
        gated = reclassify_risk(action, snapshot, ctx)

        if gated.risk == "high":
            rec.approval_decision = None
            rec.approval_event.clear()
            approval_id = approvals.register(task_id)
            await _emit_approval(rec, correlation_id, approval_id, gated)
            try:
                await asyncio.wait_for(rec.approval_event.wait(), timeout=300.0)
            except TimeoutError:
                await _emit_done(rec, task_id, "failed")
                return
            if rec.approval_decision is not True:
                await _emit_done(rec, task_id, "failed")
                return

        try:
            cmds = to_agent_browser_command(gated)
        except ActionValidationError as exc:
            await _emit_error(rec, correlation_id, "action_validation_error", str(exc))
            await _emit_done(rec, task_id, "failed")
            return

        await browser.execute(task_id, gated, cmds)

        ts = datetime.now(timezone.utc).isoformat()
        action_msg = {
            "id": str(uuid.uuid4()),
            "kind": "action_log",
            "action": gated.model_dump(mode="json"),
            "executed": True,
            "screenshot_path": None,
            "step": step_no,
            "ts": ts,
        }
        await _put_sse(rec, "action", {"kind": "action", "message": action_msg})

        if rec.exhaust_budget_probe:
            continue

        await _emit_done(rec, task_id, "success")
        return


async def _drain_user_messages(rec: TaskRecord, history: deque[str]) -> None:
    while True:
        try:
            msg = rec.messages.get_nowait()
        except asyncio.QueueEmpty:
            break
        history.append(f"user:{msg}")


async def _put_sse(rec: TaskRecord, event: str, payload: dict[str, Any]) -> None:
    await rec.sse_queue.put((event, json.dumps(payload)))


async def _emit_done(rec: TaskRecord, task_id: str, status: str) -> None:
    await _put_sse(rec, "done", {"kind": "done", "task_id": task_id, "status": status})


async def _emit_error(rec: TaskRecord, correlation_id: str, code: str, message: str) -> None:
    await _put_sse(
        rec,
        "error",
        {"kind": "error", "code": code, "message": message, "correlation_id": correlation_id},
    )


async def _emit_approval(rec: TaskRecord, correlation_id: str, approval_id: str, action: Action) -> None:
    _ = correlation_id
    ts = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=300)).isoformat()
    msg = {
        "id": approval_id,
        "kind": "approval_request",
        "action": action.model_dump(mode="json"),
        "screenshot_path": "local/screenshots/pending.webp",
        "expires_at": expires_at,
        "ts": ts,
    }
    await _put_sse(rec, "approval", {"kind": "approval", "message": msg})
