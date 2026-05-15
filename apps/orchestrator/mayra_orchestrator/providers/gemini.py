"""Google Gemini REST provider."""

from __future__ import annotations

import base64
import json
import time
from typing import Any

import httpx

from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.prompts.templates import PromptBundle
from mayra_orchestrator.providers.base import TokenCallback

GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODELS_PATH = f"{GEMINI_API_ROOT}/models"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
_TIMEOUT = httpx.Timeout(connect=5.0, read=60.0, write=15.0, pool=5.0)


async def gemini_list_models(client: httpx.AsyncClient, *, api_key: str) -> dict[str, Any]:
    """GET v1beta/models, the cheap Settings health-check surface."""
    try:
        r = await client.get(
            GEMINI_MODELS_PATH,
            params={"key": api_key},
            timeout=_TIMEOUT,
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


class GeminiClient:
    provider = "gemini"

    def __init__(
        self,
        *,
        http: httpx.AsyncClient,
        api_key: str,
        model: str = DEFAULT_GEMINI_MODEL,
    ) -> None:
        self.http = http
        self.api_key = api_key
        self.model = model

    async def health_check(self) -> float:
        t0 = time.perf_counter()
        await gemini_list_models(self.http, api_key=self.api_key)
        return max((time.perf_counter() - t0) * 1000, 1.0)

    async def complete_streaming(
        self,
        prompt: PromptBundle,
        *,
        temperature: float,
        on_token: TokenCallback,
    ) -> str:
        url = f"{GEMINI_API_ROOT}/models/{self.model}:streamGenerateContent"
        body = _build_stream_body(prompt, temperature=temperature)
        try:
            async with self.http.stream(
                "POST",
                url,
                params={"key": self.api_key, "alt": "sse"},
                json=body,
                timeout=_TIMEOUT,
            ) as response:
                if response.status_code in (401, 403):
                    raise ProviderError("unauthorized")
                if response.status_code == 429:
                    raise ProviderError("rate_limited")
                if response.status_code >= 500:
                    raise ProviderError(f"server_error:{response.status_code}")
                response.raise_for_status()

                chunks: list[str] = []
                async for line in response.aiter_lines():
                    delta = _text_delta_from_sse_line(line)
                    if not delta:
                        continue
                    chunks.append(delta)
                    await on_token(delta)
                return "".join(chunks)
        except httpx.RequestError as e:
            raise ProviderError(f"transport: {e}") from e

    async def aclose(self) -> None:
        await self.http.aclose()


def _build_stream_body(prompt: PromptBundle, *, temperature: float) -> dict[str, Any]:
    parts: list[dict[str, Any]] = [{"text": prompt.user_text}]
    if prompt.image_bytes:
        parts.append(
            {
                "inlineData": {
                    "mimeType": prompt.image_mime,
                    "data": base64.b64encode(prompt.image_bytes).decode("ascii"),
                }
            }
        )
    return {
        "systemInstruction": {"parts": [{"text": prompt.system_text}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": temperature},
    }


def _text_delta_from_sse_line(line: str) -> str:
    stripped = line.strip()
    if not stripped or stripped.startswith(":"):
        return ""
    if stripped.startswith("data:"):
        stripped = stripped.removeprefix("data:").strip()
    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError:
        return ""
    chunks: list[str] = []
    for candidate in payload.get("candidates", []):
        content = candidate.get("content") if isinstance(candidate, dict) else None
        parts = content.get("parts", []) if isinstance(content, dict) else []
        for part in parts:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                chunks.append(part["text"])
    return "".join(chunks)
