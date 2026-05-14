"""Nightly / pre-release integration tests (real agent-browser).

Run: `uv run pytest tests/integration -m integration`
Fast PR loop: `uv run pytest -m "not integration"` (default in CI).
"""
from __future__ import annotations

import shutil

import pytest

pytestmark = pytest.mark.integration


def _agent_browser() -> str | None:
    return shutil.which("agent-browser")


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
