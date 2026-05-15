"""WebP preview writing."""
from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from mayra_orchestrator.browser.preview_image import save_png_as_preview_webp

pytestmark = pytest.mark.unit


def test_save_png_as_preview_webp(tmp_path: Path):
    png = Path(tmp_path / "one.png")
    Image.new("RGB", (2000, 1000), color=(12, 34, 56)).save(png, "PNG")
    raw = png.read_bytes()
    out = tmp_path / "p.webp"
    save_png_as_preview_webp(raw, out, max_side=1280, quality=75)
    assert out.is_file()
    with Image.open(out) as w:
        assert w.format == "WEBP"
        assert max(w.size) <= 1280
