import json
import logging
from typing import List, Dict, Any
from app.core.llm import call_json
from app.prompts import SUPERVISOR_SYSTEM_PROMPT, SUPERVISOR_USER_TEMPLATE
from app.models.schemas import SupervisorReportOutput

logger = logging.getLogger("asanhire.agents.supervisor")

# OWNER: M2 (AI/backend engineer)
# TODO M2: Implement Gemini synthesis of transcript, resume score, and guardian proctoring events
async def generate_evaluation_report(
    job_title: str,
    rubric: Dict[str, Any],
    resume_score: float,
    trust_score: float,
    proctoring_incidents: List[Dict[str, Any]],
    transcript: List[Dict[str, str]]
) -> SupervisorReportOutput:
    """
    Evaluation Supervisor Agent: Synthesizes multi-source candidate performance.
    Outputs executive evaluation report, recommendation (Hire/Reject/Hold), and category ratings.
    """
    user_prompt = SUPERVISOR_USER_TEMPLATE.format(
        job_title=job_title,
        rubric_json=json.dumps(rubric, indent=2),
        resume_score=resume_score,
        trust_score=trust_score,
        proctoring_incidents_json=json.dumps(proctoring_incidents, indent=2),
        transcript_json=json.dumps(transcript, indent=2)
    )
    
    return await call_json(
        user_prompt=user_prompt,
        system_prompt=SUPERVISOR_SYSTEM_PROMPT,
        output_schema=SupervisorReportOutput,
        provider="gemini",
        temperature=0.2
    )
