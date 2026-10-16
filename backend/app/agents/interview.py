import json
import logging
from typing import Dict, Any, List, Optional
from app.core.llm import call_json, clamp_scores
from app.prompts import INTERVIEW_SYSTEM_PROMPT, INTERVIEW_USER_TEMPLATE
from app.models.schemas import InterviewTurnOutput, AnswerScore
from app.services.pdf import redact_contact_info, sanitize_text
from app.agents.matcher import detect_prompt_injection

logger = logging.getLogger("asanhire.agents.interview")

MAX_QUESTIONS: int = 6
MAX_FOLLOW_UPS: int = 2


def build_resume_summary(resume_text: str, match_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Produces a redacted resume summary (skills, projects, strengths) with NO email,
    phone, or personal links.
    """
    parts: List[str] = []
    if isinstance(match_data, dict):
        strengths = match_data.get("strengths") or []
        if strengths:
            parts.append("Verified Strengths: " + "; ".join(str(s) for s in strengths))
    if resume_text:
        clean_redacted = redact_contact_info(sanitize_text(resume_text))
        parts.append(clean_redacted[:3000])
    return "\n".join(parts).strip() or "No resume summary provided."


def build_rubric_themes(rubric: Optional[Dict[str, Any]]) -> str:
    """
    Extracts criteria names, descriptions, and question_themes for the Interview Agent
    without exposing internal numeric weights to the candidate.
    """
    if not isinstance(rubric, dict):
        return "{}"
    criteria = rubric.get("criteria") or []
    sanitized_criteria = [
        {
            "name": c.get("name", ""),
            "description": c.get("description", ""),
            "question_themes": c.get("question_themes", []),
        }
        for c in criteria
        if isinstance(c, dict)
    ]
    return json.dumps(
        {
            "criteria": sanitized_criteria,
            "seniority": rubric.get("seniority", "mid"),
        },
        indent=2,
    )


def count_turns(transcript: List[Dict[str, Any]]) -> tuple[int, int]:
    """
    Counts (questions_asked, follow_ups_used) from interviewer turns in the transcript.
    """
    questions_asked = 0
    follow_ups_used = 0
    for item in transcript:
        if not isinstance(item, dict):
            continue
        if item.get("role") == "interviewer":
            if item.get("action") == "follow_up":
                follow_ups_used += 1
            else:
                questions_asked += 1
    return questions_asked, follow_ups_used


def enforce_turn_limits(
    turn_output: InterviewTurnOutput,
    questions_asked: int,
    follow_ups_used: int,
) -> InterviewTurnOutput:
    """
    Enforces the hard cap of at most 6 questions and at most 2 follow-ups,
    then forces action = 'end'. Also clamps score_last_answer.score to [0, 10].
    """
    if turn_output.score_last_answer is not None:
        clamped = int(round(clamp_scores(turn_output.score_last_answer.score, 0.0, 10.0)))
        turn_output.score_last_answer = AnswerScore(
            criterion=turn_output.score_last_answer.criterion,
            score=clamped,
            evidence=turn_output.score_last_answer.evidence,
        )

    action = turn_output.action

    # If the model wants a follow_up, check if follow-ups are exhausted
    if action == "follow_up" and follow_ups_used >= MAX_FOLLOW_UPS:
        action = "end" if questions_asked >= MAX_QUESTIONS else "ask_next"

    # If the model wants to ask_next, check if all 6 questions have already been asked
    if action == "ask_next" and questions_asked >= MAX_QUESTIONS:
        action = "end"

    # Hard ceiling: if 6 questions and 2 follow-ups have already occurred, always end
    if questions_asked >= MAX_QUESTIONS and (action != "follow_up" or follow_ups_used >= MAX_FOLLOW_UPS):
        action = "end"

    turn_output.action = action
    return turn_output


async def run_interview_turn(
    job_title: str,
    rubric: Optional[Dict[str, Any]],
    resume_text: str,
    match_data: Optional[Dict[str, Any]],
    transcript: List[Dict[str, Any]],
    candidate_answer: str = "",
) -> InterviewTurnOutput:
    """
    Calls the Interview Agent via Groq (Prompt I) with rubric themes, redacted resume
    summary, conversation history, and <candidate_answer>.
    """
    system_prompt = INTERVIEW_SYSTEM_PROMPT.replace("{job_title}", job_title or "Open Role")
    rubric_summary = build_rubric_themes(rubric)
    resume_summary = build_resume_summary(resume_text, match_data)
    history_json = json.dumps(transcript, indent=2)

    user_prompt = INTERVIEW_USER_TEMPLATE.format(
        rubric_summary=rubric_summary,
        resume_highlights=resume_summary,
        conversation_history=history_json,
        candidate_answer=candidate_answer,
    )

    output = await call_json(
        provider="groq",
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_model=InterviewTurnOutput,
        max_tokens=800,
        temperature=0.3,
    )

    if candidate_answer and detect_prompt_injection(candidate_answer):
        output.injection_suspected = True

    if not candidate_answer:
        # Opening turn on /start
        output.action = "ask_next"
        output.score_last_answer = None
        return output

    questions_asked, follow_ups_used = count_turns(transcript)
    return enforce_turn_limits(output, questions_asked, follow_ups_used)
