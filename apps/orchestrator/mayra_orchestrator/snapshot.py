"""Accessibility-tree snapshot wrapper.

Built from agent-browser's `snapshot -i --json` output. v1 only models the
fields the risk classifier and prompt builder consume.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

_ALLOWED_ROLES: frozenset[str] = frozenset(
    {
        "button",
        "link",
        "textbox",
        "combobox",
        "checkbox",
        "radio",
        "switch",
        "menuitem",
        "tab",
        "heading",
        "group",
        "form",
    }
)


@dataclass(frozen=True)
class Node:
    ref: str
    role: str
    name: str = ""
    text: str = ""
    tag: str | None = None
    input_type: str | None = None
    in_form_with_money_or_account_action: bool = False
    is_password_or_otp: bool = False


@dataclass(frozen=True)
class Snapshot:
    nodes: tuple[Node, ...] = field(default_factory=tuple)

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> "Snapshot":
        agent_refs = data.get("data", {}).get("refs") if isinstance(data.get("data"), dict) else None
        if isinstance(agent_refs, dict):
            built_refs: list[Node] = []
            for raw_ref, raw_node in agent_refs.items():
                if not isinstance(raw_node, dict):
                    continue
                ref = raw_ref if str(raw_ref).startswith("@") else f"@{raw_ref}"
                built_refs.append(
                    Node(
                        ref=ref,
                        role=raw_node.get("role", "") or "",
                        name=raw_node.get("name", "") or raw_node.get("text", "") or "",
                        text=raw_node.get("text", "") or "",
                        tag=raw_node.get("tag"),
                        input_type=raw_node.get("input_type"),
                        in_form_with_money_or_account_action=bool(
                            raw_node.get("in_form_with_money_or_account_action", False)
                        ),
                        is_password_or_otp=bool(raw_node.get("is_password_or_otp", False)),
                    )
                )
            if built_refs:
                return cls(nodes=tuple(built_refs))

        raw_nodes = data.get("nodes") or []
        built: list[Node] = []
        for n in raw_nodes:
            if "ref" not in n:
                continue
            built.append(
                Node(
                    ref=n["ref"],
                    role=n.get("role", "") or "",
                    name=n.get("name", "") or "",
                    text=n.get("text", "") or "",
                    tag=n.get("tag"),
                    input_type=n.get("input_type"),
                    in_form_with_money_or_account_action=bool(
                        n.get("in_form_with_money_or_account_action", False)
                    ),
                    is_password_or_otp=bool(n.get("is_password_or_otp", False)),
                )
            )
        return cls(nodes=tuple(built))

    def find(self, ref: str) -> Node | None:
        for n in self.nodes:
            if n.ref == ref:
                return n
        return None

    def prune(self) -> "Snapshot":
        kept = tuple(n for n in self.nodes if n.role in _ALLOWED_ROLES)
        return Snapshot(nodes=kept)
