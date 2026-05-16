"""Tests for openai_compat.py provider bindings."""

import pytest
import httpx
import base64
from unittest.mock import AsyncMock

from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.prompts.templates import PromptBundle
from mayra_orchestrator.providers.openai_compat import create_groq_client


@pytest.fixture
def mock_httpx():
    return AsyncMock(spec=httpx.AsyncClient)


@pytest.fixture
def prompt_bundle():
    return PromptBundle(
        system_text="SYS",
        user_text="USR",
        image_bytes=b"fake-image",
        image_mime="image/png"
    )


@pytest.mark.asyncio
async def test_openai_compat_health_check_success(mock_httpx):
    mock_httpx.get.return_value = httpx.Response(200)
    
    client = create_groq_client(mock_httpx, "dummy")
    ms = await client.health_check()
    
    assert ms >= 1.0
    mock_httpx.get.assert_called_once()
    assert "Authorization" in mock_httpx.get.call_args.kwargs["headers"]


@pytest.mark.asyncio
async def test_openai_compat_health_check_401(mock_httpx):
    mock_httpx.get.return_value = httpx.Response(401)
    
    client = create_groq_client(mock_httpx, "dummy")
    with pytest.raises(ProviderError) as exc:
        await client.health_check()
        
    assert exc.value.args[0] == "unauthorized"


def test_build_stream_body(mock_httpx, prompt_bundle):
    client = create_groq_client(mock_httpx, "test-key", model="meta-llama")
    body = client._build_stream_body(prompt_bundle, temperature=0.5)
    
    assert body["model"] == "meta-llama"
    assert body["temperature"] == 0.5
    assert len(body["messages"]) == 2
    
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][0]["content"] == "SYS"
    
    assert body["messages"][1]["role"] == "user"
    assert body["messages"][1]["content"][0]["text"] == "USR"
    
    b64 = base64.b64encode(b"fake-image").decode("ascii")
    assert body["messages"][1]["content"][1]["image_url"]["url"] == f"data:image/png;base64,{b64}"


def test_text_delta_from_sse_line(mock_httpx):
    client = create_groq_client(mock_httpx, "dummy")
    
    # Test valid line
    line = 'data: {"choices":[{"delta":{"content":"hello"}}]}'
    assert client._text_delta_from_sse_line(line) == "hello"
    
    # Test DONE
    assert client._text_delta_from_sse_line("data: [DONE]") == ""
    
    # Test empty or keepalive
    assert client._text_delta_from_sse_line(":") == ""
    assert client._text_delta_from_sse_line("   ") == ""
    
    # Test bad JSON
    assert client._text_delta_from_sse_line("data: {bad") == ""
