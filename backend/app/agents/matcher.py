import json
import logging
from typing import Dict, Any
from app.core.llm import call_json
from app.prompts import MATCHER_SYSTEM_PROMPT, MATCHER_USER_TEMPLATE
from app.models.schemas import MatcherOutput

logger = logging.getLogger("asanhire.agents.matcher")

# OWNER: M2 (AI/backend engineer)
# TODO M2: Implement full Gemini 1.5 prompt execution, untrusted resume fence, score clamping, and candidate status transition
async def evaluate_resume(job_title: str, rubric: Dict[str, Any], resume_text: str) -> MatcherOutput:
    """
    Resume Matcher Agent: Evaluates candidate resume text against rubric criteria.
    Outputs clamped score [0.0, 100.0], strengths, gaps, and injection flag.
    """
    user_prompt = MATCHER_USER_TEMPLATE.format(
        job_title=job_title,
        rubric_json=json.dumps(rubric, indent=2),
        resume_text=resume_text
    )
    
    return await call_json(
        user_prompt=user_prompt,
        system_prompt=MATCHER_SYSTEM_PROMPT,
        output_schema=MatcherOutput,
        provider="gemini",
        temperature=0.1
    )
