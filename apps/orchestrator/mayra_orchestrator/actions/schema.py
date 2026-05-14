"""Re-export contract `Action` (and typing aliases) from `mayra_contracts`."""

from __future__ import annotations

from mayra_contracts.models import Action, ActionKind, Risk

ActionType = ActionKind

__all__ = ["Action", "ActionType", "Risk"]
