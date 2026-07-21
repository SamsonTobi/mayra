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

    # The prompt should mention wait as an action and tell the model not to
    # output non-existent actions like speak/answer/noop.
    assert "wait" in bundle.system_text.lower()
    assert "done" in bundle.system_text.lower()
    # Should mention allowed action values
    assert "click" in bundle.system_text.lower()


def test_prompt_tells_model_how_to_signal_done(snapshot_payload):
    """The system prompt must teach the model the 'done' action so it can
    signal task completion instead of looping until budget exhaustion."""
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="finish the task",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"",
        screenshot_mime="image/png",
        allowed_domains=["example.com"],
        step=1,
        max_steps=3,
    )

    assert "done" in bundle.system_text.lower()
    # The prompt should explain when to use done
    assert "task is complete" in bundle.system_text.lower() or "task is achieved" in bundle.system_text.lower()


def test_prompt_includes_current_page_url(snapshot_payload):
    """The prompt should include the current page URL so the model knows
    if it's on about:blank or a real page."""
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="go to google",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"",
        screenshot_mime="image/png",
        allowed_domains=[],
        step=1,
        max_steps=3,
        current_url="https://example.com",
    )
    assert "CURRENT PAGE URL" in bundle.user_text
    assert "https://example.com" in bundle.user_text


def test_prompt_conversational_guidance(snapshot_payload):
    """The prompt should guide the model on how to handle conversational messages."""
    snap = Snapshot.from_json(snapshot_payload())
    bundle = build_prompt(
        goal="hi",
        history=[],
        snapshot=snap,
        screenshot_bytes=b"",
        screenshot_mime="image/png",
        allowed_domains=[],
        step=1,
        max_steps=3,
    )
    # Should mention greetings or conversational handling
    assert "conversational" in bundle.system_text.lower() or "greeting" in bundle.system_text.lower()
    # Should mention personality / friendliness
    assert "friendly" in bundle.system_text.lower() or "warm" in bundle.system_text.lower()


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
