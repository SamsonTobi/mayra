"""`redact()` and `redact_for_display()` — pure redactors.

Drives `mayra_orchestrator.redaction`. `redact()` runs over every log record
and every Supabase write; `redact_for_display()` masks the value of a `type`
action when the target looks like a password/OTP field.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.redaction import redact, redact_for_display
from mayra_orchestrator.snapshot import Snapshot


pytestmark = pytest.mark.unit


def test_redact_strips_sk_keys():
    out = redact("Authorization: Bearer sk-abcdef1234567890ABCDEFGHIJ")
    assert "sk-abcdef" not in out
    assert "[REDACTED]" in out


def test_redact_strips_supabase_secret_pattern():
    out = redact("token=sb_secret_abcdefghijklmnopqrstuvwxyz0123456789")
    assert "sb_secret_" not in out
    assert "[REDACTED]" in out


def test_redact_masks_sensitive_field_names():
    out = redact({"password": "hunter2", "username": "alice"})
    assert out["password"] == "[REDACTED]"
    assert out["username"] == "alice"


def test_redact_is_recursive():
    out = redact({"outer": {"api_key": "xai-1234567890abcdefghij", "ok": True}})
    assert out["outer"]["api_key"] == "[REDACTED]"
    assert out["outer"]["ok"] is True


def test_password_field_value_becomes_redacted_marker():
    """`redact_for_display` must mask the value when target_ref hints at a password field.

    The classifier is string-based on the target_ref alone so it works without a
    live snapshot (used when the orchestrator buffers actions for the action log).
    """
    a = Action(
        action="type",
        target_ref="role:textbox[name=password]",
        value="hunter2",
        risk="low",
        reason="fill login",
    )
    out = redact_for_display(a)
    assert out.value is not None
    assert out.value.startswith("[REDACTED")
    assert "hunter2" not in out.value


def test_snapshot_password_ref_value_becomes_redacted_marker(snapshot_payload, node):
    snap = Snapshot.from_json(
        snapshot_payload(node("@e2", role="textbox", name="Password", is_password_or_otp=True))
    )
    a = Action(
        action="type",
        target_ref="@e2",
        value="hunter2",
        risk="high",
        reason="fill login",
    )
    out = redact_for_display(a, snap)
    assert out.value == "[REDACTED:password_field]"


def test_redact_for_display_preserves_non_sensitive_type():
    a = Action(
        action="type",
        target_ref="@e3",
        value="toronto weather",
        risk="low",
        reason="search",
    )
    out = redact_for_display(a)
    assert out.value == "toronto weather"
