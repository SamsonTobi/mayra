"""Split model output into (chat_reply, validated Action).

JSON parse failures and schema validation failures both surface as
`SchemaRepairableError`. The caller decides whether to spend a repair
attempt or abort the step.
"""
from __future__ import annotations

import json

from pydantic import ValidationError

from mayra_orchestrator.actions.schema import Action
from mayra_orchestrator.errors import SchemaRepairableError

_DELIMITER = "===ACTION==="


def parse_chat_and_action(raw: str) -> tuple[str, Action]:
    parts = raw.split(_DELIMITER, 1)
    if len(parts) != 2:
        raise SchemaRepairableError("missing ===ACTION=== delimiter")
    chat = parts[0].strip()
    try:
        obj = json.loads(parts[1].strip())
    except json.JSONDecodeError as e:
        raise SchemaRepairableError(f"invalid action json: {e}") from e
    try:
        action = Action.model_validate(obj)
    except ValidationError as e:
        raise SchemaRepairableError(f"action schema violation: {e}") from e
    return chat, action
