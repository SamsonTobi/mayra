"""Server-side risk reclassification.

The function NEVER trusts the model-provided `risk` field downward. It
returns max(model_risk, policy_risk). The caller's only escape hatch is to
emit a different action.
"""
from __future__ import annotations

from typing import Protocol
from urllib.parse import urlparse

from mayra_orchestrator.actions.schema import Action, Risk
from mayra_orchestrator.snapshot import Snapshot

_HIGH_RISK_TEXTS: tuple[str, ...] = (
    "delete",
    "remove",
    "pay",
    "purchase",
    "checkout",
    "confirm",
    "submit",
    "save changes",
    "transfer",
    "send money",
    "disable",
    "deactivate",
)

_RISK_RANK: dict[Risk, int] = {"low": 0, "medium": 1, "high": 2}


class RiskContext(Protocol):
    allowed_domains: list[str]

    def snapshot_stale(self) -> bool: ...


def _max_risk(a: Risk, b: Risk) -> Risk:
    return a if _RISK_RANK[a] >= _RISK_RANK[b] else b


def _host_allowed(host: str, allowed: list[str]) -> bool:
    host = host.lower()
    for d in allowed:
        d = d.lower()
        if host == d or host.endswith("." + d):
            return True
    return False


def reclassify_risk(action: Action, snapshot: Snapshot, ctx: RiskContext) -> Action:
    policy: Risk = "low"

    if ctx.snapshot_stale():
        policy = _max_risk(policy, "high")

    if action.action == "navigate":
        host = (urlparse(action.value or "").hostname or "").lower()
        if not _host_allowed(host, ctx.allowed_domains):
            policy = _max_risk(policy, "high")

    if action.target_ref and action.target_ref.startswith("@e"):
        node = snapshot.find(action.target_ref)
        if node is not None:
            haystack = f"{node.name} {node.text}".lower()
            if any(w in haystack for w in _HIGH_RISK_TEXTS):
                policy = _max_risk(policy, "high")
            if node.in_form_with_money_or_account_action:
                policy = _max_risk(policy, "high")
            if action.action == "type" and node.is_password_or_otp:
                policy = _max_risk(policy, "high")
            if node.tag == "input" and node.input_type == "file":
                policy = _max_risk(policy, "high")

    final = _max_risk(action.risk, policy)
    if final == action.risk:
        return action
    return action.model_copy(update={"risk": final})
