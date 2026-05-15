"""Prompt builder.

Drives `mayra_orchestrator.prompts.templates.build_prompt`. The builder is a
pure function: takes goal, history, snapshot, screenshot bytes, allowed
domains, step, max_steps. Returns a `PromptBundle` (system text, user text,
image bytes, image mime). Page-derived content MUST be wrapped in
`<content-boundaries>` so the model treats it as untrusted data.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.prompts.templates import build_prompt, build_repair_prompt
from mayra_orchestrator.snapshot import Snapshot


pytestmark = pytest.mark.unit


def test_prompt_contains_goal_and_a11y_tree_under_boundaries(snapshot_payload, node):
    snap = Snapshot.from_json(snapshot_payload(node("@e1", role="button", name="Login")))
    bundle = build_prompt(
        goal="Download my transcript",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"\x89PNGFAKE",
        screenshot_mime="image/webp",
        allowed_domains=["example.com"],
        step=1,
        max_steps=30,
    )

    assert "Download my transcript" in bundle.user_text
    assert "@e1" in bundle.user_text
    assert "<content-boundaries>" in bundle.user_text
    assert "</content-boundaries>" in bundle.user_text

    start = bundle.user_text.index("<content-boundaries>")
    end = bundle.user_text.index("</content-boundaries>")
    assert start < end
    assert "@e1" in bundle.user_text[start:end]


def test_prompt_attaches_screenshot_bytes_and_mime(snapshot_payload):
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="x",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"WEBPBYTES",
        screenshot_mime="image/webp",
        allowed_domains=["example.com"],
        step=1,
        max_steps=30,
    )

    assert bundle.image_bytes == b"WEBPBYTES"
    assert bundle.image_mime == "image/webp"


def test_prompt_step_and_budget_are_visible(snapshot_payload):
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="x",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"",
        screenshot_mime="image/webp",
        allowed_domains=["example.com"],
        step=7,
        max_steps=30,
    )

    assert "7" in bundle.user_text
    assert "30" in bundle.user_text


def test_prompt_tells_model_how_to_wait_without_browser_action(snapshot_payload):
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="just say hi",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"",
        screenshot_mime="image/png",
        allowed_domains=["example.com"],
        step=1,
        max_steps=3,
    )

    assert "Never output speak" in bundle.system_text
    assert '"action":"wait"' in bundle.system_text
    assert '"target_ref":null' in bundle.system_text


def test_repair_prompt_keeps_image_and_includes_validation_error(snapshot_payload):
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="x",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"IMAGE",
        screenshot_mime="image/png",
        allowed_domains=["example.com"],
        step=1,
        max_steps=3,
    )
    repaired = build_repair_prompt(
        bundle,
        invalid_output='{"action":"speak"}',
        validation_error="missing required fields",
    )

    assert repaired.image_bytes == b"IMAGE"
    assert repaired.image_mime == "image/png"
    assert "missing required fields" in repaired.user_text
    assert '{"action":"speak"}' in repaired.user_text
