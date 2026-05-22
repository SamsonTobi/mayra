"""Pydantic mirror of contract JSON Schemas (validated against the same fixtures)."""

from __future__ import annotations

import re
from typing import Annotated, Literal, Union

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, TypeAdapter, model_validator

ActionKind = Literal["click", "type", "scroll", "wait", "navigate"]
Risk = Literal["low", "medium", "high"]

_TARGET_REF_RES = (
    re.compile(r"^@e[0-9]+$"),
    re.compile(r"^role:[a-z]+\[name=[^\]]+\]$"),
    re.compile(r"^text:.{1,200}$"),
    re.compile(r"^label:.{1,200}$"),
)


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    action: ActionKind
    target_ref: str | None = None
    value: str | None = Field(default=None, max_length=2048)
    risk: Risk
    reason: str = Field(max_length=280)

    @model_validator(mode="after")
    def _conditional_rules(self) -> Action:
        if self.target_ref is not None and not any(r.fullmatch(self.target_ref) for r in _TARGET_REF_RES):
            msg = "target_ref must match an agent-browser ref or allowed semantic locator"
            raise ValueError(msg)
        if self.action == "navigate":
            if self.value is None:
                msg = "navigate requires a URI value"
                raise ValueError(msg)
            TypeAdapter(AnyHttpUrl).validate_python(self.value)
        elif self.action == "type":
            if self.value is None or len(self.value) < 1:
                msg = "type requires a non-empty value"
                raise ValueError(msg)
        elif self.action == "click":
            if self.target_ref is None:
                msg = "click requires target_ref"
                raise ValueError(msg)
        return self


class UserMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: str = Field(min_length=1)
    kind: Literal["user"]
    text: str = Field(max_length=32000)
    ts: str


class AssistantMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: str = Field(min_length=1)
    kind: Literal["assistant"]
    markdown: str = Field(max_length=128000)
    ts: str
    streaming: bool | None = None
    provider: str | None = Field(default=None, min_length=1, max_length=64)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    observation_screenshot_path: str | None = Field(default=None, min_length=1)


class SystemStatusMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: str = Field(min_length=1)
    kind: Literal["system_status"]
    text: str = Field(max_length=2000)
    severity: Literal["info", "warn", "error"]
    ts: str


class ActionLogMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: str = Field(min_length=1)
    kind: Literal["action_log"]
    action: Action
    executed: bool
    screenshot_path: str | None = None
    step: int = Field(ge=0)
    ts: str


class ApprovalRequestMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: str = Field(min_length=1)
    kind: Literal["approval_request"]
    action: Action
    screenshot_path: str = Field(min_length=1)
    expires_at: str
    ts: str


ChatMessage = Annotated[
    Union[
        UserMessage,
        AssistantMessage,
        SystemStatusMessage,
        ActionLogMessage,
        ApprovalRequestMessage,
    ],
    Field(discriminator="kind"),
]


class TokenEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["token"]
    delta: str


class ActionEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["action"]
    message: ActionLogMessage


class StatusEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["status"]
    message: SystemStatusMessage


class ApprovalEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["approval"]
    message: ApprovalRequestMessage


class DoneEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["done"]
    task_id: str = Field(min_length=1)
    status: Literal["success", "failed", "aborted", "budget_exhausted", "degraded"]


class ErrorEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    kind: Literal["error"]
    code: str = Field(min_length=1)
    message: str = Field(max_length=4000)
    correlation_id: str = Field(min_length=8)


SseEventPayload = Annotated[
    Union[
        TokenEvent,
        ActionEvent,
        StatusEvent,
        ApprovalEvent,
        DoneEvent,
        ErrorEvent,
    ],
    Field(discriminator="kind"),
]


class ApprovalDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    approval_id: str = Field(min_length=1)
    decision: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=500)


class SettingsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    provider: Literal["cloudflare", "gemini", "groq"]
    model: str = Field(min_length=1, max_length=120)
    temperature: float = Field(ge=0.0, le=1.0)
    fallback_provider: Literal["cloudflare", "gemini", "groq"] | None = None
    auto_submit_basic_forms: bool | None = None
    headed: bool | None = None
    step_budget: int | None = Field(default=None, ge=5, le=80)
    throttle_rpm: int | None = Field(default=None, ge=1, le=60)


chat_message_adapter: TypeAdapter[ChatMessage] = TypeAdapter(ChatMessage)
sse_event_adapter: TypeAdapter[SseEventPayload] = TypeAdapter(SseEventPayload)
