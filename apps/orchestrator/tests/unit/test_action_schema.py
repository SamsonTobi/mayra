"""Action Pydantic model.

Drives `mayra_orchestrator.actions.schema.Action`. The model must be a
Pydantic v2 BaseModel with `extra='forbid'`, `frozen=True`, `strict=True`,
matching the JSON Schema in `packages/contracts/schemas/action.schema.json`.

Red: import fails because the module does not exist yet.
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from mayra_orchestrator.actions.schema import Action


pytestmark = pytest.mark.unit


def test_action_rejects_extra_field():
    with pytest.raises(ValidationError):
        Action(
            action="click",
            target_ref="@e1",
            value=None,
            risk="low",
            reason="open menu",
            note="this field is not in the schema",  # type: ignore[call-arg]
        )


def test_action_accepts_minimal_click():
    a = Action(action="click", target_ref="@e1", value=None, risk="low", reason="open menu")
    assert a.action == "click"
    assert a.target_ref == "@e1"
    assert a.value is None
    assert a.risk == "low"


def test_action_is_frozen():
    a = Action(action="click", target_ref="@e1", value=None, risk="low", reason="x")
    with pytest.raises(ValidationError):
        a.risk = "high"  # type: ignore[misc]
