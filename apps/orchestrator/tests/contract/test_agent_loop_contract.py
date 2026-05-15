"""Stage T5 agent loop — ASGI contract coverage (no network)."""
from __future__ import annotations

import asyncio
import json

import pytest

from tests.contract.conftest import (
    FakeBrowser,
    FakeModelClient,
    auth_headers,
    parse_sse_events,
    read_sse_body,
)

pytestmark = pytest.mark.contract

_VALID_CLICK = (
    "Click ok.\n===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"ok"}'
)

_DELETE_CLICK = (
    "Click delete.\n===ACTION===\n"
    '{"action":"click","target_ref":"@e1","value":null,"risk":"low","reason":"del"}'
)

_TYPE_PASSWORD = (
    "Fill password.\n===ACTION===\n"
    '{"action":"type","target_ref":"@e2","value":"hunter2","risk":"low","reason":"login"}'
)

_MALFORMED = "missing delimiter and json"


@pytest.mark.asyncio
async def test_agent_loop_success_stream_done(client, app, app_settings):
    app.state.model_client = FakeModelClient(scripted_replies=[_VALID_CLICK])
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    assert r.status_code == 200
    tid = r.json()["task_id"]
    raw = await read_sse_body(client, app_settings, tid)
    events = parse_sse_events(raw)
    kinds = [e for e, _ in events]
    assert "done" in kinds
    token_text = "".join(data for event, data in events if event == "token")
    assert "===ACTION===" not in token_text
    assert '"action"' not in token_text
    done_data = json.loads(next(d for e, d in events if e == "done"))
    assert done_data["status"] == "success"
    assert app.state.browser.executions


@pytest.mark.asyncio
async def test_agent_loop_high_risk_stream_includes_approval_event(client, app, app_settings):
    app.state.browser = FakeBrowser(
        nodes=[{"ref": "@e1", "role": "button", "name": "Delete everything"}],
    )
    app.state.model_client = FakeModelClient(scripted_replies=[_DELETE_CLICK])

    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]

    reader = asyncio.create_task(read_sse_body(client, app_settings, tid))
    approved = False
    try:
        while True:
            if reader.done():
                break
            ids = app.state.approval_registry.pending_approval_ids
            if ids and not approved:
                await client.post(
                    "/v1/actions/approve",
                    json={"approval_id": ids[0], "decision": "approve"},
                    headers=auth_headers(app_settings.token),
                )
                approved = True
            await asyncio.sleep(0.01)
        raw = reader.result()
    finally:
        if not reader.done():
            reader.cancel()
            try:
                await reader
            except asyncio.CancelledError:
                pass

    assert approved, "high-risk action should register an approval id"
    kinds = [e for e, _ in parse_sse_events(raw)]
    assert "approval" in kinds


@pytest.mark.asyncio
async def test_agent_loop_rejecting_high_risk_action_aborts(client, app, app_settings):
    app.state.browser = FakeBrowser(
        nodes=[{"ref": "@e1", "role": "button", "name": "Delete account"}],
    )
    app.state.model_client = FakeModelClient(scripted_replies=[_DELETE_CLICK])

    r = await client.post(
        "/v1/tasks",
        json={"goal": "delete", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]

    reader = asyncio.create_task(read_sse_body(client, app_settings, tid))
    rejected = False
    try:
        while not reader.done():
            ids = app.state.approval_registry.pending_approval_ids
            if ids and not rejected:
                await client.post(
                    "/v1/actions/approve",
                    json={"approval_id": ids[0], "decision": "reject"},
                    headers=auth_headers(app_settings.token),
                )
                rejected = True
            await asyncio.sleep(0.01)
        raw = reader.result()
    finally:
        if not reader.done():
            reader.cancel()
            try:
                await reader
            except asyncio.CancelledError:
                pass

    done_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "done"))
    assert done_data["status"] == "aborted"
    assert not app.state.browser.executions


@pytest.mark.asyncio
async def test_agent_loop_action_log_redacts_password_ref(client, app, app_settings):
    app.state.browser = FakeBrowser(
        nodes=[
            {"ref": "@e2", "role": "textbox", "name": "Password", "is_password_or_otp": True},
        ],
    )
    app.state.model_client = FakeModelClient(scripted_replies=[_TYPE_PASSWORD])

    r = await client.post(
        "/v1/tasks",
        json={"goal": "login", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    reader = asyncio.create_task(read_sse_body(client, app_settings, tid))
    approved = False
    try:
        while not reader.done():
            ids = app.state.approval_registry.pending_approval_ids
            if ids and not approved:
                await client.post(
                    "/v1/actions/approve",
                    json={"approval_id": ids[0], "decision": "approve"},
                    headers=auth_headers(app_settings.token),
                )
                approved = True
            await asyncio.sleep(0.01)
        raw = reader.result()
    finally:
        if not reader.done():
            reader.cancel()
            try:
                await reader
            except asyncio.CancelledError:
                pass
    action_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "action"))

    assert action_data["message"]["action"]["value"] == "[REDACTED:password_field]"
    assert "hunter2" not in raw


@pytest.mark.asyncio
async def test_abort_cancels_agent_runner_waiting_on_model(client, app, app_settings):
    hang = asyncio.Event()
    app.state.model_client = FakeModelClient(
        scripted_replies=[_VALID_CLICK],
        hang_on_complete_streaming=hang,
    )
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    await asyncio.sleep(0.05)
    runner = app.state.registry.tasks[tid].agent_runner
    assert runner is not None
    assert not runner.done()
    await client.post(f"/v1/tasks/{tid}/abort", headers=auth_headers(app_settings.token))
    for _ in range(400):
        if runner.done():
            break
        await asyncio.sleep(0.01)
    assert runner.done()
    assert runner.cancelled()


@pytest.mark.asyncio
async def test_exhaust_budget_probe_emits_budget_exhausted(client, app, app_settings):
    app.state.model_client = FakeModelClient(scripted_replies=[_VALID_CLICK])
    r = await client.post(
        "/v1/tasks",
        json={
            "goal": "probe",
            "allowed_domains": ["example.com"],
            "start_agent_loop": True,
            "max_steps": 3,
            "exhaust_budget_probe": True,
        },
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    raw = await read_sse_body(client, app_settings, tid)
    done_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "done"))
    assert done_data["status"] == "budget_exhausted"


@pytest.mark.asyncio
async def test_schema_repair_then_success(client, app, app_settings):
    app.state.model_client = FakeModelClient(scripted_replies=[_MALFORMED, _VALID_CLICK])
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    raw = await read_sse_body(client, app_settings, tid)
    done_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "done"))
    assert done_data["status"] == "success"


@pytest.mark.asyncio
async def test_schema_repair_then_fail(client, app, app_settings):
    app.state.model_client = FakeModelClient(scripted_replies=[_MALFORMED, _MALFORMED])
    r = await client.post(
        "/v1/tasks",
        json={"goal": "x", "allowed_domains": ["example.com"], "start_agent_loop": True},
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    raw = await read_sse_body(client, app_settings, tid)
    done_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "done"))
    assert done_data["status"] == "failed"


@pytest.mark.asyncio
async def test_agent_loop_uses_selected_browser_session(client, app, app_settings):
    app.state.model_client = FakeModelClient(scripted_replies=[_VALID_CLICK])
    connected = await client.post(
        "/v1/sessions/connect",
        json={"port": 9222},
        headers=auth_headers(app_settings.token),
    )
    sid = connected.json()["session_id"]

    r = await client.post(
        "/v1/tasks",
        json={
            "goal": "x",
            "allowed_domains": ["example.com"],
            "session_id": sid,
            "start_agent_loop": True,
        },
        headers=auth_headers(app_settings.token),
    )
    tid = r.json()["task_id"]
    raw = await read_sse_body(client, app_settings, tid)
    done_data = json.loads(next(d for e, d in parse_sse_events(raw) if e == "done"))

    assert done_data["status"] == "success"
    assert app.state.session_browser.executions
    assert app.state.session_browser.executions[0][0] == sid
