"""Process settings (env-driven in real runs; explicit in tests)."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MAYRA_", case_sensitive=False)

    token: str = Field(default="dev-token-change-me")
    include_contract_routes: bool = False
