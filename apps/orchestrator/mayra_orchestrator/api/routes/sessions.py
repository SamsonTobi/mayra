"""`/v1/sessions/*` — CDP attach + snapshot (Phase 3)."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from pydantic import BaseModel

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.api.schemas import (
    SessionConnectRequest,
    SessionConnectResponse,
    SessionSnapshotResponse,
    SessionSummary,
    ConnectAndVerifyResponse,
)
from mayra_orchestrator.browser.adapter import (
    AgentBrowserAdapter,
    snapshot_node_count,
    _probe_cdp_endpoint,
    _cdp_call,
)
from mayra_orchestrator.browser.preview_image import save_png_as_preview_webp
from mayra_orchestrator.errors import BrowserError

log = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/sessions", tags=["sessions"], dependencies=[Depends(require_bearer)])


@dataclass
class LiveBrowserSession:
    session_id: str
    cdp_port: int
    step: int = 0
    last_node_count: int = 0
    last_snapshot: dict | None = None
    cached_snapshot: dict | None = None
    cached_screenshot_png: bytes | None = None
    cached_at: float = 0.0


@dataclass
class SessionBucket:
    """In-memory sessions for this orchestrator process (spec §A.5 sidecar lifetime)."""

    by_id: dict[str, LiveBrowserSession] = field(default_factory=dict)


def get_session_bucket(request: Request) -> SessionBucket:
    return request.app.state.browser_sessions


def get_session_browser(request: Request) -> AgentBrowserAdapter:
    return request.app.state.session_browser


def _drop_session(
    bucket: SessionBucket,
    browser: AgentBrowserAdapter,
    session_id: str,
) -> None:
    log.info("[sessions] dropping session %s from bucket", session_id[:8])
    bucket.by_id.pop(session_id, None)
    forget_session = getattr(browser, "forget_session", None)
    if callable(forget_session):
        forget_session(session_id)


@router.get("", response_model=list[SessionSummary])
async def list_sessions(
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> list[SessionSummary]:
    ids = [s.session_id[:8] for s in bucket.by_id.values()]
    log.info("[sessions] list_sessions: %d sessions %s", len(ids), ids)
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
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionConnectResponse:
    sid = str(uuid.uuid4())
    settings = request.app.state.settings
    # In cloud mode, launch Chromium if no port was supplied.
    # In local mode, the caller must supply a port (existing behavior).
    cdp_port = body.port
    if cdp_port is None:
        if settings.mode != "cloud":
            raise HTTPException(status_code=422, detail="port is required in local mode")
        launcher = getattr(request.app.state, "cloud_launcher", None)
        if launcher is None:
            raise HTTPException(status_code=503, detail="cloud launcher not configured")
        cdp_port = await launcher.launch()
    log.info("[sessions] connect_session: port=%d new_sid=%s", cdp_port, sid[:8])
    t0 = time.monotonic()
    await browser.open(cdp_port, sid)
    elapsed = time.monotonic() - t0
    log.info("[sessions] connect_session: open ok for %s (%.2fs)", sid[:8], elapsed)
    bucket.by_id[sid] = LiveBrowserSession(session_id=sid, cdp_port=cdp_port)
    return SessionConnectResponse(session_id=sid)


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> JSONResponse:
    """Remove a session from the in-memory registry (no browser interaction)."""
    log.info("[sessions] delete_session: %s", session_id[:8])
    _drop_session(bucket, browser, session_id)
    return JSONResponse(status_code=200, content={"deleted": session_id})

@router.post("/connect-and-verify", response_model=ConnectAndVerifyResponse)
async def connect_and_verify_session(
    body: SessionConnectRequest,
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> ConnectAndVerifyResponse:
    """Atomic connect + verify in one call: probe, register, DOM count, screenshot.

    Replaces the 2-hop connectSession → verifySession flow.
    """
    sid = str(uuid.uuid4())
    t0 = time.monotonic()
    log.info("[sessions] connect_and_verify: port=%d new_sid=%s", body.port, sid[:8])

    try:
        node_count, png = await browser.connect_and_verify(body.port, sid)
    except BrowserError as exc:
        elapsed = time.monotonic() - t0
        log.warning(
            "[sessions] connect_and_verify: FAILED port=%d (%.2fs): %s",
            body.port, elapsed, exc,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Browser on port {body.port} is not responding: {exc}",
        )

    bucket.by_id[sid] = LiveBrowserSession(
        session_id=sid, cdp_port=body.port, last_node_count=node_count,
    )

    settings = request.app.state.settings
    shot_dir = Path(settings.data_dir) / "screenshots" / sid
    shot_path = shot_dir / "1-verify.webp"
    save_png_as_preview_webp(png, shot_path)

    elapsed = time.monotonic() - t0
    log.info(
        "[sessions] connect_and_verify: DONE sid=%s nodes=%d (%.2fs)",
        sid[:8], node_count, elapsed,
    )

    return ConnectAndVerifyResponse(
        session_id=sid,
        node_count=node_count,
        screenshot_path=str(shot_path),
        screenshot_url=settings.screenshot_url_for(shot_path),
    )


@router.post("/{session_id}/verify", response_model=SessionSnapshotResponse)
async def verify_session(
    session_id: str,
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionSnapshotResponse:
    """Lightweight liveness check using direct CDP — no agent-browser subprocess.

    Much faster than /snapshot (~2-5s vs 15-60s). Use this for startup verification.
    """
    rec = bucket.by_id.get(session_id)
    if rec is None:
        log.warning("[sessions] verify_session: session %s not found in bucket", session_id[:8])
        raise HTTPException(status_code=404, detail="session not found")

    t0 = time.monotonic()
    log.info("[sessions] verify_session: session=%s cdp_port=%d — lightweight CDP verify", session_id[:8], rec.cdp_port)

    try:
        node_count, png = await browser.verify_session_lightweight(session_id)
    except BrowserError as exc:
        elapsed = time.monotonic() - t0
        log.warning(
            "[sessions] verify_session: FAILED for %s (%.2fs): %s — dropping session",
            session_id[:8], elapsed, exc,
        )
        _drop_session(bucket, browser, session_id)
        return JSONResponse(
            status_code=410,
            content={
                "code": "session_disconnected",
                "message": "Browser session disconnected; reconnect required.",
                "detail": str(exc),
            },
        )

    rec.step += 1
    rec.last_node_count = node_count

    settings = request.app.state.settings
    shot_dir = Path(settings.data_dir) / "screenshots" / session_id
    shot_path = shot_dir / f"{rec.step}-verify.webp"
    save_png_as_preview_webp(png, shot_path)

    elapsed = time.monotonic() - t0
    log.info(
        "[sessions] verify_session: DONE session=%s nodes=%d (%.2fs)",
        session_id[:8], node_count, elapsed,
    )

    return SessionSnapshotResponse(
        node_count=node_count,
        screenshot_path=str(shot_path),
        screenshot_url=settings.screenshot_url_for(shot_path),
    )


@router.post("/{session_id}/snapshot", response_model=SessionSnapshotResponse)
async def snapshot_session(
    session_id: str,
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionSnapshotResponse:
    rec = bucket.by_id.get(session_id)
    if rec is None:
        log.warning("[sessions] snapshot_session: session %s not found in bucket", session_id[:8])
        raise HTTPException(status_code=404, detail="session not found")

    t0 = time.monotonic()
    log.info(
        "[sessions] snapshot_session: session=%s cdp_port=%d — doing quick CDP liveness check first",
        session_id[:8],
        rec.cdp_port,
    )

    # Fast-fail: probe the CDP port before running the expensive agent-browser subprocess.
    # This avoids the 60-second subprocess timeout when the browser is simply gone.
    try:
        await _probe_cdp_endpoint(rec.cdp_port)
        log.info("[sessions] snapshot_session: CDP liveness OK on port %d (%.2fs)", rec.cdp_port, time.monotonic() - t0)
    except BrowserError as exc:
        elapsed = time.monotonic() - t0
        log.warning(
            "[sessions] snapshot_session: CDP liveness FAILED for %s on port %d (%.2fs): %s",
            session_id[:8],
            rec.cdp_port,
            elapsed,
            exc,
        )
        _drop_session(bucket, browser, session_id)
        return JSONResponse(
            status_code=410,
            content={
                "code": "session_disconnected",
                "message": "Browser session disconnected; reconnect required.",
                "detail": str(exc),
            },
        )

    # Check memory cache first (Pattern 3: Shared Memory Snapshot Cache)
    if (
        rec.cached_snapshot is not None
        and rec.cached_screenshot_png is not None
        and (time.monotonic() - rec.cached_at) < 0.150
    ):
        log.info("[sessions] snapshot_session: serving from shared memory cache for %s (hit)", session_id[:8])
        snap = rec.cached_snapshot
        png = rec.cached_screenshot_png
    else:
        try:
            log.info("[sessions] snapshot_session: running agent-browser snapshot + screenshot in parallel for %s", session_id[:8])
            snap, png = await asyncio.gather(
                browser.snapshot(session_id),
                browser.screenshot_png_bytes(session_id)
            )
            log.info("[sessions] snapshot_session: snapshot+screenshot OK for %s (%.2fs)", session_id[:8], time.monotonic() - t0)
            
            # Update cache
            rec.cached_snapshot = snap
            rec.cached_screenshot_png = png
            rec.cached_at = time.monotonic()
        except BrowserError as first_err:
            log.warning(
                "[sessions] snapshot_session: first snapshot attempt failed for %s (%.2fs): %s",
                session_id[:8],
                time.monotonic() - t0,
                first_err,
            )
            try:
                log.info("[sessions] snapshot_session: re-opening CDP port %d for %s", rec.cdp_port, session_id[:8])
                await browser.open(rec.cdp_port, session_id)
                snap, png = await asyncio.gather(
                    browser.snapshot(session_id),
                    browser.screenshot_png_bytes(session_id)
                )
                log.info("[sessions] snapshot_session: retry snapshot OK for %s (%.2fs)", session_id[:8], time.monotonic() - t0)
                
                # Update cache
                rec.cached_snapshot = snap
                rec.cached_screenshot_png = png
                rec.cached_at = time.monotonic()
            except BrowserError as exc:
                elapsed = time.monotonic() - t0
                log.error(
                    "[sessions] snapshot_session: retry FAILED for %s (%.2fs): %s — dropping session",
                    session_id[:8],
                    elapsed,
                    exc,
                )
                _drop_session(bucket, browser, session_id)
                return JSONResponse(
                    status_code=410,
                    content={
                        "code": "session_disconnected",
                        "message": "Browser session disconnected; reconnect required.",
                        "detail": str(exc),
                    },
                )
    n = snapshot_node_count(snap)
    rec.step += 1
    rec.last_snapshot = snap
    rec.last_node_count = n

    settings = request.app.state.settings
    shot_dir = Path(settings.data_dir) / "screenshots" / session_id
    shot_path = shot_dir / f"{rec.step}-snapshot.webp"
    save_png_as_preview_webp(png, shot_path)

    elapsed = time.monotonic() - t0
    log.info(
        "[sessions] snapshot_session: DONE session=%s nodes=%d path=%s (%.2fs)",
        session_id[:8],
        n,
        shot_path,
        elapsed,
    )

    return SessionSnapshotResponse(
        node_count=n,
        screenshot_path=str(shot_path),
        screenshot_url=settings.screenshot_url_for(shot_path),
    )


class SessionInteractRequest(BaseModel):
    action: str  # "click", "type", "scroll", "navigate"
    x: int | None = None
    y: int | None = None
    text: str | None = None


@router.post("/{session_id}/interact")
async def interact_session(
    session_id: str,
    body: SessionInteractRequest,
    request: Request,
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
):
    rec = bucket.by_id.get(session_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="session not found")
    
    port = rec.cdp_port
    action = body.action
    
    try:
        if action == "click":
            if body.x is None or body.y is None:
                raise HTTPException(status_code=422, detail="click requires x and y coordinates")
            await _cdp_call(port, "Input.dispatchMouseEvent", {
                "type": "mousePressed",
                "x": body.x,
                "y": body.y,
                "button": "left",
                "clickCount": 1
            })
            await _cdp_call(port, "Input.dispatchMouseEvent", {
                "type": "mouseReleased",
                "x": body.x,
                "y": body.y,
                "button": "left",
                "clickCount": 1
            })
        elif action == "type":
            if body.text is None:
                raise HTTPException(status_code=422, detail="type requires text value")
            await _cdp_call(port, "Input.insertText", {
                "text": body.text
            })
        elif action == "scroll":
            direction = body.text or "down"
            delta = 400 if direction == "down" else -400
            js = f"window.scrollBy({{top: {delta}, behavior: 'smooth'}})"
            await _cdp_call(port, "Runtime.evaluate", {
                "expression": js,
                "userGesture": True
            })
        elif action == "navigate":
            if not body.text:
                raise HTTPException(status_code=422, detail="navigate requires URL text")
            await _cdp_call(port, "Page.navigate", {
                "url": body.text
            })
        
        # Take a fresh screenshot and update session state
        png = await browser.screenshot_png_bytes(session_id)
        rec.step += 1
        settings = request.app.state.settings
        shot_dir = Path(settings.data_dir) / "screenshots" / session_id
        shot_path = shot_dir / f"{rec.step}-snapshot.webp"
        save_png_as_preview_webp(png, shot_path)
        
        return {
            "success": True,
            "screenshot_path": str(shot_path),
            "screenshot_url": settings.screenshot_url_for(shot_path),
        }
    except Exception as e:
        log.error("[sessions] interact failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/annotated-screenshot", response_model=SessionSnapshotResponse)
async def annotated_screenshot(
    session_id: str,
    request: Request,
    browser: Annotated[AgentBrowserAdapter, Depends(get_session_browser)],
    bucket: Annotated[SessionBucket, Depends(get_session_bucket)],
) -> SessionSnapshotResponse:
    """Capture a SOM (Set-of-Marks) annotated screenshot using agent-browser.

    Runs `agent-browser screenshot --annotate` which draws numbered
    overlays on top of interactive elements.  The @e1/@e2 labels match
    the accessibility snapshot refs — useful for visual-grounded debugging.
    """
    rec = bucket.by_id.get(session_id)
    if rec is None:
        log.warning("[sessions] annotated_screenshot: session %s not found in bucket", session_id[:8])
        raise HTTPException(status_code=404, detail="session not found")

    t0 = time.monotonic()
    log.info(
        "[sessions] annotated_screenshot: session=%s cdp_port=%d — fast CDP liveness check first",
        session_id[:8],
        rec.cdp_port,
    )

    # Fast-fail CDP probe before running the expensive agent-browser subprocess.
    try:
        await _probe_cdp_endpoint(rec.cdp_port)
        log.info("[sessions] annotated_screenshot: CDP liveness OK on port %d (%.2fs)", rec.cdp_port, time.monotonic() - t0)
    except BrowserError as exc:
        elapsed = time.monotonic() - t0
        log.warning(
            "[sessions] annotated_screenshot: CDP liveness FAILED for %s on port %d (%.2fs): %s",
            session_id[:8],
            rec.cdp_port,
            elapsed,
            exc,
        )
        _drop_session(bucket, browser, session_id)
        return JSONResponse(
            status_code=410,
            content={
                "code": "session_disconnected",
                "message": "Browser session disconnected; reconnect required.",
                "detail": str(exc),
            },
        )

    # Run snapshot + annotated screenshot in parallel.
    # The snapshot gives us node_count; the annotated screenshot is the SOM overlay.
    try:
        log.info("[sessions] annotated_screenshot: running snapshot + annotated screenshot for %s", session_id[:8])
        snap, (annotated_png, _mime) = await asyncio.gather(
            browser.snapshot(session_id),
            browser.screenshot_annotated(session_id),
        )
        log.info("[sessions] annotated_screenshot: OK for %s (%.2fs)", session_id[:8], time.monotonic() - t0)
    except BrowserError as exc:
        elapsed = time.monotonic() - t0
        log.error(
            "[sessions] annotated_screenshot: FAILED for %s (%.2fs): %s",
            session_id[:8],
            elapsed,
            exc,
        )
        return JSONResponse(
            status_code=502,
            content={
                "code": "annotated_screenshot_failed",
                "message": "Failed to capture annotated screenshot.",
                "detail": str(exc),
            },
        )

    n = snapshot_node_count(snap)
    rec.step += 1
    rec.last_snapshot = snap
    rec.last_node_count = n

    settings = request.app.state.settings
    shot_dir = Path(settings.data_dir) / "screenshots" / session_id
    shot_path = shot_dir / f"{rec.step}-annotated.webp"
    save_png_as_preview_webp(annotated_png, shot_path)

    elapsed = time.monotonic() - t0
    log.info(
        "[sessions] annotated_screenshot: DONE session=%s nodes=%d path=%s (%.2fs)",
        session_id[:8],
        n,
        shot_path,
        elapsed,
    )

    return SessionSnapshotResponse(
        node_count=n,
        screenshot_path=str(shot_path),
        screenshot_url=settings.screenshot_url_for(shot_path),
    )

