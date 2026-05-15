"""Provider client protocol shared by the agent loop."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Protocol

from mayra_orchestrator.prompts.templates import PromptBundle


TokenCallback = Callable[[str], Awaitable[None]]


class ModelClient(Protocol):
    provider: str
    model: str

    async def complete_streaming(
        self,
        prompt: PromptBundle,
        *,
        temperature: float,
        on_token: TokenCallback,
    ) -> str: ...

    async def health_check(self) -> float: ...

    async def aclose(self) -> None: ...
