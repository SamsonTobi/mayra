"""Single source of truth for redaction.

`redact()` runs on every log record and every Supabase write.
`redact_for_display()` masks the typed value of a `type` action when the
target_ref string itself hints at a password/OTP field — this works without a
live snapshot so it can be applied in the action-log buffer.
"""
from __future__ import annotations

import re
from typing import Any

from mayra_orchestrator.actions.schema import Action

_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"sb_(publishable|secret)_[A-Za-z0-9]{20,}"),
    re.compile(r"xai-[A-Za-z0-9]{20,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._\-]{20,}"),
]

_SENSITIVE_KEYS: frozenset[str] = frozenset(
    {"password", "api_key", "token", "secret", "authorization", "cookie", "otp"}
)

_PASSWORD_HINTS: tuple[str, ...] = ("password", "otp", "passcode", "verification")


def redact(obj: Any) -> Any:
    if isinstance(obj, str):
        s = obj
        for p in _PATTERNS:
            s = p.sub("[REDACTED]", s)
        return s
    if isinstance(obj, dict):
        out: dict[Any, Any] = {}
        for k, v in obj.items():
            if isinstance(k, str) and k.lower() in _SENSITIVE_KEYS:
                out[k] = "[REDACTED]"
            else:
                out[k] = redact(v)
        return out
    if isinstance(obj, list):
        return [redact(x) for x in obj]
    if isinstance(obj, tuple):
        return tuple(redact(x) for x in obj)
    return obj


def redact_for_display(action: Action) -> Action:
    if action.action != "type" or action.target_ref is None:
        return action
    ref_lower = action.target_ref.lower()
    if any(h in ref_lower for h in _PASSWORD_HINTS):
        return action.model_copy(update={"value": "[REDACTED:password_field]"})
    return action
