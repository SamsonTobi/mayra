"""`/v1/auth/login` — shared-password gate for cloud mode."""

from __future__ import annotations

import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from mayra_orchestrator.api.deps import get_settings
from mayra_orchestrator.api.session_store import SessionStore, verify_password
from mayra_orchestrator.settings import AppSettings

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    password: str = Field(min_length=1, max_length=1024)


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    token: str
    user_id: str
    expires_at: str


# Simple in-memory rate limiter: {ip: [timestamps]}
_login_attempts: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 60.0  # 60 seconds
_RATE_LIMIT_MAX = 5  # 5 attempts per window


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    attempts = _login_attempts.get(ip, [])
    # Keep only attempts within the window
    recent = [t for t in attempts if now - t < _RATE_LIMIT_WINDOW]
    if len(recent) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in a minute.",
        )
    _login_attempts[ip] = recent


def _record_attempt(ip: str) -> None:
    now = time.time()
    attempts = _login_attempts.get(ip, [])
    attempts.append(now)
    # Trim to last 50 entries to prevent unbounded growth
    _login_attempts[ip] = attempts[-50:]


def get_session_store(request: Request) -> SessionStore:
    store = getattr(request.app.state, "session_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="password auth not configured")
    return store


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    settings: Annotated[AppSettings, Depends(get_settings)],
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> LoginResponse:
    if settings.auth_mode != "password" or not settings.shared_password:
        raise HTTPException(status_code=403, detail="password auth not enabled")

    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    _record_attempt(client_ip)

    if not verify_password(body.password, settings.shared_password):
        raise HTTPException(status_code=401, detail="invalid password")

    info = store.create_session()
    from datetime import datetime, timezone
    expires_dt = datetime.fromtimestamp(info.expires_at, tz=timezone.utc)
    return LoginResponse(
        token=info.token,
        user_id=info.user_id,
        expires_at=expires_dt.isoformat(),
    )
