"""FastAPI ASGI app factory (+ lifespan hooks)."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from mayra_orchestrator.api.approval_registry import ApprovalRegistry
from mayra_orchestrator.api.correlation import correlation_id_var, new_correlation_id
from mayra_orchestrator.api.exceptions import install_exception_handlers
from mayra_orchestrator.api.memory_tasks import MemoryTaskRegistry
from mayra_orchestrator.api.routes.sessions import SessionBucket
from mayra_orchestrator.api.routes.wire import wire_routes
from mayra_orchestrator.browser.adapter import AgentBrowserAdapter
from mayra_orchestrator.providers.factory import build_provider_runtime
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
    session_browser: AgentBrowserAdapter = app.state.session_browser
    # Doctor can take a long time or spawn a browser; do not block ASGI startup or /healthz.
    app.state.agent_browser_diagnostic = {
        "pending": True,
        "message": "agent-browser doctor is running in the background (this may open a browser once).",
    }

    async def _doctor_task() -> None:
        try:
            app.state.agent_browser_diagnostic = await session_browser.run_doctor()
        except Exception as e:  # noqa: BLE001
            app.state.agent_browser_diagnostic = {
                "ok": False,
                "missing": False,
                "message": str(e),
            }

    asyncio.create_task(_doctor_task())
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
    sb_close = getattr(app.state.session_browser, "close_all", None)
    if sb_close is not None:
        await sb_close()


def create_app(settings: AppSettings | None = None) -> FastAPI:
    settings = settings or AppSettings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    app = FastAPI(title="Mayra Orchestrator", lifespan=lifespan)
    app.state.settings = settings
    registry = MemoryTaskRegistry()
    app.state.registry = registry
    app.state.approval_registry = ApprovalRegistry(registry)
    app.state.ui_logs = []
    app.state.browser = _StubBrowser()
    app.state.model_client = _DefaultModelClient()
    provider_runtime = build_provider_runtime(settings)
    app.state.providers = provider_runtime.clients
    app.state.rate_limit = provider_runtime.rate_limit
    app.state.semaphore = provider_runtime.semaphore
    
    # Bundle all available clients into the fallback mechanism
    if provider_runtime.clients:
        from mayra_orchestrator.providers.fallback import FallbackModelClient
        # Order them based on some arbitrary preference if multiple exist, e.g. Gemini -> Groq -> Cloudflare
        ordered = []
        for p in ["gemini", "groq", "cloudflare"]:
            if p in provider_runtime.clients:
                ordered.append(provider_runtime.clients[p])
        for p, client in provider_runtime.clients.items():
            if p not in ["gemini", "groq", "cloudflare"]:
                ordered.append(client)
                
        app.state.model_client = FallbackModelClient(ordered)
        
    app.state.browser_sessions = SessionBucket()
    app.state.session_browser = AgentBrowserAdapter(data_dir=settings.data_dir)

    install_exception_handlers(app)

    # WebView (localhost:3000) → orchestrator (127.0.0.1:*) is cross-origin; browser preflights POST + Authorization.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_origins=["tauri://localhost", "https://tauri.localhost"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def _host_and_correlation(request: Request, call_next):
        correlation_id_var.set(new_correlation_id())
        host = request.headers.get("host", "")
        if not (host.startswith("127.0.0.1:") or host.startswith("localhost:")):
            return JSONResponse(status_code=400, content={"detail": "bad host"})
        return await call_next(request)

    wire_routes(app, settings)
    return app
