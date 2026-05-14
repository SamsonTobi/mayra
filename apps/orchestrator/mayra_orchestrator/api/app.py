"""Minimal ASGI app for contract tests and local dev (full agent loop later)."""
from __future__ import annotations

import hmac
import json
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from mayra_orchestrator.api.correlation import correlation_id_var, get_correlation_id, new_correlation_id
from mayra_orchestrator.api.deps import get_settings, require_bearer
from mayra_orchestrator.api.exceptions import install_exception_handlers
from mayra_orchestrator.api.memory_tasks import MemoryTaskRegistry
from mayra_orchestrator.api.schemas import (
    ApproveRequest,
    CreateTaskRequest,
    CreateTaskResponse,
    TaskMessageRequest,
    UILogRequest,
    UILogResponse,
    ValidateSettingsRequest,
    ValidateSettingsResponse,
)
from mayra_orchestrator.errors import ActionValidationError
from mayra_orchestrator.redaction import redact
from mayra_orchestrator.settings import AppSettings


def _sse(event: str, data: str) -> bytes:
    return f"event: {event}\ndata: {data}\n\n".encode()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Reserved for DB pools / provider clients. Defaults are set synchronously in create_app."""
    if getattr(app.state, "model_client", None) is None:

        class _DefaultModel:
            async def health_check(self) -> float:
                return 1.0

        app.state.model_client = _DefaultModel()
    yield


def create_app(settings: AppSettings | None = None) -> FastAPI:
    settings = settings or AppSettings()
    app = FastAPI(title="Mayra Orchestrator", lifespan=lifespan)
    app.state.settings = settings
    # httpx ASGITransport may defer lifespan; routes need these immediately.
    app.state.registry = MemoryTaskRegistry()
    app.state.ui_logs = []

    class _DefaultModel:
        async def health_check(self) -> float:
            return 1.0

    app.state.model_client = _DefaultModel()
    install_exception_handlers(app)

    @app.middleware("http")
    async def _host_and_correlation(request: Request, call_next):
        correlation_id_var.set(new_correlation_id())
        host = request.headers.get("host", "")
        if not (host.startswith("127.0.0.1:") or host.startswith("localhost:")):
            return JSONResponse(status_code=400, content={"detail": "bad host"})
        return await call_next(request)

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/v1/tasks", dependencies=[Depends(require_bearer)])
    async def create_task(request: Request, body: CreateTaskRequest) -> CreateTaskResponse:
        reg: MemoryTaskRegistry = request.app.state.registry
        tid = reg.create(
            body.goal,
            body.allowed_domains,
            start_blocked_sleeper=body.start_blocked_sleeper,
        )
        return CreateTaskResponse(task_id=tid)

    @app.post("/v1/tasks/{task_id}/abort", dependencies=[Depends(require_bearer)])
    async def abort_task(request: Request, task_id: str) -> dict[str, str]:
        reg: MemoryTaskRegistry = request.app.state.registry
        status = await reg.abort(task_id)
        return {"status": status}

    @app.post("/v1/tasks/{task_id}/message", dependencies=[Depends(require_bearer)])
    async def task_message(request: Request, task_id: str, body: TaskMessageRequest) -> dict[str, bool]:
        reg: MemoryTaskRegistry = request.app.state.registry
        if task_id not in reg.tasks:
            raise HTTPException(status_code=404, detail="task not found")
        await reg.enqueue_message(task_id, body.text)
        return {"ok": True}

    @app.post("/v1/actions/approve", dependencies=[Depends(require_bearer)])
    async def approve(request: Request, body: ApproveRequest) -> dict[str, bool]:
        reg: MemoryTaskRegistry = request.app.state.registry
        tid = body.approval_id
        if tid not in reg.tasks:
            raise HTTPException(status_code=404, detail="unknown task for approval_id")
        reg.approve(tid)
        return {"ok": True}

    @app.post("/v1/settings/validate", dependencies=[Depends(require_bearer)])
    async def validate_settings(request: Request, body: ValidateSettingsRequest) -> ValidateSettingsResponse:
        t0 = time.perf_counter()
        model_client = request.app.state.model_client
        await model_client.health_check()
        ms = int((time.perf_counter() - t0) * 1000)
        return ValidateSettingsResponse(ok=True, latency_ms=max(ms, 1))

    @app.post("/v1/logs/ui", dependencies=[Depends(require_bearer)])
    async def ui_logs(request: Request, body: UILogRequest) -> UILogResponse:
        entry = {"event": body.event, "fields": redact(body.fields), "correlation_id": get_correlation_id()}
        request.app.state.ui_logs.append(entry)
        return UILogResponse(ok=True)

    @app.get("/v1/chat/stream", response_model=None)
    async def chat_stream(
        request: Request,
        task_id: str,
        token: str | None = None,
        authorization: str | None = None,
    ):
        settings = get_settings(request)
        raw = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
        if not raw or not hmac.compare_digest(raw, settings.token):
            return JSONResponse(status_code=401, content={"detail": "unauthorized"})

        reg: MemoryTaskRegistry = request.app.state.registry
        if task_id not in reg.tasks:
            return JSONResponse(status_code=404, content={"detail": "task not found"})

        async def gen() -> AsyncIterator[bytes]:
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
            done_payload = json.dumps({"task_id": task_id, "status": "success"})
            yield _sse("done", done_payload)

        return StreamingResponse(gen(), media_type="text/event-stream")

    if settings.include_contract_routes:

        @app.post("/v1/contract/raise-action-validation", dependencies=[Depends(require_bearer)])
        async def raise_action_validation() -> None:
            raise ActionValidationError("boom")

    return app
