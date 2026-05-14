"""Pure mapper from a validated `Action` to agent-browser CLI tokens.

Defense in depth: even if the schema were bypassed (e.g. via
`Action.model_construct`), this mapper rejects unknown action types. There is
no path that interpolates raw model output into a shell-meaningful string.
"""
from __future__ import annotations

from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.errors import ActionValidationError


def to_agent_browser_command(a: Action) -> list[str]:
    match a.action:
        case "click":
            if not a.target_ref:
                raise ActionValidationError("click requires target_ref")
            return ["click", a.target_ref]
        case "type":
            if not a.target_ref:
                raise ActionValidationError("type requires target_ref")
            return ["fill", a.target_ref, a.value or ""]
        case "scroll":
            direction, _, px = (a.value or "down:400").partition(":")
            return ["scroll", direction, px or "400"]
        case "wait":
            if a.target_ref:
                return ["wait", a.target_ref]
            ms_str = a.value or "1000"
            ms = int(ms_str) if ms_str.isdigit() else 1000
            return ["wait", "--ms", str(ms)]
        case "navigate":
            if not a.value:
                raise ActionValidationError("navigate requires value")
            return ["open", a.value]
        case _:
            raise ActionValidationError(f"unsupported action: {a.action!r}")
