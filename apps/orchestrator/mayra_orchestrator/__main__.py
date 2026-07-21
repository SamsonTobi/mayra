"""CLI entrypoint: `uv run python -m mayra_orchestrator` (dev server)."""
from __future__ import annotations

import logging
import os
import socket
import sys
from pathlib import Path

import uvicorn

from mayra_orchestrator.api.app import create_app
from mayra_orchestrator.settings import AppSettings


def _pick_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return int(port)


def _parse_cli() -> tuple[int, str, Path]:
    port: int | None = None
    token = os.environ.get("MAYRA_TOKEN", "dev-token-change-me")
    data_dir: Path | None = None
    for a in sys.argv[1:]:
        if a.startswith("--port="):
            v = a.partition("=")[2]
            port = _pick_free_port() if v == "auto" else int(v)
        elif a.startswith("--token="):
            token = a.partition("=")[2]
        elif a.startswith("--data-dir="):
            data_dir = Path(a.partition("=")[2]).expanduser()
    if port is None:
        raw = os.environ.get("MAYRA_PORT", "8765")
        port = _pick_free_port() if raw == "auto" else int(raw)
    if data_dir is None:
        dd = os.environ.get("MAYRA_DATA_DIR")
        data_dir = Path(dd).expanduser() if dd else Path.home() / ".mayra"
    return port, token, data_dir


def _configure_logging() -> None:
    """Set up logging so only signal surfaces, not library chatter.

    Per-step browser/model work touches httpx, websockets, PIL, and asyncio —
    each of which logs 5-20 DEBUG lines per call at root DEBUG level. That
    floods the console and buries the agent-loop / adapter lines we actually
    need to debug stuck clicks. Keep `mayra.orchestrator.*` at DEBUG (we own
    those) and silence the rest.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )
    # Our own loggers stay at DEBUG — step transitions, pre/post tab diff,
    # DOM state signatures, agent-browser subprocess payloads.
    logging.getLogger("mayra.orchestrator").setLevel(logging.DEBUG)
    logging.getLogger("mayra_orchestrator").setLevel(logging.DEBUG)
    # Library noise that fires on every HTTP/WS/PIL call:
    for noisy in (
        "httpcore",
        "httpx",
        "websockets",
        "asyncio",
        "PIL",
        "PIL.PngImagePlugin",
        "PIL.Image",
        "keyring",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def main() -> None:
    if sys.platform == "win32":
        import asyncio
        # ProactorEventLoop uses IOCP which correctly handles subprocess pipes
        # on Windows. SelectorEventLoop uses select() which only supports
        # sockets on Windows — causing proc.communicate() to hang forever.
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    _configure_logging()

    port, token, data_dir = _parse_cli()
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "screenshots").mkdir(parents=True, exist_ok=True)
    os.environ["MAYRA_DATA_DIR"] = str(data_dir)
    settings = AppSettings(token=token, include_contract_routes=True, data_dir=data_dir)
    app = create_app(settings)
    host = os.environ.get("MAYRA_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
