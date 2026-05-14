"""Request-scoped correlation id (structlog wiring comes later)."""
from __future__ import annotations

import uuid
from contextvars import ContextVar

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def new_correlation_id() -> str:
    return str(uuid.uuid4())


def get_correlation_id() -> str:
    return correlation_id_var.get() or ""
