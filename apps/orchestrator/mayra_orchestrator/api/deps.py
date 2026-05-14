"""FastAPI dependencies."""
from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Query, Request

from mayra_orchestrator.settings import AppSettings


def get_settings(request: Request) -> AppSettings:
    return request.app.state.settings


def require_bearer(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    token: Annotated[str | None, Query()] = None,
) -> None:
    settings = get_settings(request)
    raw = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
    if not raw or not hmac.compare_digest(raw, settings.token):
        raise HTTPException(status_code=401, detail="unauthorized")
