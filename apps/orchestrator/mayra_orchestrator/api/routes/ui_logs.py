"""`/v1/logs/*`."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from mayra_orchestrator.api.correlation import get_correlation_id
from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.api.schemas import UILogRequest, UILogResponse
from mayra_orchestrator.redaction import redact

router = APIRouter(prefix="/v1/logs", tags=["logs"], dependencies=[Depends(require_bearer)])


@router.post("/ui", response_model=UILogResponse)
async def ui_logs(request: Request, body: UILogRequest) -> UILogResponse:
    entry = {"event": body.event, "fields": redact(body.fields), "correlation_id": get_correlation_id()}
    request.app.state.ui_logs.append(entry)
    return UILogResponse(ok=True)
