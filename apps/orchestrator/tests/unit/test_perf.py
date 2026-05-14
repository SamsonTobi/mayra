"""`PerfTimer` — single context manager for per-step latency.

Drives `mayra_orchestrator.perf.PerfTimer`. Spec requires that all latency
metrics are computed via this one timer (no scattered subtraction of
`time.time()` at call sites).
"""
from __future__ import annotations

import asyncio
import time

import pytest

from mayra_orchestrator.perf import PerfTimer


pytestmark = pytest.mark.unit


def test_perf_timer_measures_ms():
    with PerfTimer() as t:
        time.sleep(0.02)

    assert t.ms >= 20
    assert t.ms < 500


def test_perf_timer_ms_is_unset_until_exit():
    t = PerfTimer()
    assert t.ms is None
    with t:
        pass
    assert t.ms is not None
    assert t.ms >= 0


def test_perf_timer_async_context_works():
    async def _go() -> int:
        async with PerfTimer() as t:
            await asyncio.sleep(0.01)
        assert t.ms is not None
        return t.ms

    elapsed = asyncio.run(_go())
    assert elapsed >= 10
