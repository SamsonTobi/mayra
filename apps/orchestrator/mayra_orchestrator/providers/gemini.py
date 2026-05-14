"""Minimal Google Gemini REST probe (used by `/v1/settings/validate` later).

Only `list_models` for now — a cheap GET that proves the API key works.
"""
from __future__ import annotations

from typing import Any

import httpx

from mayra_orchestrator.errors import ProviderError

GEMINI_MODELS_PATH = "https://generativelanguage.googleapis.com/v1beta/models"


async def gemini_list_models(client: httpx.AsyncClient, *, api_key: str) -> dict[str, Any]:
    """GET v1beta/models — same surface the Settings UI health-check will call."""
    try:
        r = await client.get(
            GEMINI_MODELS_PATH,
            params={"key": api_key},
            timeout=httpx.Timeout(connect=5.0, read=60.0, write=15.0, pool=5.0),
        )
    except httpx.RequestError as e:
        raise ProviderError(f"transport: {e}") from e

    if r.status_code in (401, 403):
        raise ProviderError("unauthorized")
    if r.status_code == 429:
        raise ProviderError("rate_limited")
    if r.status_code >= 500:
        raise ProviderError(f"server_error:{r.status_code}")
    r.raise_for_status()
    return r.json()
