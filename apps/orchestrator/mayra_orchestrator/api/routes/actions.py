"""`/v1/actions/*`."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.api.schemas import ApproveRequest

router = APIRouter(prefix="/v1/actions", tags=["actions"], dependencies=[Depends(require_bearer)])


@router.post("/approve")
async def approve(request: Request, body: ApproveRequest) -> dict[str, bool]:
    try:
        request.app.state.approval_registry.complete(
            body.approval_id,
            approved=(body.decision == "approve"),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="unknown approval") from exc
    return {"ok": True}
