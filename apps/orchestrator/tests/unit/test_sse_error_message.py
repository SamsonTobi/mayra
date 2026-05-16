"""Sanitized SSE error text."""

from __future__ import annotations

import pytest

from mayra_orchestrator.agent_loop import _sse_error_message

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("incoming", "expected_substring"),
    [
        ("None", "No detail"),
        ("", "No detail"),
        ("  ", "No detail"),
        (None, "No detail"),
        ("real error", "real error"),
    ],
)
def test_sse_error_message_avoids_none_placeholder(incoming, expected_substring):
    assert expected_substring in _sse_error_message(incoming)
