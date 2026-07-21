"""`/v1/screenshots/{path}` — HTTP screenshot serving for cloud mode.

In local mode, screenshots are served via the Tauri asset protocol.
In cloud mode, the UI needs an HTTP endpoint to load screenshot bytes.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from mayra_orchestrator.api.deps import require_bearer
from mayra_orchestrator.settings import AppSettings

router = APIRouter(
    prefix="/v1/screenshots",
    tags=["screenshots"],
    dependencies=[Depends(require_bearer)],
)


def _resolve_screenshot_path(path: str, settings: AppSettings) -> Path:
    """Resolve and validate a screenshot path, preventing path traversal.

    Uses os.path.normpath instead of Path.resolve() to avoid breaking on
    symlinked mount points (e.g. Modal volumes).
    """
    import os
    root = str(settings.screenshot_dir) if settings.screenshot_dir else str(settings.data_dir / "screenshots")
    # Join and normalize (resolves .. but not symlinks)
    target = os.path.normpath(os.path.join(root, path))
    # Check that target is under root using relpath (cross-platform)
    try:
        rel = os.path.relpath(target, root)
    except ValueError:
        # Different drives on Windows
        raise HTTPException(status_code=403, detail="path outside screenshots root")
    if rel.startswith(".."):
        raise HTTPException(status_code=403, detail="path outside screenshots root")
    if not os.path.isfile(target):
        raise HTTPException(status_code=404, detail="screenshot not found")
    return Path(target)


@router.get("/{screenshot_path:path}")
async def serve_screenshot(
    screenshot_path: str,
    request: Request,
) -> FileResponse:
    settings: AppSettings = request.app.state.settings
    if not settings.screenshot_base_url:
        raise HTTPException(status_code=404, detail="screenshot serving not enabled")
    target = _resolve_screenshot_path(screenshot_path, settings)
    # WebP is the format used by save_png_as_preview_webp
    media_type = "image/webp" if target.suffix.lower() == ".webp" else "application/octet-stream"
    return FileResponse(str(target), media_type=media_type)
