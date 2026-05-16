"""Test fallback model client logic."""

import pytest
import asyncio
from unittest.mock import Mock

from mayra_orchestrator.errors import ProviderError
from mayra_orchestrator.providers.fallback import FallbackModelClient
from mayra_orchestrator.providers.base import ModelClient

class FakeClient:
    def __init__(self, provider, model, fail_with=None):
        self.provider = provider
        self.model = model
        self.fail_with = fail_with
        self.called = False

    async def complete_streaming(self, prompt, *, temperature, on_token):
        self.called = True
        if self.fail_with:
            raise self.fail_with
        return f"{self.provider} success"

    async def health_check(self):
        return 1.0

    async def aclose(self):
        pass

@pytest.mark.asyncio
async def test_fallback_succeeds_on_first():
    c1 = FakeClient("gemini", "model1")
    c2 = FakeClient("groq", "model2")
    
    fallback = FallbackModelClient([c1, c2])
    res = await fallback.complete_streaming(None, temperature=0.0, on_token=None)
    
    assert res == "gemini success"
    assert c1.called
    assert not c2.called

@pytest.mark.asyncio
async def test_fallback_moves_to_next_on_rate_limit():
    c1 = FakeClient("gemini", "model1", fail_with=ProviderError("rate_limited"))
    c2 = FakeClient("groq", "model2")
    
    fallback = FallbackModelClient([c1, c2])
    res = await fallback.complete_streaming(None, temperature=0.0, on_token=None)
    
    assert res == "groq success"
    assert c1.called
    assert c2.called

@pytest.mark.asyncio
async def test_fallback_propagates_unauthorized():
    c1 = FakeClient("gemini", "model1", fail_with=ProviderError("unauthorized"))
    c2 = FakeClient("groq", "model2")
    
    fallback = FallbackModelClient([c1, c2])
    with pytest.raises(ProviderError) as exc:
        await fallback.complete_streaming(None, temperature=0.0, on_token=None)
        
    assert exc.value.args[0] == "unauthorized"
    assert c1.called
    assert not c2.called

@pytest.mark.asyncio
async def test_fallback_exhausts_all_rate_limits():
    c1 = FakeClient("gemini", "model1", fail_with=ProviderError("rate_limited"))
    c2 = FakeClient("groq", "model2", fail_with=ProviderError("rate_limited"))
    
    fallback = FallbackModelClient([c1, c2])
    with pytest.raises(ProviderError) as exc:
        await fallback.complete_streaming(None, temperature=0.0, on_token=None)
        
    assert exc.value.args[0] == "rate_limited"
    assert c1.called
    assert c2.called
