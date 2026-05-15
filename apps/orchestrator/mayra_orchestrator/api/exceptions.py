"""Global exception handlers — stable JSON for MayraError subclasses."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from mayra_orchestrator.api.correlation import get_correlation_id
from mayra_orchestrator.errors import (
    ActionValidationError,
    BrowserError,
    MayraError,
    OwnerMismatchError,
)


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OwnerMismatchError)
    async def _owner_mismatch(_: Request, exc: OwnerMismatchError) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={
                "code": getattr(exc, "code", "owner_mismatch"),
                "message": str(exc),
                "correlation_id": get_correlation_id(),
            },
        )

    @app.exception_handler(BrowserError)
    async def _browser(_: Request, exc: BrowserError) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content={
                "code": getattr(exc, "code", "browser_error"),
                "message": str(exc),
                "correlation_id": get_correlation_id(),
            },
        )

    @app.exception_handler(ActionValidationError)
    async def _action_validation(_: Request, exc: ActionValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "code": getattr(exc, "code", "action_validation_error"),
                "message": str(exc),
                "correlation_id": get_correlation_id(),
            },
        )

    @app.exception_handler(MayraError)
    async def _mayra(_: Request, exc: MayraError) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "code": getattr(exc, "code", "mayra_error"),
                "message": str(exc),
                "correlation_id": get_correlation_id(),
            },
        )
