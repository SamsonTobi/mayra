"""Centralized step / repair / retry budget.

The agent loop calls `consume_step()` once per planning loop, `consume_repair()`
on a SchemaRepairableError, and `consume_retry()` on a recoverable browser
error. Per-step counters reset on `consume_step()`.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from mayra_orchestrator.errors import BudgetExhaustedError


@dataclass
class StepBudget:
    max_steps: int
    remaining: int
    max_retries_per_step: int = 2
    repair_attempts_per_step: int = 1
    _repair_used: int = field(default=0, init=False, repr=False)
    _retry_used: int = field(default=0, init=False, repr=False)

    def consume_step(self) -> None:
        if self.remaining <= 0:
            raise BudgetExhaustedError("step_budget")
        self.remaining -= 1
        self._repair_used = 0
        self._retry_used = 0

    def consume_repair(self) -> None:
        if self._repair_used >= self.repair_attempts_per_step:
            raise BudgetExhaustedError("repair_budget")
        self._repair_used += 1

    def consume_retry(self) -> None:
        if self._retry_used >= self.max_retries_per_step:
            raise BudgetExhaustedError("retry_budget")
        self._retry_used += 1
