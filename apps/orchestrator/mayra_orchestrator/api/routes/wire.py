"""Mount routers on the FastAPI app."""

from __future__ import annotations

from fastapi import FastAPI

from mayra_orchestrator.settings import AppSettings


def wire_routes(app: FastAPI, settings: AppSettings) -> None:
    from mayra_orchestrator.api.routes import (
        actions,
        chat_stream,
        contract_misc,
        health,
        settings_validate,
        tasks,
        ui_logs,
    )

    app.include_router(health.router)
    app.include_router(tasks.router)
    app.include_router(actions.router)
    app.include_router(settings_validate.router)
    app.include_router(ui_logs.router)
    app.include_router(chat_stream.router)
    if settings.include_contract_routes:
        app.include_router(contract_misc.router)
