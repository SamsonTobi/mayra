"""Maps ephemeral approval UUIDs to tasks."""

from __future__ import annotations

import uuid

from mayra_orchestrator.api.memory_tasks import MemoryTaskRegistry


class ApprovalRegistry:
    def __init__(self, tasks: MemoryTaskRegistry) -> None:
        self._tasks = tasks
        self._pending: dict[str, str] = {}

    def register(self, task_id: str) -> str:
        if task_id not in self._tasks.tasks:
            raise ValueError(f"unknown task_id={task_id!r}")
        approval_id = str(uuid.uuid4())
        self._pending[approval_id] = task_id
        return approval_id

    def complete(self, approval_id: str, *, approved: bool) -> None:
        if approval_id.startswith("resume:"):
            task_id = approval_id.removeprefix("resume:")
            if task_id not in self._tasks.tasks:
                raise LookupError(approval_id)
            self._tasks.record_approval_decision(task_id, approved)
            return

        task_id = self._pending.pop(approval_id, None)
        if task_id is None:
            raise LookupError(approval_id)
        self._tasks.record_approval_decision(task_id, approved)

    def revoke_all_for_task(self, task_id: str) -> None:
        stale = [aid for aid, tid in self._pending.items() if tid == task_id]
        for aid in stale:
            self._pending.pop(aid, None)

    def clear_all_pending(self) -> None:
        self._pending.clear()

    def pending_count(self) -> int:
        return len(self._pending)

    @property
    def pending_approval_ids(self) -> tuple[str, ...]:
        return tuple(self._pending.keys())
