import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_hr_user, HRUser, assert_job_owner
from app.core.db import get_supabase_service_client
from app.agents.rubric import run_rubric_for_job
from app.services.audit import write_audit_log
from app.models.schemas import (
    JobCreateRequest,
    JobDetailResponse,
    CandidateSummaryResponse,
    CandidateDetailResponse,
    StatusOverrideRequest,
    ScoreOverrideRequest,
    DecisionRequest,
    InviteRequest,
    CancelInviteRequest,
    AllowRetryRequest,
    EmailPreviewResponse,
    AuditLogResponse,
    AgentRunResponse,
)

logger = logging.getLogger("asanhire.api.hr")

router = APIRouter(
    tags=["HR Admin & Candidate Management"],
    dependencies=[Depends(get_hr_user)],
)


def _row_to_job_detail(row: Dict[str, Any], message: Optional[str] = None) -> JobDetailResponse:
    return JobDetailResponse(
        id=str(row["id"]),
        owner_id=str(row["owner_id"]) if row.get("owner_id") else None,
        title=row.get("title", ""),
        description=row.get("description", ""),
        skills=row.get("skills") or [],
        experience_level=row.get("experience_level"),
        rubric=row.get("rubric"),
        top_n=int(row.get("top_n", 5)),
        min_score=int(round(float(row.get("min_score", 60)))),
        auto_invite=bool(row.get("auto_invite", True)),
        deadline=row["deadline"],
        status=row.get("status", "open"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        message=message,
    )


# ============================================================================
# 1. Job Management
# ============================================================================

@router.get("/jobs", response_model=List[JobDetailResponse], summary="List HR user jobs")
async def list_jobs(current_user: HRUser = Depends(get_hr_user)) -> List[JobDetailResponse]:
    """Returns all job requisitions owned by the authenticated HR user."""
    client = get_supabase_service_client()
    res = (
        client.table("jobs")
        .select("*")
        .eq("owner_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []
    return [_row_to_job_detail(r) for r in rows]


@router.post(
    "/jobs",
    response_model=JobDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create job and generate rubric",
)
async def create_job(
    job_in: JobCreateRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> JobDetailResponse:
    """
    Creates a new job posting with owner_id = authenticated HR user,
    runs the Rubric Agent, writes audit_log (action='job_created'),
    and returns the job and rubric. If the LLM fails, saves the job
    with rubric=null and status='draft' so HR can retry.
    """
    client = get_supabase_service_client()

    insert_payload: Dict[str, Any] = {
        "owner_id": current_user.id,
        "title": job_in.title,
        "description": job_in.description,
        "skills": job_in.skills,
        "experience_level": job_in.experience_level,
        "deadline": job_in.deadline.isoformat(),
        "top_n": job_in.top_n,
        "min_score": job_in.min_score,
        "auto_invite": job_in.auto_invite,
        "status": "open",
        "rubric": None,
    }

    res = client.table("jobs").insert(insert_payload).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job",
        )

    job_row = res.data[0]
    job_id = str(job_row["id"])

    # Run Rubric Agent (handles DB update + agent_runs logging + draft fallback)
    rubric_dict, final_status, fallback_msg = await run_rubric_for_job(
        job_id=job_id,
        title=job_in.title,
        description=job_in.description,
        skills=job_in.skills,
        experience_level=job_in.experience_level,
    )

    job_row["rubric"] = rubric_dict
    job_row["status"] = final_status

    # Write audit_log (action='job_created')
    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="job_created",
        job_id=job_id,
        from_status=None,
        to_status=final_status,
        reason="Job created by HR",
    )

    return _row_to_job_detail(job_row, message=fallback_msg)


@router.get("/jobs/{job_id}", response_model=JobDetailResponse, summary="Get job details")
async def get_job_detail(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> JobDetailResponse:
    """Returns single job requisition details and rubric (ownership checked)."""
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)
    return _row_to_job_detail(job_row)


# ============================================================================
# 2. Candidate Inspection & Ranking
# ============================================================================

@router.get(
    "/jobs/{job_id}/candidates",
    response_model=List[CandidateSummaryResponse],
    summary="List ranked candidates for job",
)
async def list_job_candidates(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> List[CandidateSummaryResponse]:
    """
    Returns candidates for the job ranked by effective_score
    (hr_score_override if set, else ai_score, nulls last).
    Includes a short summary of strengths and gaps from match.
    Never returns resume_text.
    """
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    client = get_supabase_service_client()
    res = (
        client.table("candidates")
        .select(
            "id, name, email, status, ai_score, hr_score_override, injection_suspected, match, created_at"
        )
        .eq("job_id", job_id)
        .execute()
    )
    rows = res.data or []

    summaries: List[CandidateSummaryResponse] = []
    for r in rows:
        hr_override = r.get("hr_score_override")
        ai_score = r.get("ai_score")
        effective = hr_override if hr_override is not None else ai_score

        match_data = r.get("match") if isinstance(r.get("match"), dict) else {}
        strengths = list(match_data.get("strengths") or [])[:3]
        gaps = list(match_data.get("gaps") or [])[:3]

        summaries.append(
            CandidateSummaryResponse(
                id=str(r["id"]),
                name=r.get("name", ""),
                email=r.get("email", ""),
                status=r.get("status", "applied"),
                ai_score=int(ai_score) if ai_score is not None else None,
                hr_score_override=int(hr_override) if hr_override is not None else None,
                effective_score=int(effective) if effective is not None else None,
                injection_suspected=bool(r.get("injection_suspected", False)),
                strengths=strengths,
                gaps=gaps,
                created_at=r.get("created_at"),
            )
        )

    # Sort by effective_score descending, nulls last
    summaries.sort(
        key=lambda c: (c.effective_score is not None, c.effective_score if c.effective_score is not None else -1),
        reverse=True,
    )
    return summaries


# ============================================================================
# 3. Unbuilt Routes (Stay 501 Not Implemented per Scope)
# ============================================================================

@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse, summary="Get full candidate dossier")
async def get_candidate_detail(candidate_id: str, current_user: HRUser = Depends(get_hr_user)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/override-status", summary="Override candidate status (Reversible)")
async def override_candidate_status(
    candidate_id: str,
    payload: StatusOverrideRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/override-score", summary="Override candidate score")
async def override_candidate_score(
    candidate_id: str,
    payload: ScoreOverrideRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/invite", summary="Manual interview invitation / resend")
async def invite_candidate(
    candidate_id: str,
    payload: InviteRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/cancel-invite", summary="Revoke active interview invitation")
async def cancel_candidate_invite(
    candidate_id: str,
    payload: CancelInviteRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/allow-retry", summary="Allow interview retry")
async def allow_interview_retry(
    candidate_id: str,
    payload: AllowRetryRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/regenerate-report", summary="Regenerate supervisor evaluation report")
async def regenerate_evaluation_report(
    candidate_id: str,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/candidates/{candidate_id}/decision", summary="Submit final hiring decision (Hire/Reject/Hold)")
async def submit_hiring_decision(
    candidate_id: str,
    payload: DecisionRequest,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/candidates/{candidate_id}/email-preview", response_model=EmailPreviewResponse, summary="Preview email before sending")
async def preview_candidate_email(
    candidate_id: str,
    template: str = "interview_invite",
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse], summary="Get system audit logs")
async def get_audit_logs(
    entity_id: Optional[str] = None,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/agent-runs", response_model=List[AgentRunResponse], summary="Get AI agent execution logs")
async def get_agent_runs(
    job_id: Optional[str] = None,
    current_user: HRUser = Depends(get_hr_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )
