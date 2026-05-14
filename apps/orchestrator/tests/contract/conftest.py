"""Contract-test fixtures: in-memory FastAPI app + httpx AsyncClient."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings

_DEFAULT_CONTRACT_REPLY = (
    "Proceeding.\n===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"contract-default"}'
)


@pytest.fixture
def app_settings() -> AppSettings:
    return AppSettings(token="contract-test-token", include_contract_routes=True)


@pytest.fixture
def app(app_settings: AppSettings):
    application = create_app(app_settings)
    application.state.browser = FakeBrowser()
    application.state.model_client = FakeModelClient(scripted_replies=[_DEFAULT_CONTRACT_REPLY])
    return application


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://127.0.0.1:8000",
        headers={"Host": "127.0.0.1:8000"},
    ) as ac:
        yield ac


def auth_headers(token: str, *, owner_id: str | None = None) -> dict[str, str]:
    h = {"Authorization": f"Bearer {token}", "Host": "127.0.0.1:8000"}
    if owner_id is not None:
        h["X-Mayra-Owner-Id"] = owner_id
    return h


class FakeModelClient:
    """Scripted model client for Stage T5 contract tests."""

    def __init__(
        self,
        scripted_replies: list[str] | None = None,
        *,
        hang_on_complete_streaming: asyncio.Event | None = None,
    ) -> None:
        self.scripted_replies = scripted_replies or []
        self.i = 0
        self.hang_on_complete_streaming = hang_on_complete_streaming
        self.provider = "fake"
        self.model = "fake-1"

    async def complete_streaming(
        self,
        prompt: object,
        *,
        temperature: float,
        on_token: Any,
    ) -> str:
        _ = (prompt, temperature)
        if self.hang_on_complete_streaming is not None:
            await self.hang_on_complete_streaming.wait()

        if self.scripted_replies:
            idx = min(self.i, len(self.scripted_replies) - 1)
            raw = self.scripted_replies[idx]
            self.i += 1
        else:
            raw = _DEFAULT_CONTRACT_REPLY

        await on_token(raw)
        return raw

    async def health_check(self) -> float:
        return 1.0

    async def aclose(self) -> None:
        pass


class FakeBrowser:
    """In-memory browser fake for agent-loop tests."""

    def __init__(self, nodes: list[dict[str, Any]] | None = None) -> None:
        self.nodes: list[dict[str, Any]] = nodes or [
            {"ref": "@e1", "role": "button", "name": "Ok"},
        ]
        self.executions: list[tuple[str, Any, list[str]]] = []

    async def doctor(self) -> None:
        return None

    async def open(self, *args: Any, **kwargs: Any) -> None:
        _ = (args, kwargs)
        return None

    async def snapshot(self, task_id: str) -> Any:
        _ = task_id
        return {"nodes": list(self.nodes)}

    async def screenshot_annotated(self, task_id: str) -> Any:
        _ = task_id
        return (b"x", "image/png")

    async def execute(self, task_id: str, action: Any, cmds: list[str]) -> None:
        self.executions.append((task_id, action, cmds))

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


async def read_sse_body(client: AsyncClient, app_settings: AppSettings, task_id: str) -> str:
    async with client.stream(
        "GET",
        f"/v1/chat/stream?task_id={task_id}&token={app_settings.token}",
        headers={"Host": "127.0.0.1:8000"},
    ) as resp:
        assert resp.status_code == 200
        return (await resp.aread()).decode()
