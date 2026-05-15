"""respx-based tests for Gemini HTTP adapter (no real network)."""
from __future__ import annotations

import httpx
import pytest

from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.prompts.templates import PromptBundle
from mayra_orchestrator.providers.gemini import GEMINI_API_ROOT, GEMINI_MODELS_PATH, GeminiClient, gemini_list_models

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_gemini_list_models_success(respx_mock):
    respx_mock.get(GEMINI_MODELS_PATH).mock(
        return_value=httpx.Response(200, json={"models": [{"name": "models/gemini-1.5-flash"}]})
    )
    async with httpx.AsyncClient() as client:
        out = await gemini_list_models(client, api_key="fake-key")
    assert "models" in out
    assert len(out["models"]) == 1


@pytest.mark.asyncio
async def test_gemini_list_models_401_raises_provider_error(respx_mock):
    respx_mock.get(GEMINI_MODELS_PATH).mock(return_value=httpx.Response(401, text="nope"))
    async with httpx.AsyncClient() as client:
        with pytest.raises(ProviderError, match="unauthorized"):
            await gemini_list_models(client, api_key="bad")


@pytest.mark.asyncio
async def test_gemini_list_models_429_raises_provider_error(respx_mock):
    respx_mock.get(GEMINI_MODELS_PATH).mock(return_value=httpx.Response(429, text="slow down"))
    async with httpx.AsyncClient() as client:
        with pytest.raises(ProviderError, match="rate_limited"):
            await gemini_list_models(client, api_key="k")


@pytest.mark.asyncio
async def test_gemini_list_models_503_raises_provider_error(respx_mock):
    respx_mock.get(GEMINI_MODELS_PATH).mock(return_value=httpx.Response(503, text="unavailable"))
    async with httpx.AsyncClient() as client:
        with pytest.raises(ProviderError, match="server_error:503"):
            await gemini_list_models(client, api_key="k")


@pytest.mark.asyncio
async def test_gemini_complete_streaming_emits_tokens_and_inline_webp(respx_mock):
    route = respx_mock.post(f"{GEMINI_API_ROOT}/models/gemini-2.5-flash:streamGenerateContent").mock(
        return_value=httpx.Response(
            200,
            text=(
                'data: {"candidates":[{"content":{"parts":[{"text":"Click "}]}}]}\n\n'
                'data: {"candidates":[{"content":{"parts":[{"text":"done."}]}}]}\n\n'
            ),
        )
    )
    seen: list[str] = []
    prompt = PromptBundle(
        system_text="sys",
        user_text="user",
        image_bytes=b"webp",
        image_mime="image/webp",
    )
    async with httpx.AsyncClient() as http:
        client = GeminiClient(http=http, api_key="fake")
        raw = await client.complete_streaming(
            prompt,
            temperature=0.0,
            on_token=lambda t: _append_token(seen, t),
        )

    assert raw == "Click done."
    assert seen == ["Click ", "done."]
    body = route.calls.last.request.read().decode()
    assert '"inlineData"' in body
    assert '"mimeType":"image/webp"' in body


async def _append_token(seen: list[str], token: str) -> None:
    seen.append(token)
