from typing import List, Dict, Any, Optional
from app.models.schemas import InterviewTurnOutput
from app.agents.interview import (
    MAX_QUESTIONS,
    MAX_FOLLOW_UPS,
    build_resume_summary,
    build_rubric_themes,
    count_turns,
    enforce_turn_limits,
    run_interview_turn,
)


async def conduct_interview_turn(
    job_title: str,
    rubric: Optional[Dict[str, Any]] = None,
    resume_text: str = "",
    match_data: Optional[Dict[str, Any]] = None,
    transcript: Optional[List[Dict[str, Any]]] = None,
    candidate_answer: str = "",
) -> InterviewTurnOutput:
    return await run_interview_turn(
        job_title=job_title,
        rubric=rubric,
        resume_text=resume_text,
        match_data=match_data,
        transcript=transcript or [],
        candidate_answer=candidate_answer,
    )
