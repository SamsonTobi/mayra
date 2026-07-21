"""`/v1/chat/stream`."""

from __future__ import annotations

import asyncio
import hmac
import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse

from mayra_orchestrator.api.deps import get_settings
from mayra_orchestrator.errors import OwnerMismatchError

router = APIRouter(prefix="/v1/chat", tags=["chat"])

_SSE_KEEPALIVE_INTERVAL = 15.0  # seconds between keepalive comments


def _sse(event: str, data: str) -> bytes:
    return f"event: {event}\ndata: {data}\n\n".encode()


def _validate_auth(request: Request, settings, authorization: str | None, token: str | None) -> bool:
    """Shared auth check for SSE — returns True on success, sets request.state.user_id.

    Handles both token mode (hmac.compare_digest against settings.token) and
    password mode (validate against SessionStore).
    """
    raw = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
    if not raw:
        return False
    if settings.auth_mode == "password":
        store = getattr(request.app.state, "session_store", None)
        if store is None:
            return False
        info = store.validate(raw)
        if info is None:
            return False
        request.state.user_id = info.user_id
        return True
    return hmac.compare_digest(raw, settings.token)


@router.get("/stream", response_model=None)
async def chat_stream(
    request: Request,
    task_id: str,
    token: Annotated[str | None, Query()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> StreamingResponse | JSONResponse:
    settings = get_settings(request)
    if not _validate_auth(request, settings, authorization, token):
        return JSONResponse(status_code=401, content={"detail": "unauthorized"})

    # Resolve owner_id AFTER auth — _validate_auth sets request.state.user_id
    # in password mode. We can't use Depends(get_effective_owner_id) because
    # FastAPI dependencies run before the handler body (and before _validate_auth).
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        owner_id = str(user_id)
    else:
        x_mayra_owner_id = request.headers.get("X-Mayra-Owner-Id")
        if x_mayra_owner_id and x_mayra_owner_id.strip():
            owner_id = x_mayra_owner_id.strip()
        else:
            owner_id = settings.default_owner_id

    reg = request.app.state.registry
    try:
        rec = reg.ensure_task_owned(task_id, owner_id)
    except KeyError:
        return JSONResponse(status_code=404, content={"detail": "task not found"})
    except OwnerMismatchError:
        return JSONResponse(status_code=403, content={"detail": "owner mismatch"})

    if not rec.live_loop:

        async def gen_stub() -> AsyncIterator[bytes]:
            yield _sse("token", "hello")
            yield _sse("token", " world")
            action_payload = json.dumps(
                {
                    "id": "log-1",
                    "kind": "action_log",
                    "action": {
                        "action": "click",
                        "target_ref": "@e1",
                        "value": None,
                        "risk": "low",
                        "reason": "stub",
                    },
                    "executed": True,
                    "step": 1,
                }
            )
            yield _sse("action", action_payload)
            yield _sse("done", json.dumps({"kind": "done", "task_id": task_id, "status": "success"}))

        return StreamingResponse(gen_stub(), media_type="text/event-stream")

    async def gen_live() -> AsyncIterator[bytes]:
        while True:
            try:
                item = await asyncio.wait_for(rec.sse_queue.get(), timeout=_SSE_KEEPALIVE_INTERVAL)
            except asyncio.TimeoutError:
                # SSE comment line — ignored by EventSource, keeps connection alive
                yield b": keepalive\n\n"
                continue
            if item is None:
                break
            ev_name, data = item
            yield _sse(ev_name, data)

    return StreamingResponse(gen_live(), media_type="text/event-stream")
