"""`to_agent_browser_command` — pure mapper.

Drives `mayra_orchestrator.actions.mapper.to_agent_browser_command`.
The mapper is the ONLY path from a validated Action to a list of
agent-browser CLI tokens. It must reject any action type outside the
five v1 types and must never interpolate raw model output into a
shell-meaningful string.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.actions.mapper import to_agent_browser_command
from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.errors import ActionValidationError


pytestmark = pytest.mark.unit


def test_click_maps_to_click_cmd():
    a = Action(action="click", target_ref="@e7", value=None, risk="low", reason="open menu")
    assert to_agent_browser_command(a) == ["click", "@e7"]


def test_type_maps_to_fill_with_value():
    a = Action(action="type", target_ref="@e3", value="toronto", risk="low", reason="fill search")
    assert to_agent_browser_command(a) == ["fill", "@e3", "toronto"]


def test_navigate_maps_to_open_url():
    a = Action(
        action="navigate",
        target_ref=None,
        value="https://example.com/login",
        risk="medium",
        reason="go to portal",
    )
    assert to_agent_browser_command(a) == ["open", "https://example.com/login"]


def test_unsupported_action_raises():
    """Defense in depth: even if the schema were bypassed, the mapper rejects."""
    a = Action.model_construct(action="eval", target_ref="@e1", value="alert(1)", risk="high", reason="x")
    with pytest.raises(ActionValidationError):
        to_agent_browser_command(a)
