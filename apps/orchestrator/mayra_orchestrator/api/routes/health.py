"""`/healthz`."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz(request: Request) -> dict[str, object]:
    body: dict[str, object] = {"status": "ok"}
    detail = getattr(request.app.state, "agent_browser_diagnostic", None)
    if isinstance(detail, dict):
        if detail.get("pending"):
            body["agent_browser_ok"] = True
            body["agent_browser_detail"] = detail
            return body
        if detail.get("missing"):
            ok = False
        elif detail.get("ok") is False or detail.get("success") is False:
            ok = False
        elif detail.get("ok") is True or detail.get("success") is True:
            ok = True
        else:
            ok = True
        body["agent_browser_ok"] = ok
        body["agent_browser_detail"] = detail
    else:
        body["agent_browser_ok"] = True
        body["agent_browser_detail"] = None
    return body
