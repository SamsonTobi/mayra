"""OpenAI-compatible REST provider for Groq and Cloudflare."""

from __future__ import annotations

import base64
import json
import time
from typing import Any

import httpx

from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.prompts.templates import PromptBundle
from mayra_orchestrator.providers.base import TokenCallback

_TIMEOUT = httpx.Timeout(connect=5.0, read=60.0, write=15.0, pool=5.0)

class OpenAICompatClient:
    def __init__(
        self,
        *,
        provider: str,
        http: httpx.AsyncClient,
        api_key: str,
        base_url: str,
        model: str,
    ) -> None:
        self.provider = provider
        self.http = http
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.models_url = f"{self.base_url}/models" if not self.base_url.endswith("chat/completions") else self.base_url

    async def health_check(self) -> float:
        t0 = time.perf_counter()
        try:
            # We do a basic GET or lightweight POST to check auth/health
            r = await self.http.get(
                self.models_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
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
        
        # If it returns 404/405 because the endpoint isn't supported, we fallback to accepting it
        # as long as we successfully completed the network roundtrip and didn't get 401/403/429.
        return max((time.perf_counter() - t0) * 1000, 1.0)

    async def complete_streaming(
        self,
        prompt: PromptBundle,
        *,
        temperature: float,
        on_token: TokenCallback,
    ) -> str:
        url = self.base_url
        if not url.endswith("/chat/completions"):
            url = f"{url}/chat/completions"
            
        body = self._build_stream_body(prompt, temperature=temperature)
        try:
            async with self.http.stream(
                "POST",
                url,
                headers={"Authorization": f"Bearer {self.api_key}"},
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
                    delta = self._text_delta_from_sse_line(line)
                    if not delta:
                        continue
                    chunks.append(delta)
                    await on_token(delta)
                return "".join(chunks)
        except httpx.RequestError as e:
            raise ProviderError(f"transport: {e}") from e

    async def aclose(self) -> None:
        await self.http.aclose()

    def _build_stream_body(self, prompt: PromptBundle, *, temperature: float) -> dict[str, Any]:
        messages = [{"role": "system", "content": prompt.system_text}]
        
        user_content: list[dict[str, Any]] = [{"type": "text", "text": prompt.user_text}]
        if prompt.image_bytes:
            b64_img = base64.b64encode(prompt.image_bytes).decode("ascii")
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{prompt.image_mime};base64,{b64_img}"}
            })
            
        messages.append({"role": "user", "content": user_content})
        
        return {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": True
        }

    def _text_delta_from_sse_line(self, line: str) -> str:
        stripped = line.strip()
        if not stripped or stripped.startswith(":"):
            return ""
        if stripped.startswith("data:"):
            stripped = stripped.removeprefix("data:").strip()
            
        if stripped == "[DONE]":
            return ""
            
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            return ""
            
        chunks: list[str] = []
        for choice in payload.get("choices", []):
            delta = choice.get("delta") if isinstance(choice, dict) else None
            if isinstance(delta, dict) and isinstance(delta.get("content"), str):
                chunks.append(delta["content"])
        return "".join(chunks)

def create_groq_client(http: httpx.AsyncClient, api_key: str, model: str = "llama-3.1-8b-instant") -> OpenAICompatClient:
    return OpenAICompatClient(
        provider="groq",
        http=http,
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
        model=model
    )

def create_cloudflare_client(http: httpx.AsyncClient, account_id: str, api_token: str, model: str = "@cf/meta/llama-3.1-8b-instruct") -> OpenAICompatClient:
    return OpenAICompatClient(
        provider="cloudflare",
        http=http,
        api_key=api_token,
        base_url=f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
        model=model
    )
