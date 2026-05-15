"""Provider bootstrapping from sidecar environment."""

from __future__ import annotations

import asyncio
import base64
import json
import os
from dataclasses import dataclass

import httpx
from aiolimiter import AsyncLimiter

from mayra_orchestrator.providers.base import ModelClient
from mayra_orchestrator.providers.gemini import GeminiClient
from mayra_orchestrator.settings import AppSettings


@dataclass(frozen=True)
class ProviderRuntime:
    clients: dict[str, ModelClient]
    rate_limit: dict[str, AsyncLimiter]
    semaphore: dict[str, asyncio.Semaphore]


def build_provider_runtime(settings: AppSettings) -> ProviderRuntime:
    keys = decode_provider_keys(settings.provider_keys_base64)
    clients: dict[str, ModelClient] = {}

    gemini_key = keys.get("gemini")
    if gemini_key:
        clients["gemini"] = GeminiClient(
            http=httpx.AsyncClient(),
            api_key=gemini_key,
            model=settings.default_model,
        )

    return ProviderRuntime(
        clients=clients,
        rate_limit={
            provider: AsyncLimiter(settings.default_throttle_rpm, 60)
            for provider in clients
        },
        semaphore={provider: asyncio.Semaphore(2) for provider in clients},
    )


def decode_provider_keys(raw_b64: str | None) -> dict[str, str]:
    os.environ.pop("MAYRA_PROVIDER_KEYS_BASE64", None)
    if not raw_b64:
        return {}
    try:
        decoded = base64.b64decode(raw_b64, validate=True)
        parsed = json.loads(decoded)
    except (ValueError, json.JSONDecodeError):
        return {}
    if not isinstance(parsed, dict):
        return {}
    out: dict[str, str] = {}
    for key, value in parsed.items():
        if isinstance(key, str) and isinstance(value, str) and value:
            out[key] = value
    return out
