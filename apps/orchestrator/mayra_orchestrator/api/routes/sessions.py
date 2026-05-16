"""`/v1/sessions/*` — CDP attach + snapshot (Phase 3)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.api.schemas import (
    SessionConnectRequest,
    SessionConnectResponse,
    SessionSnapshotResponse,
    SessionSummary,
)
from mayra_orchestrator.browser.adapter import AgentBrowserAdapter, snapshot_node_count
from mayra_orchestrator.browser.preview_image import save_png_as_preview_webp
from mayra_orchestrator.errors import BrowserError

router = APIRouter(prefix="/v1/sessions", tags=["sessions"], dependencies=[Depends(require_bearer)])


@dataclass
class LiveBrowserSession:
    session_id: str
    cdp_port: int
    step: int = 0
    last_node_count: int = 0
    last_snapshot: dict | None = None


@dataclass
class SessionBucket:
    """In-memory sessions for this orchestrator process (spec §A.5 sidecar lifetime)."""

    by_id: dict[str, LiveBrowserSession] = field(default_factory=dict)


def get_session_bucket(request: Request) -> SessionBucket:
    return request.app.state.browser_sessions


def get_session_browser(request: Request) -> AgentBrowserAdapter:
    return request.app.state.session_browser


@router.get("", response_model=list[SessionSummary])
async def list_sessions(
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> list[SessionSummary]:
    return [
        SessionSummary(
            session_id=s.session_id,
            cdp_port=s.cdp_port,
            last_node_count=s.last_node_count or None,
        )
        for s in bucket.by_id.values()
    ]


@router.post("/connect", response_model=SessionConnectResponse)
async def connect_session(
    body: SessionConnectRequest,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionConnectResponse:
    sid = str(uuid.uuid4())
    await browser.open(body.port, sid)
    bucket.by_id[sid] = LiveBrowserSession(session_id=sid, cdp_port=body.port)
    return SessionConnectResponse(session_id=sid)


@router.post("/{session_id}/snapshot", response_model=SessionSnapshotResponse)
async def snapshot_session(
    session_id: str,
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionSnapshotResponse:
    rec = bucket.by_id.get(session_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="session not found")

    try:
        snap = await browser.snapshot(session_id)
        png = await browser.screenshot_png_bytes(session_id)
    except BrowserError:
        try:
            await browser.open(rec.cdp_port, session_id)
            snap = await browser.snapshot(session_id)
            png = await browser.screenshot_png_bytes(session_id)
        except BrowserError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    n = snapshot_node_count(snap)
    rec.step += 1
    rec.last_snapshot = snap
    rec.last_node_count = n

    settings = request.app.state.settings
    shot_dir = Path(settings.data_dir) / "screenshots" / session_id
    shot_path = shot_dir / f"{rec.step}-snapshot.webp"
    save_png_as_preview_webp(png, shot_path)

    return SessionSnapshotResponse(
        node_count=n,
        screenshot_path=str(shot_path.resolve()),
    )
