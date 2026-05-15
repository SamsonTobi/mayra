"""Unit tests for snapshot JSON node counting."""
from __future__ import annotations

import base64

import pytest

from mayra_orchestrator.browser import adapter as adapter_module
from mayra_orchestrator.browser.adapter import AgentBrowserAdapter, snapshot_node_count

pytestmark = pytest.mark.unit


def test_snapshot_node_count_uses_refs():
    snap = {"data": {"refs": {"e1": {}, "e2": {}}}}
    assert snapshot_node_count(snap) == 2


def test_snapshot_node_count_falls_back_to_at_refs_in_text():
    snap = {"data": {"snapshot": "foo @e1 bar @e2 @e1"}}
    assert snapshot_node_count(snap) == 2


def test_snapshot_node_count_nodes_list():
    snap = {"nodes": [{"x": 1}, {"x": 2}, {"x": 3}]}
    assert snapshot_node_count(snap) == 3


@pytest.mark.parametrize(
    "kwargs",
    [{}, {"data": {}}, {"data": {"snapshot": "no refs here"}}],
)
def test_snapshot_node_count_zero(kwargs):
    assert snapshot_node_count(kwargs) == 0


@pytest.mark.asyncio
async def test_open_probes_cdp_without_spawning_agent_browser_connect(monkeypatch):
    async def fake_probe(cdp_port: int):
        assert cdp_port == 9222
        return {"Browser": "Chrome/123"}

    async def fail_exec(*args, **kwargs):
        _ = (args, kwargs)
        raise AssertionError("open() must not call agent-browser connect")

    monkeypatch.setattr(adapter_module, "_require_agent_browser_exe", lambda: "agent-browser")
    monkeypatch.setattr(adapter_module, "_probe_cdp_endpoint", fake_probe)

    adapter = AgentBrowserAdapter()
    monkeypatch.setattr(adapter, "_exec", fail_exec)

    await adapter.open(9222, "sid")

    assert adapter._base("sid")[:3] == ["agent-browser", "--cdp", "9222"]


@pytest.mark.asyncio
async def test_snapshot_uses_agent_browser_refs(monkeypatch):
    adapter = AgentBrowserAdapter()
    adapter._session_ports["sid"] = 9222

    async def fake_exec(*argv: str, timeout: float):
        assert timeout == 60.0
        assert argv == (
            "agent-browser",
            "--cdp",
            "9222",
            "--session",
            "sid",
            "--json",
            "snapshot",
            "--max-output",
            "20000",
        )
        return {"data": {"refs": {"e1": {"role": "button"}}}}

    monkeypatch.setattr(adapter_module, "_require_agent_browser_exe", lambda: "agent-browser")
    monkeypatch.setattr(adapter, "_exec", fake_exec)

    snap = await adapter.snapshot("sid")

    assert snap == {"data": {"refs": {"e1": {"role": "button"}}}}


@pytest.mark.asyncio
async def test_screenshot_uses_direct_cdp(monkeypatch):
    png = b"\x89PNG\r\n"

    async def fake_cdp_call(cdp_port: int, method: str, params=None):
        assert cdp_port == 9222
        assert method == "Page.captureScreenshot"
        assert params == {"format": "png", "fromSurface": True}
        return {"data": base64.b64encode(png).decode("ascii")}

    monkeypatch.setattr(adapter_module, "_cdp_call", fake_cdp_call)
    adapter = AgentBrowserAdapter()
    adapter._session_ports["sid"] = 9222

    assert await adapter.screenshot_png_bytes("sid") == png
