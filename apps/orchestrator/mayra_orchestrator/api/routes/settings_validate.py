"""`/v1/settings/*`."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.api.schemas import ValidateSettingsRequest, ValidateSettingsResponse

router = APIRouter(prefix="/v1/settings", tags=["settings"], dependencies=[Depends(require_bearer)])


@router.post("/validate", response_model=ValidateSettingsResponse)
async def validate_settings(request: Request, body: ValidateSettingsRequest) -> ValidateSettingsResponse:
    t0 = time.perf_counter()
    providers = getattr(request.app.state, "providers", {})
    client = providers.get(body.provider, request.app.state.model_client)
    await client.health_check()
    ms = int((time.perf_counter() - t0) * 1000)
    return ValidateSettingsResponse(ok=True, latency_ms=max(ms, 1))
