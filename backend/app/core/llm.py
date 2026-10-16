import json
import logging
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("asanhire.llm")

T = TypeVar("T", bound=BaseModel)

async def call_json(
    user_prompt: str,
    system_prompt: str,
    output_schema: Type[T],
    provider: str = "gemini",
    temperature: float = 0.2
) -> T:
    """
    Unified LLM call interface for asanHire.
    Routes to Groq for low-latency voice interviews, and Gemini for analytical tasks.
    Validates output through Pydantic output_schema.
    Includes mock fallback when placeholder API keys are detected.
    """
    logger.info(f"Calling LLM provider '{provider}' with schema '{output_schema.__name__}'")

    # If placeholder keys are active in dev/test, return valid schema-compliant mock stub
    if (provider == "groq" and settings.GROQ_API_KEY.startswith("placeholder")) or \
       (provider == "gemini" and settings.GEMINI_API_KEY.startswith("placeholder")):
        return _generate_mock_output(output_schema)

    # Production implementation:
    if provider == "groq":
        try:
            return await _call_groq_json(user_prompt, system_prompt, output_schema, temperature)
        except Exception as e:
            logger.warning(f"Groq invocation failed: {e}. Falling back to Gemini.")
            return await _call_gemini_json(user_prompt, system_prompt, output_schema, temperature)
    else:
        return await _call_gemini_json(user_prompt, system_prompt, output_schema, temperature)

async def _call_groq_json(user_prompt: str, system_prompt: str, output_schema: Type[T], temperature: float) -> T:
    """Invokes Groq API with JSON mode enabled."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=temperature,
        response_format={"type": "json_object"}
    )
    raw_content = response.choices[0].message.content or "{}"
    data = json.loads(raw_content)
    return output_schema.model_validate(data)

async def _call_gemini_json(user_prompt: str, system_prompt: str, output_schema: Type[T], temperature: float) -> T:
    """Invokes Google Gemini with structured JSON output."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=system_prompt,
        generation_config={"temperature": temperature, "response_mime_type": "application/json"}
    )
    response = await model.generate_content_async(user_prompt)
    raw_text = response.text.strip()
    
    # Strip any potential accidental markdown markers
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    
    data = json.loads(raw_text.strip())
    return output_schema.model_validate(data)

def _generate_mock_output(output_schema: Type[T]) -> T:
    """Generates valid schema-compliant stub data for local dev & testing."""
    schema_name = output_schema.__name__
    
    if schema_name == "RubricOutput":
        data = {
            "version": "1.0",
            "criteria": [
                {"name": "Technical Depth", "weight": 35, "description": "Hands-on engineering fundamentals."},
                {"name": "System Architecture", "weight": 35, "description": "Distributed systems, APIs, and security."},
                {"name": "Communication & Collaboration", "weight": 30, "description": "Clarity of thought and reasoning."}
            ]
        }
    elif schema_name == "MatcherOutput":
        data = {
            "overall_score": 88.0,
            "summary": "Candidate exhibits strong engineering background aligned with role requirements.",
            "strengths": ["Extensive TypeScript & Python experience", "Production microservices deployment"],
            "gaps": ["No direct Kubernetes cluster administration mentioned"],
            "criteria_breakdown": {
                "Technical Depth": {"score": 90.0, "feedback": "Solid production codebase history."},
                "System Architecture": {"score": 85.0, "feedback": "Well-designed REST and GraphQL APIs."}
            },
            "injection_suspected": False
        }
    elif schema_name == "InterviewTurnOutput":
        data = {
            "next_question": "Could you walk us through how you prevent race conditions in distributed job queues?",
            "question_index": 2,
            "is_complete": False,
            "interviewer_notes": "Candidate articulated clear concurrency concepts."
        }
    elif schema_name == "SupervisorReportOutput":
        data = {
            "overall_score": 89.5,
            "recommendation": "Hire",
            "summary": "Outstanding candidate with high integrity (98% Trust Score) and strong technical delivery.",
            "technical_rating": 92.0,
            "communication_rating": 88.0,
            "cultural_rating": 90.0,
            "key_strengths": ["Structured problem solver", "Clear communication", "Defensive security mindset"],
            "red_flags": [],
            "rubric_scores": {
                "Technical Depth": 92.0,
                "System Architecture": 88.0
            }
        }
    else:
        data = {}
        
    return output_schema.model_validate(data)
