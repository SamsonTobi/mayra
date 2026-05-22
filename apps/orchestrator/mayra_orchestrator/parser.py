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
    
    if len(parts) == 2:
        chat = parts[0].strip()
        action_str = parts[1].strip()
    else:
        # Delimiter missing. Try fallback JSON block extraction from the whole raw string.
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            chat = raw[:start].strip()
            action_str = raw[start:end+1]
        else:
            raise SchemaRepairableError("missing ===ACTION=== delimiter")

    # Strip markdown code blocks (e.g. ```json ... ```)
    if action_str.startswith("```"):
        lines = action_str.splitlines()
        if lines:
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            action_str = "\n".join(lines).strip()

    try:
        obj = json.loads(action_str)
    except json.JSONDecodeError:
        # Secondary fallback: Extract { ... } inside action_str
        start = action_str.find("{")
        end = action_str.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                obj = json.loads(action_str[start:end+1])
            except json.JSONDecodeError as e:
                raise SchemaRepairableError(f"invalid action json: {e}") from e
        else:
            raise SchemaRepairableError("invalid action json (no JSON object found)")

    try:
        action = Action.model_validate(obj)
    except ValidationError as e:
        raise SchemaRepairableError(f"action schema violation: {e}") from e
        
    return chat, action
