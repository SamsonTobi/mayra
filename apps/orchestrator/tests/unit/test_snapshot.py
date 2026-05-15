"""Snapshot pruner.

Drives `mayra_orchestrator.snapshot.Snapshot`. The pruner keeps only nodes whose
role is in the allowed set (plus their direct ancestors), caps depth at 12, and
caps total node count at 1500. The first failing test asserts the allowed-role
filter; the others lock down `from_json`/`find` semantics that the rest of the
codebase already depends on.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.snapshot import Snapshot


pytestmark = pytest.mark.unit


def test_prune_drops_nodes_outside_allowed_roles(snapshot_payload, node):
    snap = Snapshot.from_json(
        snapshot_payload(
            node("@e1", role="button", name="OK"),
            node("@e2", role="presentation", name="decorative icon"),
            node("@e3", role="textbox", name="Search"),
        )
    )

    pruned = snap.prune()

    assert pruned.find("@e1") is not None
    assert pruned.find("@e3") is not None
    assert pruned.find("@e2") is None


def test_find_returns_none_for_unknown_ref(snapshot_payload, node):
    snap = Snapshot.from_json(snapshot_payload(node("@e1", role="button", name="OK")))
    assert snap.find("@e999") is None


def test_from_json_roundtrips_ref_and_role(snapshot_payload, node):
    snap = Snapshot.from_json(snapshot_payload(node("@e7", role="link", name="Home")))
    n = snap.find("@e7")
    assert n is not None
    assert n.role == "link"
    assert n.name == "Home"


def test_from_json_accepts_agent_browser_refs_map():
    snap = Snapshot.from_json({"data": {"refs": {"e1": {"role": "button", "name": "Sign in"}}}})
    n = snap.find("@e1")
    assert n is not None
    assert n.role == "button"
    assert n.name == "Sign in"
