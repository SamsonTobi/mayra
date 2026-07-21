"""Mount routers on the FastAPI app."""

from __future__ import annotations

from fastapi import FastAPI

from mayra_orchestrator.settings import AppSettings


def wire_routes(app: FastAPI, settings: AppSettings) -> None:
    from mayra_orchestrator.api.routes import (
        actions,
        auth,
        chat_stream,
        contract_misc,
        health,
        models,
        screenshots,
        sessions,
        settings_validate,
        tasks,
        ui_logs,
        shutdown,
    )

    app.include_router(health.router)
    app.include_router(sessions.router)
    app.include_router(tasks.router)
    app.include_router(actions.router)
    app.include_router(settings_validate.router)
    app.include_router(models.router)
    app.include_router(ui_logs.router)
    app.include_router(chat_stream.router)
    app.include_router(shutdown.router)
    # Cloud-mode routers
    app.include_router(auth.router)
    if settings.screenshot_base_url:
        app.include_router(screenshots.router)
    if settings.include_contract_routes:
        app.include_router(contract_misc.router)
