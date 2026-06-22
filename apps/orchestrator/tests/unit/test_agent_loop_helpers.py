from __future__ import annotations

import pytest
from mayra_orchestrator.agent_loop import _effective_allowed_domains

pytestmark = pytest.mark.unit


def test_effective_allowed_domains_empty():
    res = _effective_allowed_domains([], {})
    assert res == ["example.com"]


def test_effective_allowed_domains_snap_host():
    res = _effective_allowed_domains([], {"url": "https://github.com/profile"})
    assert res == ["github.com"]


def test_effective_allowed_domains_active_tabs():
    active_tabs = [
        {"title": "Google", "url": "https://google.com"},
        {"title": "Yahoo", "url": "https://yahoo.com"},
    ]
    res = _effective_allowed_domains(["github.com"], {"url": "https://github.com/profile"}, active_tabs)
    assert set(res) == {"github.com", "google.com", "yahoo.com"}


def test_effective_allowed_domains_removes_placeholder():
    active_tabs = [
        {"title": "Google", "url": "https://google.com"},
    ]
    res = _effective_allowed_domains(["example.com"], {}, active_tabs)
    assert res == ["google.com"]
