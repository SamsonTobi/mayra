"""Fallback logic to cycle through providers when rate limits are hit."""

from __future__ import annotations

from typing import cast
from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.prompts.templates import PromptBundle
from mayra_orchestrator.providers.base import ModelClient, TokenCallback

class FallbackModelClient:
    """Wraps multiple ModelClient instances and falls back on rate_limited errors."""

    def __init__(self, clients: list[ModelClient]) -> None:
        if not clients:
            raise ValueError("FallbackModelClient requires at least one client")
        self.clients = clients
        
    @property
    def provider(self) -> str:
        return self.clients[0].provider
        
    @property
    def model(self) -> str:
        return self.clients[0].model

    async def complete_streaming(
        self,
        prompt: PromptBundle,
        *,
        temperature: float,
        on_token: TokenCallback,
    ) -> str:
        last_error: ProviderError | None = None
        
        for client in self.clients:
            try:
                return await client.complete_streaming(
                    prompt, 
                    temperature=temperature, 
                    on_token=on_token
                )
            except ProviderError as e:
                # Only fallback if the error was rate_limited
                if e.args and e.args[0] == "rate_limited":
                    last_error = e
                    continue
                # If we get unauthorized or transport errors, we should fail immediately 
                # instead of trying other providers because this specific provider failed.
                raise
                
        # If we exhausted all clients, raise the last rate_limited error
        if last_error:
            raise last_error
            
        raise ProviderError("system_error:no_clients_succeeded")

    async def health_check(self) -> float:
        # Just health check the primary client
        return await self.clients[0].health_check()

    async def aclose(self) -> None:
        # Closing is handled by the caller/factory generally, but we can propagate it
        for client in self.clients:
            await client.aclose()
