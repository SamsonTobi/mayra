"""Pydantic request/response bodies (strict, forbid extras)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class CreateTaskRequest(StrictModel):
    goal: str
    allowed_domains: list[str]
    session_id: str | None = None
    start_blocked_sleeper: bool = False
    start_agent_loop: bool = False
    max_steps: int = Field(default=40, ge=1, le=256)
    exhaust_budget_probe: bool = False


class CreateTaskResponse(StrictModel):
    task_id: str


class TaskMessageRequest(StrictModel):
    text: str


class ApproveRequest(StrictModel):
    approval_id: str
    decision: Literal["approve", "reject"]
    reason: str | None = None


class ValidateSettingsRequest(StrictModel):
    provider: Literal["cloudflare", "gemini", "grok"]
    model: str


class ValidateSettingsResponse(StrictModel):
    ok: bool
    latency_ms: int


class UILogRequest(StrictModel):
    event: str
    fields: dict[str, Any]


class UILogResponse(StrictModel):
    ok: bool


class SessionConnectRequest(StrictModel):
    port: int = Field(ge=1, le=65535)


class SessionConnectResponse(StrictModel):
    session_id: str


class SessionSummary(StrictModel):
    session_id: str
    cdp_port: int
    last_node_count: int | None = None


class SessionSnapshotResponse(StrictModel):
    node_count: int
    screenshot_path: str


