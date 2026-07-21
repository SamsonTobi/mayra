"""Tests for cloud-mode auth, screenshots, and shutdown."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings


@pytest.fixture(autouse=True)
def _clear_login_rate_limiter():
    """Clear the module-level login rate limiter between tests."""
    from mayra_orchestrator.api.routes.auth import _login_attempts
    _login_attempts.clear()
    yield
    _login_attempts.clear()


@pytest.fixture
def cloud_settings(tmp_path) -> AppSettings:
    data = tmp_path / "mayra-cloud"
    data.mkdir()
    (data / "screenshots").mkdir()
    return AppSettings(
        mode="cloud",
        auth_mode="password",
        shared_password="test-shared-password",
        data_dir=data,
        screenshot_base_url="https://mayra-test.modal.run",
        screenshot_dir=data / "screenshots",
        cors_origins="https://mayra-web.vercel.app",
        allowed_hosts="*",
        include_contract_routes=False,
        token="should-not-be-used",
    )


@pytest.fixture
def cloud_app(cloud_settings):
    return create_app(cloud_settings)


@pytest_asyncio.fixture
async def cloud_client(cloud_app):
    transport = ASGITransport(app=cloud_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestPasswordAuth:
    @pytest.mark.asyncio
    async def test_login_with_correct_password(self, cloud_client, cloud_settings):
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        assert r.status_code == 200
        body = r.json()
        assert "token" in body
        assert "user_id" in body
        assert "expires_at" in body
        assert len(body["token"]) > 0

    @pytest.mark.asyncio
    async def test_login_with_wrong_password(self, cloud_client):
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "wrong-password"},
        )
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_session_token_works_for_protected_route(self, cloud_client):
        # Login
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        assert r.status_code == 200
        token = r.json()["token"]

        # Use the session token to access a protected route
        r2 = await cloud_client.get(
            "/v1/sessions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 200
        assert r2.json() == []

    @pytest.mark.asyncio
    async def test_old_static_token_rejected_in_password_mode(self, cloud_client):
        # The old MAYRA_TOKEN should NOT work when auth_mode=password
        r = await cloud_client.get(
            "/v1/sessions",
            headers={"Authorization": "Bearer should-not-be-used"},
        )
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, cloud_client):
        r = await cloud_client.get(
            "/v1/sessions",
            headers={"Authorization": "Bearer invalid-session-token"},
        )
        assert r.status_code == 401


class TestShutdownDisabled:
    @pytest.mark.asyncio
    async def test_shutdown_disabled_in_cloud_mode(self, cloud_client):
        # Login first to get a valid token
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        token = r.json()["token"]

        # Shutdown should be 403 in cloud mode
        r2 = await cloud_client.post(
            "/v1/shutdown",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 403
        assert "disabled in cloud mode" in r2.json()["detail"]


class TestScreenshots:
    @pytest.mark.asyncio
    async def test_screenshot_endpoint_serves_file(self, cloud_client, cloud_settings):
        # Create a test screenshot
        shot_dir = cloud_settings.screenshot_dir / "test-session"
        shot_dir.mkdir(parents=True, exist_ok=True)
        shot_path = shot_dir / "1-snapshot.webp"
        shot_path.write_bytes(b"fake-webp-data")

        # Login
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        token = r.json()["token"]

        # Fetch the screenshot
        r2 = await cloud_client.get(
            "/v1/screenshots/test-session/1-snapshot.webp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 200
        assert r2.content == b"fake-webp-data"

    @pytest.mark.asyncio
    async def test_screenshot_path_traversal_blocked(self, cloud_client, cloud_settings):
        # Login
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        token = r.json()["token"]

        # Attempt path traversal
        r2 = await cloud_client.get(
            "/v1/screenshots/../../../etc/passwd",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_screenshot_not_found(self, cloud_client):
        # Login
        r = await cloud_client.post(
            "/v1/auth/login",
            json={"password": "test-shared-password"},
        )
        token = r.json()["token"]

        r2 = await cloud_client.get(
            "/v1/screenshots/nonexistent/file.webp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 404


class TestScreenshotUrlHelper:
    def test_screenshot_url_when_base_url_set(self, cloud_settings, tmp_path):
        shot = cloud_settings.data_dir / "screenshots" / "sid" / "1.webp"
        shot.parent.mkdir(parents=True, exist_ok=True)
        shot.touch()
        url = cloud_settings.screenshot_url_for(shot)
        assert url == "https://mayra-test.modal.run/v1/screenshots/sid/1.webp"

    def test_screenshot_url_none_when_base_url_unset(self, tmp_path):
        settings = AppSettings(data_dir=tmp_path)
        shot = tmp_path / "screenshots" / "sid" / "1.webp"
        shot.parent.mkdir(parents=True, exist_ok=True)
        shot.touch()
        url = settings.screenshot_url_for(shot)
        assert url is None

    def test_screenshot_url_none_for_outside_root(self, cloud_settings, tmp_path):
        outside = tmp_path / "other" / "file.webp"
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.touch()
        url = cloud_settings.screenshot_url_for(outside)
        assert url is None
