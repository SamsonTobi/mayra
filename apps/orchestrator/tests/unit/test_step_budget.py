"""`StepBudget` — centralized counter for step/repair/retry budgets.

Drives `mayra_orchestrator.step_budget.StepBudget`. The agent loop must NOT
scatter counters across modules; everything goes through this dataclass.
"""
from __future__ import annotations

import pytest

from mayra_orchestrator.errors import BudgetExhaustedError
from mayra_orchestrator.step_budget import StepBudget


pytestmark = pytest.mark.unit


def test_decrement_until_zero_raises_budget_exhausted():
    b = StepBudget(max_steps=3, remaining=3)
    b.consume_step()
    b.consume_step()
    b.consume_step()
    with pytest.raises(BudgetExhaustedError):
        b.consume_step()


def test_repair_budget_is_per_step_and_resets():
    b = StepBudget(max_steps=5, remaining=5, repair_attempts_per_step=1)
    b.consume_repair()
    with pytest.raises(BudgetExhaustedError):
        b.consume_repair()
    b.consume_step()
    b.consume_repair()


def test_retry_budget_is_per_step_and_resets():
    b = StepBudget(max_steps=5, remaining=5, max_retries_per_step=2)
    b.consume_retry()
    b.consume_retry()
    with pytest.raises(BudgetExhaustedError):
        b.consume_retry()
    b.consume_step()
    b.consume_retry()
