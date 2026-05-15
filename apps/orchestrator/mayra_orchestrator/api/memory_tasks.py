"""In-memory task store for contract tests (replaced by Supabase later)."""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

from mayra_orchestrator.errors import OwnerMismatchError


@dataclass
class TaskRecord:
    goal: str
    allowed_domains: list[str]
    owner_id: str
    initial_messages: list[str] = field(default_factory=list)
    session_id: str | None = None
    messages: asyncio.Queue[str] = field(default_factory=asyncio.Queue)
    approval_event: asyncio.Event = field(default_factory=asyncio.Event)
    approval_decision: bool | None = None
    blocked_runner: asyncio.Task[None] | None = None
    agent_runner: asyncio.Task[None] | None = None
    sse_queue: asyncio.Queue[tuple[str, str] | None] = field(default_factory=asyncio.Queue)
    live_loop: bool = False
    max_steps: int = 40
    exhaust_budget_probe: bool = False
    status: str = "running"
    last_observation_hash: str | None = None


class MemoryTaskRegistry:
    def __init__(self) -> None:
        self.tasks: dict[str, TaskRecord] = {}

    def create(
        self,
        goal: str,
        allowed_domains: list[str],
        *,
        owner_id: str,
        initial_messages: list[str] | None = None,
        start_blocked_sleeper: bool = False,
        live_loop: bool = False,
        max_steps: int = 40,
        exhaust_budget_probe: bool = False,
        session_id: str | None = None,
    ) -> str:
        tid = str(uuid.uuid4())
        rec = TaskRecord(
            goal=goal,
            allowed_domains=list(allowed_domains),
            owner_id=owner_id,
            initial_messages=list(initial_messages or []),
            session_id=session_id,
            live_loop=live_loop,
            max_steps=max_steps,
            exhaust_budget_probe=exhaust_budget_probe,
        )
        self.tasks[tid] = rec
        if start_blocked_sleeper:
            rec.blocked_runner = asyncio.create_task(_blocked_sleeper(tid, self))
        return tid

    def record_approval_decision(self, task_id: str, approved: bool) -> None:
        rec = self.tasks[task_id]
        rec.approval_decision = approved
        rec.approval_event.set()

    def ensure_task_owned(self, task_id: str, acting_owner_id: str) -> TaskRecord:
        try:
            rec = self.tasks[task_id]
        except KeyError as exc:
            raise KeyError(task_id) from exc
        if rec.owner_id != acting_owner_id:
            raise OwnerMismatchError(f"task {task_id} is not accessible for this principal")
        return rec

    async def enqueue_message(self, task_id: str, text: str, *, acting_owner_id: str) -> None:
        rec = self.ensure_task_owned(task_id, acting_owner_id)
        await rec.messages.put(text)

    async def abort(self, task_id: str, *, acting_owner_id: str | None = None) -> str:
        rec = self.tasks.get(task_id)
        if rec is None:
            return "aborted"
        if acting_owner_id is not None:
            self.ensure_task_owned(task_id, acting_owner_id)
        await _cancel_task(rec.agent_runner)
        await _cancel_task(rec.blocked_runner)
        rec.status = "aborted"
        return "aborted"

    async def shutdown_all(self) -> None:
        for tid in list(self.tasks.keys()):
            await self.abort(tid, acting_owner_id=None)


async def _cancel_task(t: asyncio.Task[Any] | None) -> None:
    if t is None or t.done():
        return
    t.cancel()
    try:
        await t
    except asyncio.CancelledError:
        pass


async def _blocked_sleeper(task_id: str, reg: MemoryTaskRegistry) -> None:
    try:
        await asyncio.sleep(3600.0)
    except asyncio.CancelledError:
        if task_id in reg.tasks:
            reg.tasks[task_id].status = "aborted"
        raise
