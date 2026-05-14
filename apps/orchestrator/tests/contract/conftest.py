"""Contract-test fixtures: in-memory FastAPI app + httpx AsyncClient."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings


@pytest.fixture
def app_settings() -> AppSettings:
    return AppSettings(token="contract-test-token", include_contract_routes=True)


@pytest.fixture
def app(app_settings: AppSettings):
    return create_app(app_settings)


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://127.0.0.1:8000",
        headers={"Host": "127.0.0.1:8000"},
    ) as ac:
        yield ac


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Host": "127.0.0.1:8000"}


class FakeModelClient:
    """Scripted model client (§B.8 shape — expand when wiring the agent loop)."""

    def __init__(self, scripted: list[tuple[str, dict[str, Any]]] | None = None) -> None:
        self.i = 0
        self.scripted = scripted or []
        self.provider = "fake"
        self.model = "fake-1"

    async def complete_streaming(
        self,
        prompt: object,
        *,
        temperature: float,
        on_token: Any,
    ) -> str:
        raise NotImplementedError("wired in Stage T5")

    async def health_check(self) -> float:
        return 1.0

    async def aclose(self) -> None:
        pass


class FakeBrowser:
    """Placeholder browser fake for future agent-loop contract tests."""

    async def doctor(self) -> None:
        return None

    async def open(self, *args: Any, **kwargs: Any) -> None:
        return None

    async def snapshot(self, task_id: str) -> Any:
        raise NotImplementedError

    async def screenshot_annotated(self, task_id: str) -> Any:
        raise NotImplementedError

    async def execute(self, task_id: str, action: Any) -> Any:
        raise NotImplementedError

    async def close_all(self) -> None:
        return None


def parse_sse_events(body: str) -> list[tuple[str, str]]:
    """Parse minimal SSE body into (event_name, data) pairs."""
    events: list[tuple[str, str]] = []
    current_event: str | None = None
    for raw_line in body.replace("\r\n", "\n").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("event:"):
            current_event = line.removeprefix("event:").strip()
        elif line.startswith("data:"):
            data = line.removeprefix("data:").strip()
            if current_event is not None:
                events.append((current_event, data))
                current_event = None
    return events
