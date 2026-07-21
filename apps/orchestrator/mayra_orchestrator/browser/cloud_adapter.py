"""Cloud browser adapter — wraps AgentBrowserAdapter with Chromium lifecycle management.

In cloud mode, Chromium runs in the container (Path A). This adapter composes
the existing AgentBrowserAdapter (which handles CDP communication) with a
CloudLauncher (which handles Chromium process lifecycle).

On forget_session/close_all, the CloudLauncher kills the Chromium process so
we don't leak headless browsers when sessions end.
"""

from __future__ import annotations

import logging
from typing import Any

from mayra_orchestrator.browser.adapter import AgentBrowserAdapter
from mayra_orchestrator.browser.cloud_launcher import CloudLauncher

log = logging.getLogger(__name__)


class CloudBrowserAdapter:
    """Composition wrapper: AgentBrowserAdapter + CloudLauncher.

    Forwards all attribute access to the inner adapter via __getattr__,
    but overrides forget_session and close_all to also kill Chrome processes.
    """

    def __init__(self, inner: AgentBrowserAdapter, launcher: CloudLauncher) -> None:
        self._inner = inner
        self._launcher = launcher

    def __getattr__(self, name: str) -> Any:
        """Delegate any attribute not defined here to the inner adapter.

        This preserves duck-typed access like `browser._session_ports[...]`
        that the agent loop uses (agent_loop.py:358).
        """
        return getattr(self._inner, name)

    @property
    def launcher(self) -> CloudLauncher:
        return self._launcher

    def forget_session(self, session_id: str) -> None:
        """Drop the session and schedule Chrome process cleanup."""
        port = self._inner._session_ports.get(session_id)
        self._inner.forget_session(session_id)
        if port is not None:
            # Schedule async kill — forget_session is sync in the base adapter,
            # but we're always called from within an async context (FastAPI route).
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._launcher.kill(port))
            except RuntimeError:
                # No running event loop — best-effort sync cleanup
                log.debug("[cloud_adapter] no running loop for Chrome kill on port %d", port)

    async def open(self, cdp_port: int, session_id: str) -> None:
        """Attach to Chromium CDP port — skip overlay installation in cloud mode.

        The overlay (status pill) appears in headless screenshots and confuses
        the model — it sees 'Reading page' text and thinks the page is loading.
        """
        from mayra_orchestrator.browser.adapter import _probe_cdp_endpoint
        log.info("[cloud_adapter] open: session=%s port=%d (no overlay)", session_id[:8], cdp_port)
        await _probe_cdp_endpoint(cdp_port)
        self._inner._session_ports[session_id] = cdp_port
        log.info("[cloud_adapter] open: session=%s registered for port %d", session_id[:8], cdp_port)

    async def close_all(self) -> None:
        """Close all CDP sessions and kill all Chrome processes."""
        await self._inner.close_all()
        await self._launcher.kill_all()

    async def run_doctor(self) -> dict[str, Any]:
        """In cloud mode, doctor checks if agent-browser is available."""
        from mayra_orchestrator.browser.adapter import _lookup_agent_browser_exe
        try:
            exe = _lookup_agent_browser_exe()
        except Exception:
            exe = None
        if exe is None:
            return {
                "ok": False,
                "missing": True,
                "message": "agent-browser not found in container.",
            }
        return {
            "ok": True,
            "missing": False,
            "message": "cloud mode: agent-browser present, Chromium managed by CloudLauncher.",
        }
