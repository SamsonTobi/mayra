"""`/v1/tasks/*`."""

from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from mayra_orchestrator.agent_loop import run_agent_loop
from mayra_orchestrator.api.correlation import get_correlation_id
from mayra_orchestrator.api.deps import get_effective_owner_id, require_bearer
from mayra_orchestrator.api.schemas import CreateTaskRequest, CreateTaskResponse, TaskMessageRequest

router = APIRouter(prefix="/v1/tasks", tags=["tasks"], dependencies=[Depends(require_bearer)])


@router.post("", response_model=CreateTaskResponse)
async def create_task(
    request: Request,
    body: CreateTaskRequest,
    owner_id: Annotated[str, Depends(get_effective_owner_id)],
) -> CreateTaskResponse:
    reg = request.app.state.registry
    tid = reg.create(
        body.goal,
        body.allowed_domains,
        owner_id=owner_id,
        start_blocked_sleeper=body.start_blocked_sleeper,
        live_loop=body.start_agent_loop,
        max_steps=body.max_steps,
        exhaust_budget_probe=body.exhaust_budget_probe,
    )
    if body.start_agent_loop:
        rec = reg.tasks[tid]
        rec.agent_runner = asyncio.create_task(
            run_agent_loop(request.app, tid, get_correlation_id()),
            name=f"mayra-task-{tid}",
        )
    return CreateTaskResponse(task_id=tid)


@router.post("/{task_id}/abort")
async def abort_task(
    request: Request,
    task_id: str,
    owner_id: Annotated[str, Depends(get_effective_owner_id)],
) -> dict[str, str]:
    request.app.state.approval_registry.revoke_all_for_task(task_id)
    reg = request.app.state.registry
    status = await reg.abort(task_id, acting_owner_id=owner_id)
    return {"status": status}


@router.post("/{task_id}/message")
async def task_message(
    request: Request,
    task_id: str,
    body: TaskMessageRequest,
    owner_id: Annotated[str, Depends(get_effective_owner_id)],
) -> dict[str, bool]:
    reg = request.app.state.registry
    try:
        await reg.enqueue_message(task_id, body.text, acting_owner_id=owner_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="task not found") from None
    return {"ok": True}
