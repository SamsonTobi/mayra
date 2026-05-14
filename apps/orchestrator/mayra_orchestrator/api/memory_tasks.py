"""In-memory task store for contract tests (replaced by Supabase later)."""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field


@dataclass
class TaskRecord:
    goal: str
    allowed_domains: list[str]
    messages: asyncio.Queue[str] = field(default_factory=asyncio.Queue)
    approval_event: asyncio.Event = field(default_factory=asyncio.Event)
    runner: asyncio.Task[None] | None = None
    status: str = "running"


class MemoryTaskRegistry:
    def __init__(self) -> None:
        self.tasks: dict[str, TaskRecord] = {}

    def create(self, goal: str, allowed_domains: list[str], *, start_blocked_sleeper: bool = False) -> str:
        tid = str(uuid.uuid4())
        rec = TaskRecord(goal=goal, allowed_domains=list(allowed_domains))
        self.tasks[tid] = rec
        if start_blocked_sleeper:
            rec.runner = asyncio.create_task(_blocked_sleeper(tid, self))
        return tid

    async def enqueue_message(self, task_id: str, text: str) -> None:
        await self.tasks[task_id].messages.put(text)

    def approve(self, task_id: str) -> None:
        self.tasks[task_id].approval_event.set()

    async def abort(self, task_id: str) -> str:
        rec = self.tasks.get(task_id)
        if rec is None:
            return "aborted"
        if rec.runner is not None and not rec.runner.done():
            rec.runner.cancel()
            try:
                await rec.runner
            except asyncio.CancelledError:
                pass
        rec.status = "aborted"
        return "aborted"


async def _blocked_sleeper(task_id: str, reg: MemoryTaskRegistry) -> None:
    try:
        await asyncio.sleep(3600.0)
    except asyncio.CancelledError:
        if task_id in reg.tasks:
            reg.tasks[task_id].status = "aborted"
        raise
