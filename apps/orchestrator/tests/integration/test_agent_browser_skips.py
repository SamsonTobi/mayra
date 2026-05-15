"""Nightly / pre-release integration tests (real agent-browser).

Run: `uv run pytest tests/integration -m integration`
Fast PR loop: `uv run pytest -m "not integration"` (default in CI).
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings

pytestmark = pytest.mark.integration


def _agent_browser() -> str | None:
    return shutil.which("agent-browser")


@pytest.mark.skipif(_agent_browser() is None, reason="agent-browser not on PATH")
@pytest.mark.asyncio
async def test_open_and_snapshot(tmp_path: Path):
    """Real CDP + agent-browser connect/snapshot (requires Chrome on MAYRA_INTEGRATION_CDP_PORT)."""
    raw = os.environ.get("MAYRA_INTEGRATION_CDP_PORT", "").strip()
    if not raw:
        pytest.skip("set MAYRA_INTEGRATION_CDP_PORT for live Chrome remote-debugging port")

    cdp_port = int(raw)
    data = tmp_path / "data"
    data.mkdir()
    settings = AppSettings(token="integration-token", include_contract_routes=True, data_dir=data)
    application = create_app(settings)

    transport = ASGITransport(app=application)
    async with AsyncClient(
        transport=transport,
        base_url="http://127.0.0.1:8000",
        headers={"Host": "127.0.0.1:8000"},
    ) as client:
        r = await client.post(
            "/v1/sessions/connect",
            json={"port": cdp_port},
            headers={"Authorization": "Bearer integration-token"},
        )
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        r2 = await client.post(
            f"/v1/sessions/{sid}/snapshot",
            headers={"Authorization": "Bearer integration-token"},
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert isinstance(body.get("node_count"), int)
        assert body["node_count"] > 0
        shot = Path(body["screenshot_path"])
        assert shot.is_file()
        assert shot.stat().st_size > 0


@pytest.mark.skipif(_agent_browser() is None, reason="agent-browser not on PATH")
@pytest.mark.asyncio
async def test_loop_smoke_fixture_site():
    """§B.3 — scripted model + real agent-browser against tests/fixtures/sites/."""
    pytest.skip("implement when AgentBrowserAdapter + static fixture server land")


@pytest.mark.skipif(_agent_browser() is None, reason="agent-browser not on PATH")
@pytest.mark.asyncio
async def test_approval_gate_delete_button_pauses_stream():
    """§B.3 — expect `approval` SSE then resume after POST /v1/actions/approve."""
    pytest.skip("implement with fixture page containing Delete account")


@pytest.mark.skipif(_agent_browser() is None, reason="agent-browser not on PATH")
@pytest.mark.asyncio
async def test_abort_within_one_second():
    """§B.3 — start task, POST abort, assert terminal `done` with status=aborted."""
    pytest.skip("implement when TaskRegistry + SSE wired to real loop")


@pytest.mark.skipif(_agent_browser() is None, reason="agent-browser not on PATH")
@pytest.mark.asyncio
async def test_password_value_never_in_log_row():
    """§B.3 — type into password field; grep structured logs for literal secret."""
    pytest.skip("implement when logging + fixture password page exist")
