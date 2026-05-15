"""Contract tests for `/v1/sessions/*`."""
from __future__ import annotations

import pytest

from tests.contract.conftest import auth_headers

pytestmark = pytest.mark.contract


@pytest.mark.asyncio
async def test_sessions_connect_allows_browser_preflight(client):
    r = await client.options(
        "/v1/sessions/connect",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


@pytest.mark.asyncio
async def test_sessions_connect_and_snapshot(client, app_settings, app):
    h = auth_headers(app_settings.token)
    r = await client.post("/v1/sessions/connect", json={"port": 9222}, headers=h)
    assert r.status_code == 200
    sid = r.json()["session_id"]
    assert sid

    r2 = await client.post(f"/v1/sessions/{sid}/snapshot", headers=h)
    assert r2.status_code == 200
    data = r2.json()
    assert data["node_count"] == 247
    assert data["screenshot_path"].endswith("1-snapshot.webp")

    r3 = await client.get("/v1/sessions", headers=h)
    assert r3.status_code == 200
    rows = r3.json()
    assert len(rows) == 1
    assert rows[0]["last_node_count"] == 247


@pytest.mark.asyncio
async def test_sessions_snapshot_404(client, app_settings):
    h = auth_headers(app_settings.token)
    r = await client.post("/v1/sessions/not-a-uuid/snapshot", headers=h)
    assert r.status_code == 404
