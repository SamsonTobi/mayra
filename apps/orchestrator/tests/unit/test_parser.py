"""`parse_chat_and_action` — splits model output into prose + validated Action.

Drives `mayra_orchestrator.parser.parse_chat_and_action`. The function returns
`(chat: str, action: Action)`. On JSON parse failure OR schema failure it
raises `SchemaRepairableError` — caller (agent loop) decides whether to spend
a repair attempt.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.errors import SchemaRepairableError
from mayra_orchestrator.parser import parse_chat_and_action


pytestmark = pytest.mark.unit


_VALID_RAW = (
    "I will click the Login button.\n"
    "===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"open login"}'
)


def test_parser_returns_chat_and_validated_action():
    chat, action = parse_chat_and_action(_VALID_RAW)

    assert chat == "I will click the Login button."
    assert action.action == "click"
    assert action.target_ref == "@e1"
    assert action.risk == "low"


def test_missing_delimiter_raises_repairable():
    with pytest.raises(SchemaRepairableError):
        parse_chat_and_action("Just chatting, no action here.")


def test_malformed_json_raises_repairable():
    with pytest.raises(SchemaRepairableError):
        parse_chat_and_action("ok\n===ACTION===\n{not json")


def test_schema_violation_raises_repairable():
    raw = (
        "ok\n===ACTION===\n"
        '{"action":"eval","target_ref":"@e1","value":"alert(1)","risk":"low","reason":"x"}'
    )
    with pytest.raises(SchemaRepairableError):
        parse_chat_and_action(raw)


def test_parser_resilient_to_markdown_fences():
    raw = (
        "I will click the Login button.\n"
        "===ACTION===\n"
        "```json\n"
        '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"open login"}\n'
        "```"
    )
    chat, action = parse_chat_and_action(raw)
    assert chat == "I will click the Login button."
    assert action.action == "click"
    assert action.target_ref == "@e1"


def test_parser_fallback_extraction_without_delimiter():
    raw = (
        "I will click the Login button.\n"
        '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"open login"}'
    )
    chat, action = parse_chat_and_action(raw)
    assert chat == "I will click the Login button."
    assert action.action == "click"
    assert action.target_ref == "@e1"
