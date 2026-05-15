"""AgentBrowserAdapter action execution."""

from __future__ import annotations

import pytest

from mayra_orchestrator.browser.adapter import AgentBrowserAdapter
from mayra_orchestrator.errors import BrowserError


pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_execute_uses_validated_command_tokens(monkeypatch):
    adapter = AgentBrowserAdapter()
    adapter._session_ports["session-1"] = 9222
    seen: list[tuple[str, ...]] = []

    async def fake_exec(*argv: str, timeout: float) -> dict[str, object]:
        _ = timeout
        seen.append(argv)
        return {"success": True}

    monkeypatch.setattr("mayra_orchestrator.browser.adapter._require_agent_browser_exe", lambda: "agent-browser")
    monkeypatch.setattr(adapter, "_exec", fake_exec)

    await adapter.execute("session-1", object(), ["click", "@e1"])

    assert seen == [
        (
            "agent-browser",
            "--cdp",
            "9222",
            "--session",
            "session-1",
            "--json",
            "click",
            "@e1",
        )
    ]


@pytest.mark.asyncio
async def test_execute_raises_on_agent_browser_error(monkeypatch):
    adapter = AgentBrowserAdapter()
    adapter._session_ports["session-1"] = 9222

    async def fake_exec(*argv: str, timeout: float) -> dict[str, object]:
        _ = (argv, timeout)
        return {"success": False, "error": "click failed"}

    monkeypatch.setattr("mayra_orchestrator.browser.adapter._require_agent_browser_exe", lambda: "agent-browser")
    monkeypatch.setattr(adapter, "_exec", fake_exec)

    with pytest.raises(BrowserError, match="click failed"):
        await adapter.execute("session-1", object(), ["click", "@e1"])
