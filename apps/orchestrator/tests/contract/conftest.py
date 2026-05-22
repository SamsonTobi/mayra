"""Contract-test fixtures: in-memory FastAPI app + httpx AsyncClient."""
from __future__ import annotations

import asyncio
import io
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings

_DEFAULT_CONTRACT_REPLY = (
    "Proceeding.\n===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"contract-default"}'
)


@pytest.fixture
def app_settings(tmp_path) -> AppSettings:
    data = tmp_path / "mayra-data"
    data.mkdir()
    return AppSettings(token="contract-test-token", include_contract_routes=True, data_dir=data)


@pytest.fixture
def app(app_settings: AppSettings):
    application = create_app(app_settings)
    application.state.browser = FakeBrowser()
    application.state.model_client = FakeModelClient(scripted_replies=[_DEFAULT_CONTRACT_REPLY])
    application.state.session_browser = FakeSessionBrowser()
    return application


class FakeSessionBrowser:
    """CDP/session adapter fake (no real agent-browser)."""

    def __init__(self) -> None:
        self.opened: list[tuple[int, str]] = []
        self._ports: dict[str, int] = {}
        self.executions: list[tuple[str, Any, list[str]]] = []

    async def run_doctor(self) -> dict[str, Any]:
        return {"ok": True, "fake": True}

    async def open(self, cdp_port: int, session_id: str) -> None:
        self.opened.append((cdp_port, session_id))
        self._ports[session_id] = cdp_port

    async def snapshot(self, session_id: str, allowed_domains: list[str] | None = None) -> dict[str, Any]:
        _ = session_id
        n = 247
        return {
            "success": True,
            "nodes": [{"ref": "@e1", "role": "button", "name": "Ok"}],
            "data": {
                "refs": {
                    **{"e1": {"role": "button", "name": "Ok"}},
                    **{f"e{i}": {"role": "generic"} for i in range(2, n + 1)},
                }
            },
        }

    async def screenshot_png_bytes(self, session_id: str) -> bytes:
        _ = session_id
        buf = io.BytesIO()
        Image.new("RGB", (4, 4), color=(10, 20, 30)).save(buf, format="PNG")
        return buf.getvalue()

    async def screenshot_annotated(self, session_id: str, allowed_domains: list[str] | None = None) -> tuple[bytes, str]:
        return (await self.screenshot_png_bytes(session_id), "image/png")

    async def execute(self, session_id: str, action: Any, cmds: list[str], allowed_domains: list[str] | None = None) -> None:
        self.executions.append((session_id, action, cmds))

    def forget_session(self, session_id: str) -> None:
        self._ports.pop(session_id, None)

    async def close_all(self) -> None:
        self._ports.clear()
        self.opened.clear()
        self.executions.clear()


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

    async def snapshot(self, task_id: str, allowed_domains: list[str] | None = None) -> Any:
        _ = task_id
        return {"nodes": list(self.nodes)}

    async def screenshot_annotated(self, task_id: str, allowed_domains: list[str] | None = None) -> Any:
        _ = task_id
        return (b"x", "image/png")

    async def execute(self, task_id: str, action: Any, cmds: list[str], allowed_domains: list[str] | None = None) -> None:
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
