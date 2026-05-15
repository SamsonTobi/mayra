"""§B.2 API contract tests — httpx.AsyncClient + ASGITransport, no network."""
from __future__ import annotations

import asyncio
import json

import pytest

from mayra_orchestrator.errors import BrowserError
from tests.contract.conftest import auth_headers, parse_sse_events

pytestmark = pytest.mark.contract


@pytest.mark.asyncio
async def test_healthz_returns_ok_without_auth(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "agent_browser_ok" in body


@pytest.mark.asyncio
async def test_missing_token_returns_401(client, app_settings):
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"]},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_external_host_rejected_with_400(client):
    r = await client.get("/healthz", headers={"Host": "evil.com"})
    assert r.status_code == 400
    assert r.json().get("detail") == "bad host"


@pytest.mark.asyncio
async def test_create_task_returns_task_id_and_persists_row(client, app, app_settings):
    r = await client.post(
        "/v1/tasks",
        json={"goal": "download transcript", "allowed_domains": ["example.com"]},
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 200
    body = r.json()
    assert "task_id" in body
    tid = body["task_id"]
    assert tid in app.state.registry.tasks
    assert app.state.registry.tasks[tid].goal == "download transcript"


@pytest.mark.asyncio
async def test_abort_cancels_in_flight_task_and_returns_aborted(client, app, app_settings):
    r = await client.post(
        "/v1/tasks",
        json={
            "goal": "x",
            "allowed_domains": ["example.com"],
            "start_blocked_sleeper": True,
        },
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    await asyncio.sleep(0.05)
    r2 = await client.post(f"/v1/tasks/{tid}/abort", headers=auth_headers(app_settings.token))
    assert r2.status_code == 200
    assert r2.json() == {"status": "aborted"}
    runner = app.state.registry.tasks[tid].blocked_runner
    assert runner is not None
    assert runner.cancelled()


@pytest.mark.asyncio
async def test_message_queues_for_running_loop(client, app, app_settings):
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"]},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    await client.post(
        f"/v1/tasks/{tid}/message",
        json={"text": "steer left"},
        headers=auth_headers(app_settings.token),
    )
    msg = await asyncio.wait_for(app.state.registry.tasks[tid].messages.get(), timeout=1.0)
    assert msg == "steer left"


@pytest.mark.asyncio
async def test_approve_releases_loop_event(client, app, app_settings):
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"]},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    ev = app.state.registry.tasks[tid].approval_event
    assert not ev.is_set()
    aid = app.state.approval_registry.register(tid)
    await client.post(
        "/v1/actions/approve",
        json={"approval_id": aid, "decision": "approve"},
        headers=auth_headers(app_settings.token),
    )
    assert ev.is_set()


@pytest.mark.asyncio
async def test_validate_returns_latency_ms_on_success(client, app_settings):
    r = await client.post(
        "/v1/settings/validate",
        json={"provider": "gemini", "model": "gemini-2.5-flash"},
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert isinstance(data["latency_ms"], int)
    assert data["latency_ms"] >= 1


@pytest.mark.asyncio
async def test_ui_log_redacts_known_patterns_before_writing(client, app, app_settings):
    r = await client.post(
        "/v1/logs/ui",
        json={
            "event": "ui.click",
            "fields": {"note": "Authorization: Bearer sk-abcdefghijklmnopqrstuvwxyz0123456789"},
        },
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 200
    assert app.state.ui_logs
    stored = app.state.ui_logs[-1]["fields"]["note"]
    assert "sk-abc" not in stored
    assert "[REDACTED]" in stored


@pytest.mark.asyncio
async def test_stream_emits_token_then_action_then_done(client, app_settings):
    c_headers = auth_headers(app_settings.token)
    r0 = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"]},
        headers=c_headers,
    )
    tid = r0.json()["task_id"]
    async with client.stream(
        "GET",
        f"/v1/chat/stream?task_id={tid}&token={app_settings.token}",
        headers={"Host": "127.0.0.1:8000"},
    ) as resp:
        assert resp.status_code == 200
        raw = (await resp.aread()).decode()
    events = parse_sse_events(raw)
    kinds = [e for e, _ in events]
    assert kinds[:2] == ["token", "token"]
    assert "action" in kinds
    assert "done" in kinds
    done_data = next(d for e, d in events if e == "done")
    payload = json.loads(done_data)
    assert payload["task_id"] == tid
    assert payload["status"] == "success"


@pytest.mark.asyncio
async def test_live_stream_reports_browser_snapshot_failures(client, app, app_settings):
    async def fail_snapshot(session_id: str):
        _ = session_id
        raise BrowserError("snapshot failed")

    app.state.session_browser.snapshot = fail_snapshot
    headers = auth_headers(app_settings.token)
    connected = await client.post(
        "/v1/sessions/connect",
        json={"port": 9222},
        headers=headers,
    )
    sid = connected.json()["session_id"]
    created = await client.post(
        "/v1/tasks",
        json={
            "goal": "x",
            "allowed_domains": ["example.com"],
            "session_id": sid,
            "start_agent_loop": True,
            "max_steps": 1,
        },
        headers=headers,
    )
    tid = created.json()["task_id"]

    async with client.stream(
        "GET",
        f"/v1/chat/stream?task_id={tid}&token={app_settings.token}",
        headers={"Host": "127.0.0.1:8000"},
    ) as resp:
        assert resp.status_code == 200
        raw = (await resp.aread()).decode()

    events = parse_sse_events(raw)
    kinds = [event for event, _ in events]
    assert "status" in kinds
    assert "error" in kinds
    assert "done" in kinds
    error_payload = json.loads(next(data for event, data in events if event == "error"))
    assert error_payload["code"] == "browser_error"
    assert error_payload["message"] == "snapshot failed"
    done_payload = json.loads(next(data for event, data in events if event == "done"))
    assert done_payload["status"] == "failed"


@pytest.mark.asyncio
async def test_unknown_approval_returns_404(client, app_settings):
    r = await client.post(
        "/v1/actions/approve",
        json={"approval_id": "00000000-0000-0000-0000-000000000000", "decision": "approve"},
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_task_message_owner_mismatch_returns_403(client, app_settings):
    r0 = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"]},
        headers=auth_headers(app_settings.token, owner_id="alice"),
    )
    tid = r0.json()["task_id"]
    r1 = await client.post(
        f"/v1/tasks/{tid}/message",
        json={"text": "nope"},
        headers=auth_headers(app_settings.token, owner_id="bob"),
    )
    assert r1.status_code == 403


@pytest.mark.asyncio
async def test_action_validation_error_returns_422_with_code_and_correlation_id(
    client, app_settings
):
    r = await client.post(
        "/v1/contract/raise-action-validation",
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "action_validation_error"
    assert body["message"] == "boom"
    assert len(body.get("correlation_id", "")) >= 8
