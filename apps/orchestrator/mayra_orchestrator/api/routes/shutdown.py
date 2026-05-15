"""`/v1/shutdown`."""

from __future__ import annotations
import os
import signal

from fastapi import APIRouter, Depends, Request

from mayra_orchestrator.api.deps import require_bearer

router = APIRouter(prefix="/v1/shutdown", tags=["shutdown"], dependencies=[Depends(require_bearer)])


@router.post("")
async def shutdown(request: Request) -> dict[str, bool]:
    # Close any browsers or active processes
    browser = getattr(request.app.state, "browser", None)
    if browser and hasattr(browser, "close_all"):
        await browser.close_all()
    session_browser = getattr(request.app.state, "session_browser", None)
    if session_browser and hasattr(session_browser, "close_all"):
        await session_browser.close_all()

    # Trigger OS shutdown signal to self since uvicorn respects SIGTERM
    os.kill(os.getpid(), signal.SIGTERM)
    return {"ok": True}
