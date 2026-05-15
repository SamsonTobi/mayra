"""Provider factory bootstrapping."""

from __future__ import annotations

import base64
import asyncio
import json
import os

from mayra_orchestrator.providers.factory import build_provider_runtime, decode_provider_keys
from mayra_orchestrator.settings import AppSettings


def test_decode_provider_keys_wipes_env(monkeypatch):
    raw = base64.b64encode(json.dumps({"gemini": "secret"}).encode()).decode()
    monkeypatch.setenv("MAYRA_PROVIDER_KEYS_BASE64", raw)

    assert decode_provider_keys(raw) == {"gemini": "secret"}
    assert "MAYRA_PROVIDER_KEYS_BASE64" not in os.environ


def test_build_provider_runtime_creates_gemini_client_and_limiter(tmp_path):
    raw = base64.b64encode(json.dumps({"gemini": "secret"}).encode()).decode()
    settings = AppSettings(
        token="test",
        data_dir=tmp_path,
        provider_keys_base64=raw,
    )

    runtime = build_provider_runtime(settings)

    assert set(runtime.clients) == {"gemini"}
    assert set(runtime.rate_limit) == {"gemini"}
    assert set(runtime.semaphore) == {"gemini"}
    asyncio.run(runtime.clients["gemini"].aclose())
