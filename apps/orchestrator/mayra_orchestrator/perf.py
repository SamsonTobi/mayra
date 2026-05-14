"""Single context manager for per-step latency.

All latency metrics MUST flow through this class. Do not subtract
`time.time()` at call sites.
"""
from __future__ import annotations

import time
from types import TracebackType
from typing import Self


class PerfTimer:
    def __init__(self) -> None:
        self.ms: int | None = None
        self._start: float | None = None

    def __enter__(self) -> Self:
        self._start = time.perf_counter()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        assert self._start is not None
        self.ms = int((time.perf_counter() - self._start) * 1000)

    async def __aenter__(self) -> Self:
        return self.__enter__()

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.__exit__(exc_type, exc, tb)
