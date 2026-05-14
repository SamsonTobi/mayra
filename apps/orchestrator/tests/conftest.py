"""Shared fixtures for unit tests.

Intentionally minimal: we only provide builders for cross-cutting test data
(snapshots, risk contexts). Each test file owns its own imports of the units
under test so that an import error is localized.
"""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest


def _node(
    ref: str,
    *,
    role: str = "button",
    name: str = "",
    text: str = "",
    tag: str | None = None,
    input_type: str | None = None,
    in_form_with_money_or_account_action: bool = False,
    is_password_or_otp: bool = False,
) -> dict[str, Any]:
    return {
        "ref": ref,
        "role": role,
        "name": name,
        "text": text,
        "tag": tag,
        "input_type": input_type,
        "in_form_with_money_or_account_action": in_form_with_money_or_account_action,
        "is_password_or_otp": is_password_or_otp,
    }


@pytest.fixture
def node():
    """Factory returning a single accessibility-tree node dict."""
    return _node


@pytest.fixture
def snapshot_payload():
    """Factory returning a snapshot dict accepted by Snapshot.from_json."""

    def make(*nodes: dict[str, Any]) -> dict[str, Any]:
        return {"nodes": list(nodes)}

    return make


@pytest.fixture
def risk_ctx():
    """Factory returning a minimal duck-typed RiskContext.

    The risk classifier should depend only on `.allowed_domains` and a
    `.snapshot_stale()` callable, never on the full TaskState. This fixture
    enforces that contract by handing the classifier exactly those two attrs.
    """

    def make(allowed_domains: list[str] | None = None, *, snapshot_stale: bool = False):
        return SimpleNamespace(
            allowed_domains=allowed_domains or ["example.com"],
            snapshot_stale=lambda: snapshot_stale,
        )

    return make
