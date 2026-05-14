"""CLI entrypoint: `uv run python -m mayra_orchestrator` (dev server)."""
from __future__ import annotations

import os

import uvicorn

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings


def main() -> None:
    port = int(os.environ.get("MAYRA_PORT", "8765"))
    token = os.environ.get("MAYRA_TOKEN", "dev-token-change-me")
    settings = AppSettings(token=token, include_contract_routes=True)
    app = create_app(settings)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
