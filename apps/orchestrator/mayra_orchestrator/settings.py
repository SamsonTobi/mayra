"""Process settings (env-driven in real runs; explicit in tests)."""
from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MAYRA_", case_sensitive=False)

    token: str = Field(default="dev-token-change-me")
    include_contract_routes: bool = False
    default_owner_id: str = Field(default="local")
    data_dir: Path = Field(default_factory=lambda: Path.home() / ".mayra")
    provider_keys_base64: str | None = None
    default_model: str = "gemini-2.5-flash"
    default_throttle_rpm: int = Field(default=10, ge=1, le=600)
