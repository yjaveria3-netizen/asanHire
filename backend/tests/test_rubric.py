import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.agents.rubric import generate_job_rubric, run_rubric_for_job
from app.core.errors import LLMError


@pytest.mark.asyncio
async def test_rubric_normalizes_weights_to_100():
    # LLM returns 4 criteria whose weights sum to 80 (20 + 20 + 20 + 20)
    unnormalized_json = json.dumps(
        {
            "criteria": [
                {
                    "name": "System Architecture",
                    "weight": 20,
                    "description": "Distributed backend design",
                    "question_themes": ["Scalability", "Microservices"],
                },
                {
                    "name": "Python & FastAPI",
                    "weight": 20,
                    "description": "Async API development",
                    "question_themes": ["AsyncIO", "Pydantic validation"],
                },
                {
                    "name": "Database Engineering",
                    "weight": 20,
                    "description": "PostgreSQL and RLS",
                    "question_themes": ["Indexing", "Row Level Security"],
                },
                {
                    "name": "Testing & Security",
                    "weight": 20,
                    "description": "Automated tests and OWASP controls",
                    "question_themes": ["Pytest", "Prompt injection defense"],
                },
            ],
            "must_have": ["Python", "FastAPI", "PostgreSQL"],
            "seniority": "senior",
            "injection_suspected": False,
        }
    )

    with patch("app.core.llm._invoke_gemini", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = unnormalized_json
        rubric = await generate_job_rubric(
            title="Senior Backend Engineer",
            description="Build high-integrity AI hiring backend services in Python and FastAPI.",
            skills=["Python", "FastAPI", "PostgreSQL"],
            experience_level="senior",
        )

    weights = [c.weight for c in rubric.criteria]
    assert sum(weights) == 100
    assert weights == [25, 25, 25, 25]
    assert rubric.seniority == "senior"


@pytest.mark.asyncio
async def test_rubric_falls_back_to_draft_job_when_llm_fails():
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "job-123"}])
    mock_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": 1}])

    with patch("app.agents.rubric.generate_job_rubric", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.rubric.get_supabase_service_client", return_value=mock_client), \
         patch("app.core.llm.get_supabase_service_client", return_value=mock_client):
        mock_gen.side_effect = LLMError("All providers failed")

        rubric_dict, status, msg = await run_rubric_for_job(
            job_id="job-123",
            title="Backend Engineer",
            description="Build APIs with FastAPI and Supabase.",
            skills=["Python", "FastAPI"],
            experience_level="mid",
        )

    assert rubric_dict is None
    assert status == "draft"
    assert msg is not None and "draft" in msg.lower()
    mock_table.update.assert_called_once_with({"rubric": None, "status": "draft"})
