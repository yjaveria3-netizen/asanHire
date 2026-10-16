from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from app.core.security import get_hr_user, HRUser, assert_job_owner
from app.core.db import get_supabase_service_client
from app.agents.rubric import run_rubric_for_job
from app.agents.scheduling import schedule_job, invite_candidate_with_token
from app.agents.supervisor import run_supervisor_for_candidate
from app.services.audit import write_audit_log
from app.services.email import render_email_template, send_templated_email
from app.models.schemas import (
    JobCreateRequest,
    JobDetailResponse,
    CandidateSummaryResponse,
    StatusOverrideRequest,
    ScoreOverrideRequest,
    DecisionRequest,
    InviteRequest,
    CancelInviteRequest,
    AllowRetryRequest,
    EmailPreviewResponse,
)

logger = logging.getLogger("asanhire.api.hr")

router = APIRouter(
    tags=["HR Admin & Candidate Management"],
    dependencies=[Depends(get_hr_user)],
)

_ALLOWED_PREVIEW_TYPES = {
    "hired",
    "rejected",
    "on_hold",
    "corrected_decision",
    "invite",
    "interview_invite",
}


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
        scheduler_ran_at=row.get("scheduler_ran_at"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        message=message,
    )


def _load_candidate_or_404(client: Any, candidate_id: str) -> Dict[str, Any]:
    cand_res = client.table("candidates").select("*").eq("id", candidate_id).execute()
    if not cand_res or not cand_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    return cand_res.data[0]


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

    rubric_dict, final_status, fallback_msg = await run_rubric_for_job(
        job_id=job_id,
        title=job_in.title,
        description=job_in.description,
        skills=job_in.skills,
        experience_level=job_in.experience_level,
    )

    job_row["rubric"] = rubric_dict
    job_row["status"] = final_status

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


@router.post("/jobs/{job_id}/run-scheduler", summary="Manually run Scheduling Agent for a job")
async def run_job_scheduler(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    HR-only endpoint that verifies job ownership via assert_job_owner,
    executes deterministic schedule_job(job_id), and writes audit_log.
    """
    await assert_job_owner(job_id=job_id, user_id=current_user.id)
    result = await schedule_job(job_id, hr_sender_email=current_user.email)

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="run_scheduler",
        job_id=job_id,
        reason="Manual scheduler run triggered by HR",
    )
    return result


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

    summaries.sort(
        key=lambda c: (c.effective_score is not None, c.effective_score if c.effective_score is not None else -1),
        reverse=True,
    )
    return summaries


@router.get("/candidates/{candidate_id}", summary="Get full candidate dossier")
async def get_candidate_detail(
    candidate_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """Returns full candidate dossier (match, interview transcript, proctor events, latest report, audit log)."""
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    int_res = (
        client.table("interviews")
        .select("*")
        .eq("candidate_id", candidate_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    interview_row = int_res.data[0] if (int_res and int_res.data) else None

    proctor_events: List[Dict[str, Any]] = []
    if interview_row and interview_row.get("id"):
        ev_res = (
            client.table("proctor_events")
            .select("*")
            .eq("interview_id", str(interview_row["id"]))
            .execute()
        )
        proctor_events = ev_res.data or []

    rep_res = (
        client.table("reports")
        .select("*")
        .eq("candidate_id", candidate_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    latest_report = rep_res.data[0] if (rep_res and rep_res.data) else None

    aud_res = (
        client.table("audit_log")
        .select("*")
        .eq("candidate_id", candidate_id)
        .order("created_at", desc=True)
        .execute()
    )
    audit_logs = aud_res.data or []

    hr_override = candidate.get("hr_score_override")
    ai_score = candidate.get("ai_score")
    effective = hr_override if hr_override is not None else ai_score

    return {
        "id": str(candidate["id"]),
        "job_id": job_id,
        "name": candidate.get("name"),
        "full_name": candidate.get("name"),
        "email": candidate.get("email"),
        "status": candidate.get("status", "applied"),
        "ai_score": ai_score,
        "hr_score_override": hr_override,
        "hr_score_note": candidate.get("hr_score_note"),
        "effective_score": effective,
        "injection_suspected": bool(candidate.get("injection_suspected", False)),
        "match": candidate.get("match") or {},
        "interview": interview_row,
        "proctor_events": proctor_events,
        "proctoring_events": proctor_events,
        "report": latest_report,
        "evaluation_report": latest_report,
        "audit_logs": audit_logs,
        "created_at": candidate.get("created_at"),
    }


# ============================================================================
# 3. HR Full-Control Overrides, Reports & Hiring Decisions
# ============================================================================

@router.patch("/candidates/{candidate_id}/status", summary="Override candidate status (any to any, reason required)")
@router.post("/candidates/{candidate_id}/override-status", include_in_schema=False)
async def override_candidate_status(
    candidate_id: str,
    payload: StatusOverrideRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Allows HR to move a candidate from any status to any status with a required reason.
    Verifies job ownership and writes audit_log.
    """
    try:
        target_status, clean_reason = payload.get_validated()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "applied")

    client.table("candidates").update({
        "status": target_status,
        "hr_notes": clean_reason,
    }).eq("id", candidate_id).execute()

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="status_override",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status=target_status,
        reason=clean_reason,
    )

    return {
        "candidate_id": candidate_id,
        "from_status": previous_status,
        "status": target_status,
        "reason": clean_reason,
    }


@router.patch("/candidates/{candidate_id}/score", summary="Override candidate score with note")
@router.post("/candidates/{candidate_id}/override-score", include_in_schema=False)
async def override_candidate_score(
    candidate_id: str,
    payload: ScoreOverrideRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Allows HR to override a candidate's resume score (0-100) while preserving ai_score.
    Verifies job ownership and writes audit_log.
    """
    try:
        new_score, clean_note = payload.get_validated()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    prev_effective = (
        candidate.get("hr_score_override")
        if candidate.get("hr_score_override") is not None
        else candidate.get("ai_score")
    )

    client.table("candidates").update({
        "hr_score_override": new_score,
        "hr_score_note": clean_note,
    }).eq("id", candidate_id).execute()

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="score_override",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=str(prev_effective) if prev_effective is not None else None,
        to_status=str(new_score),
        reason=clean_note,
    )

    return {
        "candidate_id": candidate_id,
        "ai_score": candidate.get("ai_score"),
        "hr_score_override": new_score,
        "effective_score": new_score,
        "note": clean_note,
    }


@router.post("/candidates/{candidate_id}/invite", summary="Manual interview invitation / resend")
async def invite_candidate(
    candidate_id: str,
    request: Request,
    payload: Optional[InviteRequest] = Body(default=None),
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Manual interview invitation (works for any candidate; also supports resending
    with a fresh token by voiding any previous interview token).
    Verifies ownership via assert_job_owner and writes audit_log + email_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    send_email = payload.send_email if payload is not None else True
    reason = (payload.reason if (payload and payload.reason) else "Manual invite by HR")

    # Dynamically extract client origin so the invite link matches the recruiter's frontend app
    origin_header = request.headers.get("origin") or request.headers.get("referer")
    frontend_base = None
    if origin_header:
        from urllib.parse import urlparse
        p = urlparse(origin_header)
        if p.scheme and p.netloc:
            frontend_base = f"{p.scheme}://{p.netloc}"

    return await invite_candidate_with_token(
        candidate=candidate,
        job=job_row,
        actor=current_user.id,
        reason=reason,
        send_email=send_email,
        hr_sender_email=current_user.email,
        frontend_url=frontend_base,
    )


@router.post("/candidates/{candidate_id}/cancel-invite", summary="Revoke active interview invitation")
async def cancel_candidate_invite(
    candidate_id: str,
    payload: Optional[CancelInviteRequest] = Body(default=None),
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Invalidates active interview token(s) for the candidate (voided=True),
    sets candidate status back to 'shortlisted', verifies ownership via assert_job_owner,
    and writes audit_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "invited")
    reason = (payload.reason if (payload and payload.reason) else "Invite cancelled by HR")

    client.table("interviews").update({"voided": True}).eq("candidate_id", candidate_id).execute()
    client.table("candidates").update({"status": "shortlisted"}).eq("id", candidate_id).execute()

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="invite_cancelled",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status="shortlisted",
        reason=reason,
    )

    return {
        "candidate_id": candidate_id,
        "status": "shortlisted",
    }


@router.post("/candidates/{candidate_id}/allow-retry", summary="Allow interview retry")
async def allow_interview_retry(
    candidate_id: str,
    request: Request,
    payload: Optional[AllowRetryRequest] = Body(default=None),
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Re-opens the candidate's interview session (or creates a new token if none exists)
    with retry_allowed=True, used_at=None, voided=False, status='pending',
    sets candidate status to 'invited', and writes audit_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "interviewed")
    reason = (payload.reason if (payload and payload.reason) else "Interview retry allowed by HR")

    # Extract client origin for invite link
    origin_header = request.headers.get("origin") or request.headers.get("referer")
    frontend_base = None
    if origin_header:
        from urllib.parse import urlparse
        p = urlparse(origin_header)
        if p.scheme and p.netloc:
            frontend_base = f"{p.scheme}://{p.netloc}"

    int_res = (
        client.table("interviews")
        .select("*")
        .eq("candidate_id", candidate_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if int_res and int_res.data:
        latest_int = int_res.data[0]
        new_expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
        client.table("interviews").update({
            "retry_allowed": True,
            "used_at": None,
            "voided": False,
            "status": "pending",
            "expires_at": new_expires,
            "transcript": [],
            "scores": [],
        }).eq("id", str(latest_int["id"])).execute()
        client.table("candidates").update({"status": "invited"}).eq("id", candidate_id).execute()
    else:
        await invite_candidate_with_token(
            candidate=candidate,
            job=job_row,
            actor=current_user.id,
            reason=reason,
            send_email=True,
            hr_sender_email=current_user.email,
            frontend_url=frontend_base,
        )

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="allow_retry",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status="invited",
        reason=reason,
    )

    return {
        "candidate_id": candidate_id,
        "status": "invited",
        "retry_allowed": True,
    }


@router.post("/candidates/{candidate_id}/report/regenerate", summary="Regenerate supervisor evaluation report")
@router.post("/candidates/{candidate_id}/regenerate-report", include_in_schema=False)
async def regenerate_evaluation_report(
    candidate_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Runs the Supervisor Agent (Gemini, Prompt S) to generate a new report version
    in public.reports and writes audit_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    await assert_job_owner(job_id=job_id, user_id=current_user.id)

    report_row = await run_supervisor_for_candidate(candidate_id=candidate_id)
    if not report_row:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supervisor report generation failed",
        )

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="report_regenerated",
        job_id=job_id,
        candidate_id=candidate_id,
        reason="Evaluation report regenerated by HR",
    )

    return report_row


@router.get(
    "/candidates/{candidate_id}/email-preview",
    response_model=EmailPreviewResponse,
    summary="Preview email before sending",
)
async def preview_candidate_email(
    candidate_id: str,
    type: Optional[str] = Query(default=None, description="hired | rejected | on_hold | corrected_decision"),
    template: Optional[str] = Query(default=None),
    current_user: HRUser = Depends(get_hr_user),
) -> EmailPreviewResponse:
    """
    Renders a preview of the fixed email template (hired, rejected, on_hold, corrected_decision)
    with HTML-escaped variables without sending any email.
    """
    chosen_type = (type or template or "on_hold").strip().lower()
    if chosen_type not in _ALLOWED_PREVIEW_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    rendered = render_email_template(
        chosen_type,
        context={
            "candidate_name": str(candidate.get("name") or "Candidate"),
            "job_title": str(job_row.get("title") or "Position"),
            "new_status": chosen_type,
        },
    )

    return EmailPreviewResponse(
        recipient=str(candidate.get("email") or ""),
        subject=rendered["subject"],
        html_body=rendered["html"],
        text_body=rendered["text"],
        html=rendered["html"],
        text=rendered["text"],
    )


@router.post("/candidates/{candidate_id}/decision", summary="Submit final hiring decision (hired/rejected/on_hold)")
async def submit_hiring_decision(
    candidate_id: str,
    payload: DecisionRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Sets the candidate status ('hired', 'rejected', or 'on_hold'), writes audit_log
    with from_status/to_status/reason, and ONLY sends an email if send_email is True
    and the HR JWT is valid.
    Supports changing a prior final decision later (sending 'corrected_decision' when
    transitioning from an earlier final decision).
    """
    try:
        target_status, clean_reason, send_email = payload.get_validated()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "interviewed").lower()
    is_decision_change = (
        previous_status in {"hired", "rejected", "on_hold"}
        and previous_status != target_status
    )

    client.table("candidates").update({
        "status": target_status,
        "hr_notes": clean_reason,
    }).eq("id", candidate_id).execute()

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="decision_changed" if is_decision_change else "decision",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status=target_status,
        reason=clean_reason,
    )

    template_used: Optional[str] = None
    if send_email:
        template_used = "corrected_decision" if is_decision_change else target_status
        await send_templated_email(
            recipient_email=str(candidate.get("email") or ""),
            template_type=template_used,
            context={
                "candidate_name": str(candidate.get("name") or "Candidate"),
                "job_title": str(job_row.get("title") or "Position"),
                "new_status": target_status,
                "correction_reason": clean_reason,
            },
            candidate_id=candidate_id,
            sent_by=current_user.id,
            hr_sender_email=current_user.email,
        )

    return {
        "candidate_id": candidate_id,
        "from_status": previous_status,
        "status": target_status,
        "decision": target_status,
        "email_sent": send_email,
        "template_used": template_used,
    }


@router.get("/audit-logs", summary="Get system audit logs for HR user")
async def get_audit_logs(
    entity_id: Optional[str] = None,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    current_user: HRUser = Depends(get_hr_user),
) -> List[Dict[str, Any]]:
    client = get_supabase_service_client()
    query = client.table("audit_log").select("*").eq("owner_id", current_user.id)
    if job_id:
        query = query.eq("job_id", job_id)
    if candidate_id or entity_id:
        query = query.eq("candidate_id", candidate_id or entity_id)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/agent-runs", summary="Get AI agent execution logs")
async def get_agent_runs(
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    current_user: HRUser = Depends(get_hr_user),
) -> List[Dict[str, Any]]:
    client = get_supabase_service_client()
    if job_id:
        await assert_job_owner(job_id=job_id, user_id=current_user.id)
        res = client.table("agent_runs").select("*").eq("job_id", job_id).order("created_at", desc=True).execute()
        return res.data or []
    if candidate_id:
        cand = _load_candidate_or_404(client, candidate_id)
        await assert_job_owner(job_id=str(cand.get("job_id") or ""), user_id=current_user.id)
        res = client.table("agent_runs").select("*").eq("candidate_id", candidate_id).order("created_at", desc=True).execute()
        return res.data or []
    return []
