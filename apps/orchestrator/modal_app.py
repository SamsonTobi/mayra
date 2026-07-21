"""Modal entrypoint for the Mayra orchestrator (cloud mode, Path A).

Deploys the FastAPI orchestrator as a Modal ASGI app with in-container
Chromium (headless) and the Rust agent-browser binary.

Usage (from repo root):
    modal deploy apps/orchestrator/modal_app.py

Requires the following Modal Secrets (create before deploying):
    mayra-auth      → MAYRA_SHARED_PASSWORD
    mayra-providers → MAYRA_PROVIDER_KEYS_BASE64
    mayra-config    → MAYRA_SCREENSHOT_BASE_URL, MAYRA_CORS_ORIGINS  (after first deploy)

Environment (set automatically by the image):
    MAYRA_MODE=cloud
    MAYRA_AUTH_MODE=password
    MAYRA_CHROMIUM_LAUNCH_MODE=managed
    AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
    MAYRA_AGENT_BROWSER_BIN=/usr/local/bin/agent-browser
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import modal

if TYPE_CHECKING:
    from fastapi import FastAPI

# --- Image definition --------------------------------------------------------
#
# Debian slim + Python 3.12 + Chromium (headless) + agent-browser Rust binary.
# The agent-browser binary is extracted from the npm package — no Node runtime
# is needed at runtime (it's a static Rust binary).

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("chromium", "nodejs", "npm", "procps")
    # Python dependencies (installed first so they're cached)
    .pip_install(
        "fastapi>=0.115",
        "uvicorn[standard]>=0.32",
        "pydantic>=2.9",
        "pydantic-settings>=2.6",
        "httpx>=0.27",
        "aiolimiter>=1.1",
        "pillow>=12.2.0",
        "websockets>=16.0",
    )
    # Install agent-browser from npm and extract the static Rust binary.
    # npm creates a JS wrapper symlink at /usr/local/bin/agent-browser — we replace
    # it with the actual static Rust binary (no Node runtime needed at runtime).
    # rm -f first to avoid "same file" errors from npm's symlink/hardlink.
    .run_commands(
        "npm install -g agent-browser || true",
        'BIN_DIR="$(npm root -g)/agent-browser/bin" && '
        'rm -f /usr/local/bin/agent-browser && '
        'if [ -f "$BIN_DIR/agent-browser-linux-x64" ]; then '
        '  install -m 0755 "$BIN_DIR/agent-browser-linux-x64" /usr/local/bin/agent-browser; '
        'elif ls "$BIN_DIR"/agent-browser-linux-* 1>/dev/null 2>&1; then '
        '  install -m 0755 "$BIN_DIR"/agent-browser-linux-* /usr/local/bin/agent-browser; '
        'else '
        '  echo "ERROR: agent-browser Linux binary not found in $BIN_DIR" && ls -la "$BIN_DIR" && exit 1; '
        'fi',
        # Verify the binary is executable
        "/usr/local/bin/agent-browser --version || echo 'agent-browser binary extracted (version check skipped)'",
    )
    # Copy only the source we need (not .venv, tests, screenshots, etc.)
    # copy=True is required because we run pip install on these files in the next step.
    .add_local_dir("apps/orchestrator/mayra_orchestrator", "/app/orchestrator/mayra_orchestrator", copy=True)
    .add_local_file("apps/orchestrator/pyproject.toml", "/app/orchestrator/pyproject.toml", copy=True)
    .add_local_dir("packages/contracts/python/mayra_contracts", "/app/contracts-python/mayra_contracts", copy=True)
    .add_local_file("packages/contracts/python/pyproject.toml", "/app/contracts-python/pyproject.toml", copy=True)
    # Install contracts first, then orchestrator with --no-deps
    # (--no-deps because pyproject.toml has a uv workspace ref that pip can't resolve;
    #  all real deps are already pip_install'd above)
    .run_commands(
        "pip install /app/contracts-python",
        "pip install -e /app/orchestrator --no-deps",
    )
    .env({
        "MAYRA_MODE": "cloud",
        "MAYRA_AUTH_MODE": "password",
        "MAYRA_CHROMIUM_LAUNCH_MODE": "managed",
        "MAYRA_HOST": "0.0.0.0",
        "MAYRA_ALLOWED_HOSTS": "*",
        "AGENT_BROWSER_EXECUTABLE_PATH": "/usr/bin/chromium",
        "MAYRA_AGENT_BROWSER_BIN": "/usr/local/bin/agent-browser",
        # Screenshots go to data_dir/screenshots (where the agent loop writes them).
        # The Volume is mounted at /volumes/mayra-data so they persist across restarts.
        "MAYRA_DATA_DIR": "/volumes/mayra-data",
    })
)

# --- Volume for screenshots --------------------------------------------------

screenshots_volume = modal.Volume.from_name("mayra-screenshots", create_if_missing=True)

# Note: the Volume is mounted at /volumes/mayra-data and MAYRA_DATA_DIR points there.
# Screenshots are written to {MAYRA_DATA_DIR}/screenshots/ by the agent loop.
# The screenshot_url_for() helper in settings.py uses data_dir/screenshots as the
# root for computing relative paths — this matches where files are actually written.

# --- App definition ----------------------------------------------------------

app = modal.App("mayra-orchestrator")


@app.function(
    image=image,
    volumes={"/volumes/mayra-data": screenshots_volume},
    secrets=[
        modal.Secret.from_name("mayra-auth"),
        modal.Secret.from_name("mayra-providers"),
        modal.Secret.from_name("mayra-config"),
    ],
    # Scale to zero when idle — no min_containers to avoid 24/7 billing.
    # Cold start adds ~5-15s on first request after idle, but costs $0 when unused.
    # scaledown_window=300 keeps the container warm for 5 minutes after the last
    # request (cheap, avoids repeated cold starts during active use).
    scaledown_window=300,         # 5 minutes idle → scale to zero
    memory=4096,                  # 4GB for Chromium + Python orchestrator
    cpu=2,
    timeout=600,                  # 10 min max per request (SSE streams can be long)
)
@modal.concurrent(max_inputs=4)   # up to 4 concurrent requests per container
@modal.asgi_app()
def mayra_web() -> "FastAPI":
    """ASGI entrypoint — constructs the FastAPI app with cloud-mode settings."""
    import os
    from pathlib import Path

    from mayra_orchestrator.api.app import create_app
    from mayra_orchestrator.settings import AppSettings

    # Build settings from env (set by the image .env() + Modal Secrets)
    settings = AppSettings(
        mode="cloud",
        auth_mode="password",
        chromium_launch_mode="managed",
        data_dir=os.environ.get("MAYRA_DATA_DIR", "/volumes/mayra-data"),
        # Explicitly set screenshot_dir=None to override any stale MAYRA_SCREENSHOT_DIR
        # env var from a previous image layer. Screenshots go to data_dir/screenshots.
        screenshot_dir=None,
        # mayra-config Secret provides:
        #   MAYRA_SCREENSHOT_BASE_URL — the public URL for serving screenshots (= the Modal URL)
        #   MAYRA_CORS_ORIGINS — comma-separated allowed origins for the web UI
        screenshot_base_url=os.environ.get("MAYRA_SCREENSHOT_BASE_URL"),
        cors_origins=os.environ.get("MAYRA_CORS_ORIGINS"),
        allowed_hosts="*",
    )

    # Ensure data + screenshot dirs exist
    Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
    if settings.screenshot_dir:
        Path(settings.screenshot_dir).mkdir(parents=True, exist_ok=True)

    # Modal injects secrets as env vars at container start.
    # Re-read them here since BaseSettings may have consumed them during __init__.
    settings.shared_password = os.environ.get("MAYRA_SHARED_PASSWORD")
    settings.provider_keys_base64 = os.environ.get("MAYRA_PROVIDER_KEYS_BASE64")

    if not settings.shared_password:
        import sys
        print("WARNING: MAYRA_SHARED_PASSWORD is not set — password auth will fail.", file=sys.stderr)

    return create_app(settings)
