"""Process settings (env-driven in real runs; explicit in tests)."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MAYRA_", case_sensitive=False)

    token: str = Field(default="dev-token-change-me")
    include_contract_routes: bool = False
    default_owner_id: str = Field(default="local")
    data_dir: Path = Field(default_factory=lambda: Path.home() / ".mayra")
    provider_keys_base64: str | None = None
    default_model: str = "gemini-2.5-flash-lite"
    default_throttle_rpm: int = Field(default=10, ge=1, le=600)

    # Cloud migration fields — all default to existing local-mode behavior.
    # Set via MAYRA_MODE, MAYRA_AUTH_MODE, etc. environment variables.
    mode: Literal["local", "cloud"] = "local"
    auth_mode: Literal["token", "password"] = "token"
    shared_password: str | None = None
    cors_origins: str | None = None
    allowed_hosts: str | None = None
    chromium_launch_mode: Literal["user", "managed"] = "user"
    chromium_flags: str = "--no-sandbox,--headless=new,--disable-gpu,--disable-dev-shm-usage"
    screenshot_base_url: str | None = None
    screenshot_dir: Path | None = None

    def screenshot_url_for(self, absolute_path: str | Path) -> str | None:
        """Build an HTTP screenshot URL from an absolute filesystem path.

        Returns None when screenshot_base_url is not set (local mode).
        The relative path is computed against screenshot_dir (or data_dir/screenshots).
        """
        if not self.screenshot_base_url:
            return None
        import os
        root = str(self.screenshot_dir) if self.screenshot_dir else str(self.data_dir / "screenshots")
        try:
            rel = os.path.relpath(str(absolute_path), root)
        except (ValueError, TypeError):
            return None
        # Guard against path traversal — relpath should never start with ..
        if rel.startswith(".."):
            return None
        return f"{self.screenshot_base_url}/v1/screenshots/{Path(rel).as_posix()}"
