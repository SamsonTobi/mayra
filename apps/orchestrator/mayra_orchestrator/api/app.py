"""FastAPI ASGI app factory (+ lifespan hooks)."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from mayra_orchestrator.api.approval_registry import ApprovalRegistry
from mayra_orchestrator.api.correlation import correlation_id_var, new_correlation_id
from mayra_orchestrator.api.exceptions import install_exception_handlers
from mayra_orchestrator.api.memory_tasks import MemoryTaskRegistry
from mayra_orchestrator.api.routes.wire import wire_routes
from mayra_orchestrator.settings import AppSettings


class _StubBrowser:
    async def snapshot(self, task_id: str) -> dict:
        _ = task_id
        return {"nodes": [{"ref": "@e1", "role": "button", "name": "Ok"}]}

    async def screenshot_annotated(self, task_id: str) -> tuple[bytes, str]:
        _ = task_id
        return (b"", "image/png")

    async def execute(self, task_id: str, action: object, cmds: list[str]) -> None:
        _ = (task_id, action, cmds)

    async def close_all(self) -> None:
        return None


_DEFAULT_REPLY = (
    "ok\n===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"stub"}'
)


class _DefaultModelClient:
    provider = "stub"
    model = "stub"

    async def health_check(self) -> float:
        return 1.0

    async def complete_streaming(
        self,
        prompt: object,
        *,
        temperature: float,
        on_token,
    ) -> str:
        _ = (prompt, temperature)
        raw = _DEFAULT_REPLY
        await on_token(raw)
        return raw

    async def aclose(self) -> None:
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    reg: MemoryTaskRegistry = app.state.registry
    await reg.shutdown_all()
    app.state.approval_registry.clear_all_pending()
    mc = app.state.model_client
    aclose = getattr(mc, "aclose", None)
    if aclose is not None:
        await aclose()
    browser = getattr(app.state, "browser", None)
    close_all = getattr(browser, "close_all", None)
    if close_all is not None:
        await close_all()


def create_app(settings: AppSettings | None = None) -> FastAPI:
    settings = settings or AppSettings()
    app = FastAPI(title="Mayra Orchestrator", lifespan=lifespan)
    app.state.settings = settings
    registry = MemoryTaskRegistry()
    app.state.registry = registry
    app.state.approval_registry = ApprovalRegistry(registry)
    app.state.ui_logs = []
    app.state.browser = _StubBrowser()
    app.state.model_client = _DefaultModelClient()

    install_exception_handlers(app)

    @app.middleware("http")
    async def _host_and_correlation(request: Request, call_next):
        correlation_id_var.set(new_correlation_id())
        host = request.headers.get("host", "")
        if not (host.startswith("127.0.0.1:") or host.startswith("localhost:")):
            return JSONResponse(status_code=400, content={"detail": "bad host"})
        return await call_next(request)

    wire_routes(app, settings)
    return app
