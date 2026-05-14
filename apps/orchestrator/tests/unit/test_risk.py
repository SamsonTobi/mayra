"""`reclassify_risk()` — the safety boundary.

Drives `mayra_orchestrator.risk.reclassify_risk`. Server-side reclassification
must never trust the model-provided risk downward; it returns max(model, policy).

Two first-tests as listed in the spec (§B.1):
  - delete-button text promotes to high
  - navigate to a disallowed host is high
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.risk import reclassify_risk
from mayra_orchestrator.snapshot import Snapshot


pytestmark = pytest.mark.unit


def test_delete_button_text_promotes_to_high(snapshot_payload, node, risk_ctx):
    snap = Snapshot.from_json(snapshot_payload(node("@e3", role="button", name="Delete account")))
    action = Action(action="click", target_ref="@e3", value=None, risk="low", reason="click")
    ctx = risk_ctx(allowed_domains=["example.com"])

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "high"


def test_navigate_to_disallowed_host_is_high(snapshot_payload, risk_ctx):
    snap = Snapshot.from_json(snapshot_payload())
    action = Action(
        action="navigate",
        target_ref=None,
        value="https://evil.example.org/page",
        risk="low",
        reason="go elsewhere",
    )
    ctx = risk_ctx(allowed_domains=["example.com"])

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "high"


def test_navigate_to_allowed_host_keeps_low(snapshot_payload, risk_ctx):
    snap = Snapshot.from_json(snapshot_payload())
    action = Action(
        action="navigate",
        target_ref=None,
        value="https://sub.example.com/login",
        risk="low",
        reason="go to portal",
    )
    ctx = risk_ctx(allowed_domains=["example.com"])

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "low"


def test_password_field_type_action_is_high(snapshot_payload, node, risk_ctx):
    snap = Snapshot.from_json(
        snapshot_payload(node("@e5", role="textbox", name="Password", is_password_or_otp=True))
    )
    action = Action(action="type", target_ref="@e5", value="hunter2", risk="low", reason="login")
    ctx = risk_ctx()

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "high"


def test_stale_snapshot_forces_high(snapshot_payload, node, risk_ctx):
    snap = Snapshot.from_json(snapshot_payload(node("@e1", role="button", name="OK")))
    action = Action(action="click", target_ref="@e1", value=None, risk="low", reason="x")
    ctx = risk_ctx(snapshot_stale=True)

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "high"


def test_model_high_is_preserved_even_when_policy_would_say_low(snapshot_payload, node, risk_ctx):
    snap = Snapshot.from_json(snapshot_payload(node("@e1", role="button", name="OK")))
    action = Action(action="click", target_ref="@e1", value=None, risk="high", reason="cautious")
    ctx = risk_ctx()

    result = reclassify_risk(action, snap, ctx)

    assert result.risk == "high"
