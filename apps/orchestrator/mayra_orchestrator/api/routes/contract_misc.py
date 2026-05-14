"""Contract-only routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.errors import ActionValidationError

router = APIRouter(prefix="/v1/contract", tags=["contract"], dependencies=[Depends(require_bearer)])


@router.post("/raise-action-validation")
async def raise_action_validation() -> None:
    raise ActionValidationError("boom")
