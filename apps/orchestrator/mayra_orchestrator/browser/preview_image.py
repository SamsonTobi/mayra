"""Local screenshot previews (Phase 3 / spec §C)."""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image


def save_png_as_preview_webp(
    png_bytes: bytes,
    dest: Path,
    *,
    max_side: int = 1280,
    quality: int = 75,
) -> None:
    """Resize to fit within max_side (keeping aspect); write lossy WebP."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(png_bytes)) as im:
        im = im.convert("RGBA")
        im.thumbnail((max_side, max_side))
        rgb = Image.new("RGB", im.size, (255, 255, 255))
        alpha = im.split()[3] if im.mode == "RGBA" else None
        rgb.paste(im, mask=alpha)
        rgb.save(dest, "WEBP", quality=quality)
