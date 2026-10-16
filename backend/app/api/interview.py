import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.core.db import get_supabase_service_client
from app.core.llm import log_agent_run
from app.core.rate_limit import rate_limit_interview
from app.services.tokens import hash_token
from app.agents.interview import run_interview_turn
from app.agents.guardian import record_proctor_event
from app.agents.supervisor import run_supervisor_for_candidate
from app.models.schemas import (
    InterviewVerifyResponse,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewFinishResponse,
    GuardianEventRequest,
    GuardianEventResponse,
)

logger = logging.getLogger("asanhire.api.interview")

router = APIRouter(tags=["Candidate Voice Interview Room"])

GENERIC_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Interview not found",
)


def _compute_token_hashes(raw_token: str) -> Tuple[str, str]:
    """
    Returns both the salted SHA-256 token hash (from services/tokens.py) and
    the plain SHA-256 hex digest of raw_token so lookup succeeds regardless of
    how the token row was seeded or generated.
    """
    clean = (raw_token or "").strip()
    if not clean or len(clean) > 512:
        raise GENERIC_NOT_FOUND
    salted_hash = hash_token(clean)
    plain_hash = hashlib.sha256(clean.encode("utf-8")).hexdigest()
    return salted_hash, plain_hash


def _parse_iso_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    raise ValueError("Invalid datetime")


def _lookup_valid_interview(client: Any, raw_token: str) -> Dict[str, Any]:
    """
    Looks up the interview row by SHA-256(token) and enforces:
    - exists
    - not voided
    - not used (used_at is None and status not in ('interviewed', 'completed', 'expired'))
    - not expired (expires_at > now)
    Always raises the same generic 404 to prevent token state enumeration.
    """
    salted_hash, plain_hash = _compute_token_hashes(raw_token)

    res = client.table("interviews").select("*").eq("token_hash", plain_hash).execute()
    rows = res.data if res and res.data else []
    if not rows and salted_hash != plain_hash:
        res_salted = client.table("interviews").select("*").eq("token_hash", salted_hash).execute()
        rows = res_salted.data if res_salted and res_salted.data else []

    if not rows:
        raise GENERIC_NOT_FOUND

    interview = rows[0]

    # Reject if voided
    if bool(interview.get("voided")):
        raise GENERIC_NOT_FOUND

    # Reject if already used or completed/interviewed
    if interview.get("used_at") is not None:
        raise GENERIC_NOT_FOUND

    row_status = str(interview.get("status") or "").lower()
    if row_status in {"interviewed", "completed", "expired", "voided"}:
        raise GENERIC_NOT_FOUND

    # Reject if expired
    expires_raw = interview.get("expires_at")
    if not expires_raw:
        raise GENERIC_NOT_FOUND
    try:
        expires_at = _parse_iso_datetime(expires_raw)
    except Exception:
        raise GENERIC_NOT_FOUND

    if expires_at <= datetime.now(timezone.utc):
        raise GENERIC_NOT_FOUND

    return interview


def _load_candidate_and_job(client: Any, candidate_id: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    cand_res = client.table("candidates").select("*").eq("id", candidate_id).execute()
    if not cand_res or not cand_res.data:
        raise GENERIC_NOT_FOUND
    candidate = cand_res.data[0]

    job_id = candidate.get("job_id")
    job: Dict[str, Any] = {}
    if job_id:
        job_res = client.table("jobs").select("*").eq("id", str(job_id)).execute()
        if job_res and job_res.data:
            job = job_res.data[0]

    return candidate, job


@router.get(
    "/{token}/verify",
    response_model=InterviewVerifyResponse,
    dependencies=[Depends(rate_limit_interview)],
    summary="Verify interview token validity",
)
async def verify_interview_token(token: str, request: Request):
    """Verifies that the candidate's interview link is active and valid."""
    client = get_supabase_service_client()
    interview = _lookup_valid_interview(client, token)
    candidate, job = _load_candidate_and_job(client, str(interview["candidate_id"]))
    return InterviewVerifyResponse(
        valid=True,
        interview_id=interview["id"],
        candidate_name=str(candidate.get("name") or "Candidate"),
        job_title=str(job.get("title") or "Open Role"),
        status=str(interview.get("status") or "pending"),
        expires_at=_parse_iso_datetime(interview["expires_at"]),
    )


@router.post(
    "/{token}/start",
    response_model=InterviewStartResponse,
    dependencies=[Depends(rate_limit_interview)],
    summary="Start interview session",
)
async def start_interview_session(token: str, request: Request):
    """
    Looks up the interview by SHA-256(token), rejects if expired, used, voided or not found
    (same generic 404). Calls the Interview Agent via Groq (Prompt I) with rubric,
    redacted resume summary (no email or phone) and empty history, stores the opening turn
    in interviews.transcript, and returns {spoken_text} only.
    """
    client = get_supabase_service_client()
    interview = _lookup_valid_interview(client, token)
    interview_id = str(interview["id"])
    candidate_id = str(interview["candidate_id"])

    candidate, job = _load_candidate_and_job(client, candidate_id)
    job_id = str(job.get("id")) if job.get("id") else None
    job_title = str(job.get("title") or "Role")
    rubric = job.get("rubric") if isinstance(job.get("rubric"), dict) else {}
    resume_text = str(candidate.get("resume_text") or "")
    match_data = candidate.get("match") if isinstance(candidate.get("match"), dict) else {}

    try:
        turn_out = await run_interview_turn(
            job_title=job_title,
            rubric=rubric,
            resume_text=resume_text,
            match_data=match_data,
            transcript=[],
            candidate_answer="",
        )
        await log_agent_run(
            agent="interviewer",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="groq",
        )
    except Exception as e:
        logger.error(f"Interview Agent start failed for interview {interview_id}: {type(e).__name__}")
        await log_agent_run(
            agent="interviewer",
            job_id=job_id,
            candidate_id=candidate_id,
            status="failed",
            provider="groq",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Interview service temporarily unavailable",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    opening_turn = {
        "role": "interviewer",
        "text": turn_out.spoken_text,
        "action": turn_out.action,
        "timestamp": now_iso,
    }

    client.table("interviews").update({
        "status": "in_progress",
        "started_at": now_iso,
        "transcript": [opening_turn],
        "scores": [],
        "retry_allowed": False,
    }).eq("id", interview_id).execute()

    return InterviewStartResponse(spoken_text=turn_out.spoken_text)


@router.post(
    "/{token}/answer",
    response_model=InterviewAnswerResponse,
    dependencies=[Depends(rate_limit_interview)],
    summary="Submit candidate answer and receive next question",
)
@router.post(
    "/{token}/turn",
    response_model=InterviewAnswerResponse,
    dependencies=[Depends(rate_limit_interview)],
    include_in_schema=False,
)
async def submit_interview_answer(
    token: str,
    payload: InterviewAnswerRequest,
    request: Request,
):
    """
    Appends the candidate answer (max 4000 chars, wrapped in <candidate_answer> tags
    in the prompt), calls Groq, validates the JSON, stores the per-answer score in
    interviews.scores, updates interviews.transcript, and returns {spoken_text, action}.
    Limits to 6 questions plus at most 2 follow-ups, then forces action 'end'.
    Never returns scores or rubric to the candidate.
    """
    client = get_supabase_service_client()
    interview = _lookup_valid_interview(client, token)
    interview_id = str(interview["id"])
    candidate_id = str(interview["candidate_id"])

    try:
        clean_answer = payload.get_clean_answer()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    candidate, job = _load_candidate_and_job(client, candidate_id)
    job_id = str(job.get("id")) if job.get("id") else None
    job_title = str(job.get("title") or "Role")
    rubric = job.get("rubric") if isinstance(job.get("rubric"), dict) else {}
    resume_text = str(candidate.get("resume_text") or "")
    match_data = candidate.get("match") if isinstance(candidate.get("match"), dict) else {}

    existing_transcript = (
        list(interview.get("transcript"))
        if isinstance(interview.get("transcript"), list)
        else []
    )
    existing_scores = (
        list(interview.get("scores"))
        if isinstance(interview.get("scores"), list)
        else []
    )

    try:
        turn_out = await run_interview_turn(
            job_title=job_title,
            rubric=rubric,
            resume_text=resume_text,
            match_data=match_data,
            transcript=existing_transcript,
            candidate_answer=clean_answer,
        )
        await log_agent_run(
            agent="interviewer",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="groq",
        )
    except Exception as e:
        logger.error(f"Interview Agent answer turn failed for interview {interview_id}: {type(e).__name__}")
        await log_agent_run(
            agent="interviewer",
            job_id=job_id,
            candidate_id=candidate_id,
            status="failed",
            provider="groq",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Interview service temporarily unavailable",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    updated_transcript = existing_transcript + [
        {
            "role": "candidate",
            "text": clean_answer,
            "timestamp": now_iso,
        },
        {
            "role": "interviewer",
            "text": turn_out.spoken_text,
            "action": turn_out.action,
            "timestamp": now_iso,
        },
    ]

    if turn_out.score_last_answer is not None:
        ev_text = turn_out.score_last_answer.evidence or turn_out.score_last_answer.note or ""
        score_entry = {
            "criterion": turn_out.score_last_answer.criterion,
            "score": int(turn_out.score_last_answer.score),
            "evidence": ev_text,
            "note": ev_text,
            "turn_index": len(existing_scores) + 1,
        }
        updated_scores = existing_scores + [score_entry]
    else:
        updated_scores = existing_scores

    client.table("interviews").update({
        "status": "in_progress",
        "transcript": updated_transcript,
        "scores": updated_scores,
    }).eq("id", interview_id).execute()

    if turn_out.injection_suspected:
        client.table("candidates").update({"injection_suspected": True}).eq("id", candidate_id).execute()

    return InterviewAnswerResponse(
        spoken_text=turn_out.spoken_text,
        action=turn_out.action,
    )


@router.post(
    "/{token}/finish",
    response_model=InterviewFinishResponse,
    dependencies=[Depends(rate_limit_interview)],
    summary="Finish interview and invoke Supervisor Agent in background",
)
@router.post(
    "/{token}/complete",
    response_model=InterviewFinishResponse,
    dependencies=[Depends(rate_limit_interview)],
    include_in_schema=False,
)
async def finish_interview_session(
    token: str,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """
    Marks the interview as 'interviewed' (setting used_at and finished_at),
    updates the candidate's status to 'interviewed', and triggers the Evaluation
    Supervisor Agent in a background task.
    """
    client = get_supabase_service_client()
    interview = _lookup_valid_interview(client, token)
    interview_id = str(interview["id"])
    candidate_id = str(interview["candidate_id"])

    now_iso = datetime.now(timezone.utc).isoformat()

    client.table("interviews").update({
        "status": "interviewed",
        "used_at": now_iso,
        "finished_at": now_iso,
    }).eq("id", interview_id).execute()

    client.table("candidates").update({
        "status": "interviewed",
    }).eq("id", candidate_id).execute()

    background_tasks.add_task(
        run_supervisor_for_candidate,
        candidate_id=candidate_id,
        interview_id=interview_id,
    )

    return InterviewFinishResponse(status="interviewed")


@router.post(
    "/{token}/event",
    response_model=GuardianEventResponse,
    dependencies=[Depends(rate_limit_interview)],
    summary="Report proctoring telemetry event and recompute trust_score",
)
@router.post(
    "/{token}/guardian-event",
    response_model=GuardianEventResponse,
    dependencies=[Depends(rate_limit_interview)],
    include_in_schema=False,
)
async def record_guardian_event(token: str, event: GuardianEventRequest, request: Request):
    """
    Validates proctor event type against the allowlist, stores in proctor_events,
    recomputes trust_score = max(0, 100 - sum of penalties) with repeats of each
    type capped at 5 counted events, writes agent_runs (agent='guardian') only for
    the first event of each type, and returns {trust_score}.
    Never modifies candidate status.
    """
    client = get_supabase_service_client()
    interview = _lookup_valid_interview(client, token)
    interview_id = str(interview["id"])
    candidate_id = str(interview["candidate_id"])

    try:
        clean_type, clean_detail = event.get_validated_event()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    candidate, job = _load_candidate_and_job(client, candidate_id)
    job_id = str(job.get("id")) if job.get("id") else None

    new_trust_score = await record_proctor_event(
        interview_id=interview_id,
        candidate_id=candidate_id,
        job_id=job_id,
        event_type=clean_type,
        detail=clean_detail,
    )

    return GuardianEventResponse(trust_score=new_trust_score)
