"""FastAPI dependencies."""
from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Query, Request

from mayra_orchestrator.settings import AppSettings


def get_settings(request: Request) -> AppSettings:
    return request.app.state.settings


def get_effective_owner_id(
    request: Request,
    settings: Annotated[AppSettings, Depends(get_settings)],
    x_mayra_owner_id: Annotated[str | None, Header(alias="X-Mayra-Owner-Id")] = None,
) -> str:
    # In password auth mode, user_id is set on request.state by require_bearer.
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return str(user_id)
    if x_mayra_owner_id is not None and x_mayra_owner_id.strip():
        return x_mayra_owner_id.strip()
    return settings.default_owner_id


def require_bearer(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    token: Annotated[str | None, Query()] = None,
) -> None:
    settings = get_settings(request)
    raw = (authorization or "").removeprefix("Bearer ").strip() or (token or "")
    if not raw:
        raise HTTPException(status_code=401, detail="unauthorized")
    if settings.auth_mode == "password":
        store = getattr(request.app.state, "session_store", None)
        if store is None:
            raise HTTPException(status_code=503, detail="password auth not configured")
        info = store.validate(raw)
        if info is None:
            raise HTTPException(status_code=401, detail="unauthorized")
        # Stash user_id for get_effective_owner_id
        request.state.user_id = info.user_id
    else:
        if not hmac.compare_digest(raw, settings.token):
            raise HTTPException(status_code=401, detail="unauthorized")
