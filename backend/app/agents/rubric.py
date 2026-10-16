import logging
from typing import Dict, Any
from app.core.llm import call_json
from app.prompts import RUBRIC_SYSTEM_PROMPT, RUBRIC_USER_TEMPLATE
from app.models.schemas import RubricOutput

logger = logging.getLogger("asanhire.agents.rubric")

# OWNER: M2 (AI/backend engineer)
# TODO M2: Implement full Gemini 1.5 prompt chain, error retries, and persistence to jobs.rubric
async def generate_job_rubric(title: str, department: str, description: str, requirements: str) -> RubricOutput:
    """
    Rubric Agent: Synthesizes job description into 3-5 weighted evaluation criteria.
    Weights strictly sum to 100.
    """
    user_prompt = RUBRIC_USER_TEMPLATE.format(
        title=title,
        department=department,
        description=description,
        requirements=requirements
    )
    
    return await call_json(
        user_prompt=user_prompt,
        system_prompt=RUBRIC_SYSTEM_PROMPT,
        output_schema=RubricOutput,
        provider="gemini",
        temperature=0.2
    )
