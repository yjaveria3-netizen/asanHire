import pytest
from unittest.mock import patch, AsyncMock
from pydantic import BaseModel, Field
from app.core.llm import strip_code_fences, clamp_scores, call_json, _execute_provider_call
from app.core.errors import LLMError

class SimpleTestSchema(BaseModel):
    name: str
    score: float = Field(..., ge=0.0, le=100.0)

def test_code_fence_stripping():
    """Verifies stripping of markdown code fences."""
    # json code block
    fenced_json = "```json\n{\"name\": \"test\", \"score\": 85.0}\n```"
    assert strip_code_fences(fenced_json) == "{\"name\": \"test\", \"score\": 85.0}"

    # generic code block
    fenced_generic = "```\n{\"name\": \"test\", \"score\": 85.0}\n```"
    assert strip_code_fences(fenced_generic) == "{\"name\": \"test\", \"score\": 85.0}"

    # raw json with spaces
    raw_json = "   {\"name\": \"test\", \"score\": 85.0}   "
    assert strip_code_fences(raw_json) == "{\"name\": \"test\", \"score\": 85.0}"

def test_clamp_scores_0_to_100():
    """Verifies score clamping in the 0-100 range."""
    assert clamp_scores(150.0, 0.0, 100.0) == 100.0
    assert clamp_scores(-20.0, 0.0, 100.0) == 0.0
    assert clamp_scores(75.5, 0.0, 100.0) == 75.5

def test_clamp_scores_0_to_10():
    """Verifies score clamping in the 0-10 range."""
    assert clamp_scores(15.0, 0.0, 10.0) == 10.0
    assert clamp_scores(-3.0, 0.0, 10.0) == 0.0
    assert clamp_scores(8.2, 0.0, 10.0) == 8.2

def test_clamp_scores_dict():
    """Verifies score clamping on dictionaries of scores."""
    scores = {"technical": 110.0, "communication": -5.0, "cultural": 80.0}
    clamped = clamp_scores(scores, 0.0, 100.0)
    assert clamped["technical"] == 100.0
    assert clamped["communication"] == 0.0
    assert clamped["cultural"] == 80.0

@pytest.mark.asyncio
async def test_validation_rejects_extra_fields():
    """Verifies that unexpected extra fields in LLM responses are rejected."""
    payload_with_extra = '{"name": "Valid", "score": 90.0, "malicious_injected_key": "hack"}'
    
    with patch("app.core.llm._invoke_gemini", new_callable=AsyncMock) as mock_invoke:
        mock_invoke.return_value = payload_with_extra
        with pytest.raises(ValueError, match="extra fields not permitted"):
            await _execute_provider_call(
                provider="gemini",
                system_prompt="sys",
                user_prompt="usr",
                schema_model=SimpleTestSchema,
                max_tokens=500,
                temperature=0.2
            )

@pytest.mark.asyncio
async def test_call_json_with_mock_success():
    """Verifies call_json succeeds and parses valid JSON via mocked provider."""
    valid_payload = '{"name": "Senior Engineer", "score": 95.0}'
    
    with patch("app.core.llm._invoke_gemini", new_callable=AsyncMock) as mock_invoke:
        mock_invoke.return_value = valid_payload
        result = await call_json(
            provider="gemini",
            system_prompt="sys",
            user_prompt="usr",
            schema_model=SimpleTestSchema
        )
        assert result.name == "Senior Engineer"
        assert result.score == 95.0
        assert mock_invoke.call_count == 1

@pytest.mark.asyncio
async def test_call_json_fallback_on_failure():
    """Verifies fallback to secondary provider when primary fails."""
    valid_payload = '{"name": "Fallback Model", "score": 88.0}'

    with patch("app.core.llm._invoke_groq", side_effect=Exception("Groq API Timeout")), \
         patch("app.core.llm._invoke_gemini", new_callable=AsyncMock) as mock_gemini:
        
        mock_gemini.return_value = valid_payload
        result = await call_json(
            provider="groq",
            system_prompt="sys",
            user_prompt="usr",
            schema_model=SimpleTestSchema
        )
        assert result.name == "Fallback Model"
        assert result.score == 88.0
        assert mock_gemini.call_count == 1
