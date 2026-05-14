"""Contract fixtures must validate in Pydantic the same way JSON Schema tests expect."""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from mayra_contracts.models import (
    Action,
    ApprovalDecision,
    SettingsConfig,
    chat_message_adapter,
    sse_event_adapter,
)

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("action.valid.*.json")),
    ids=lambda p: p.name,
)
def test_action_valid(path: Path) -> None:
    Action.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("action.invalid.*.json")),
    ids=lambda p: p.name,
)
def test_action_invalid(path: Path) -> None:
    with pytest.raises(ValidationError):
        Action.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("message.valid.*.json")),
    ids=lambda p: p.name,
)
def test_message_valid(path: Path) -> None:
    chat_message_adapter.validate_json(path.read_bytes())


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("message.invalid.*.json")),
    ids=lambda p: p.name,
)
def test_message_invalid(path: Path) -> None:
    with pytest.raises(ValidationError):
        chat_message_adapter.validate_json(path.read_bytes())


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("events.valid.*.json")),
    ids=lambda p: p.name,
)
def test_events_valid(path: Path) -> None:
    sse_event_adapter.validate_json(path.read_bytes())


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("events.invalid.*.json")),
    ids=lambda p: p.name,
)
def test_events_invalid(path: Path) -> None:
    with pytest.raises(ValidationError):
        sse_event_adapter.validate_json(path.read_bytes())


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("approval.valid.*.json")),
    ids=lambda p: p.name,
)
def test_approval_valid(path: Path) -> None:
    ApprovalDecision.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("approval.invalid.*.json")),
    ids=lambda p: p.name,
)
def test_approval_invalid(path: Path) -> None:
    with pytest.raises(ValidationError):
        ApprovalDecision.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("settings.valid.*.json")),
    ids=lambda p: p.name,
)
def test_settings_valid(path: Path) -> None:
    SettingsConfig.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    sorted(FIXTURES.glob("settings.invalid.*.json")),
    ids=lambda p: p.name,
)
def test_settings_invalid(path: Path) -> None:
    with pytest.raises(ValidationError):
        SettingsConfig.model_validate_json(path.read_text(encoding="utf-8"))
