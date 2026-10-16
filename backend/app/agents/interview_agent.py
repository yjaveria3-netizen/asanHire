import json
import logging
from typing import List, Dict, Any
from app.core.llm import call_json
from app.prompts import INTERVIEW_SYSTEM_PROMPT, INTERVIEW_USER_TEMPLATE
from app.models.schemas import InterviewTurnOutput

logger = logging.getLogger("asanhire.agents.interview")

# OWNER: M2 (AI/backend engineer)
# TODO M2: Implement live Groq Llama 3.3 turn orchestration, fallback to Gemini, speech-to-text context passing
async def conduct_interview_turn(
    job_title: str,
    rubric_summary: str,
    resume_highlights: str,
    conversation_history: List[Dict[str, str]],
    question_index: int
) -> InterviewTurnOutput:
    """
    Interview Agent: Generates conversational technical questions using Groq.
    Maintains low voice turnaround latency.
    """
    user_prompt = INTERVIEW_USER_TEMPLATE.format(
        rubric_summary=rubric_summary,
        resume_highlights=resume_highlights,
        conversation_history=json.dumps(conversation_history, indent=2),
        question_index=question_index
    )
    
    system_prompt = INTERVIEW_SYSTEM_PROMPT.format(job_title=job_title)
    
    return await call_json(
        user_prompt=user_prompt,
        system_prompt=system_prompt,
        output_schema=InterviewTurnOutput,
        provider="groq",
        temperature=0.3
    )
