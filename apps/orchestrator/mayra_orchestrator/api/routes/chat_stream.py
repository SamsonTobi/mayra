"""`/v1/chat/stream`."""

from __future__ import annotations

import hmac
import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse

from mayra_orchestrator.api.deps import get_effective_owner_id, get_settings
from mayra_orchestrator.errors import OwnerMismatchError

router = APIRouter(prefix="/v1/chat", tags=["chat"])


def _sse(event: str, data: str) -> bytes:
    return f"event: {event}\ndata: {data}\n\n".encode()


@router.get("/stream", response_model=None)
async def chat_stream(
    request: Request,
    task_id: str,
    owner_id: Annotated[str, Depends(get_effective_owner_id)],
    token: Annotated[str | None, Query()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> StreamingResponse | JSONResponse:
    settings = get_settings(request)
    raw = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
    if not raw or not hmac.compare_digest(raw, settings.token):
        return JSONResponse(status_code=401, content={"detail": "unauthorized"})

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
            item = await rec.sse_queue.get()
            if item is None:
                break
            ev_name, data = item
            yield _sse(ev_name, data)

    return StreamingResponse(gen_live(), media_type="text/event-stream")
