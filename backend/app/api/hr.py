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
from app.services.storage import delete_resume_files
from app.models.schemas import (
    JobCreateRequest,
    JobUpdateRequest,
    JobDetailResponse,
    CandidateSummaryResponse,
    CandidateStage,
    JobProgressResponse,
    ProgressStepItem,
    ProgressNextAction,
    DeletePreviewResponse,
    JobDeleteRequest,
    JobDeleteResponse,
    StatusOverrideRequest,
    ScoreOverrideRequest,
    DecisionRequest,
    InviteRequest,
    CancelInviteRequest,
    AllowRetryRequest,
    EmailPreviewResponse,
    VALID_REASON_CATEGORIES,
    HROverridesListResponse,
    HROverrideItem,
    OverrideQuestionItem,
    HROverrideAnswerRequest,
)

logger = logging.getLogger("asanhire.api.hr")

def _record_override_event(
    client,
    hr_user_id: str,
    job_id: str,
    job_title: str,
    candidate_id: Optional[str],
    candidate_name: str,
    override_type: str,
    from_value: str,
    to_value: str,
    reason_category: str,
    reason: str,
) -> Optional[Dict[str, Any]]:
    hr_org = ""
    try:
        prof_res = client.table("hr_profiles").select("organization").eq("user_id", hr_user_id).execute()
        if prof_res and prof_res.data:
            hr_org = prof_res.data[0].get("organization") or ""
    except Exception:
        pass

    row = {
        "hr_user_id": hr_user_id,
        "hr_organization": hr_org,
        "job_id": job_id,
        "job_title": job_title,
        "candidate_id": candidate_id,
        "candidate_name": candidate_name or "[candidate removed]",
        "override_type": override_type,
        "from_value": from_value,
        "to_value": to_value,
        "reason_category": reason_category,
        "reason": reason,
        "admin_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        res = client.table("hr_override_events").insert(row).execute()
        return res.data[0] if res and res.data else row
    except Exception as e:
        logger.error(f"Failed to record hr_override_events: {type(e).__name__}")
        return None

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


def _format_time_remaining(seconds: Optional[int]) -> str:
    if seconds is None:
        return ""
    if seconds <= 0:
        return "Closed"
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m"
    return f"{seconds}s"


def _compute_job_timing_fields(row: Dict[str, Any]) -> Dict[str, Any]:
    now_utc = datetime.now(timezone.utc)
    deadline_raw = row.get("deadline")
    deadline_dt: Optional[datetime] = None
    if isinstance(deadline_raw, str):
        try:
            deadline_dt = datetime.fromisoformat(deadline_raw.replace("Z", "+00:00"))
        except Exception:
            deadline_dt = None
    elif isinstance(deadline_raw, datetime):
        deadline_dt = deadline_raw

    if deadline_dt and deadline_dt.tzinfo is None:
        deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)

    deadline_at = deadline_dt.isoformat() if deadline_dt else None
    server_time = now_utc.isoformat()
    seconds_until = int((deadline_dt - now_utc).total_seconds()) if deadline_dt else None

    auto_invite = bool(row.get("auto_invite", True))
    scheduler_ran = row.get("scheduler_ran_at")

    if not auto_invite:
        scheduler_state = "disabled"
    elif scheduler_ran:
        scheduler_state = "ran"
    elif seconds_until is not None and seconds_until <= 0:
        scheduler_state = "due_now"
    else:
        scheduler_state = "waiting"

    return {
        "deadline_at": deadline_at,
        "server_time": server_time,
        "seconds_until_deadline": seconds_until,
        "scheduler_state": scheduler_state,
    }


def _compute_candidate_stage(
    cand: Dict[str, Any],
    interview: Optional[Dict[str, Any]] = None,
    has_report: bool = False,
) -> CandidateStage:
    st = str(cand.get("status") or "applied").lower()
    hr_override = cand.get("hr_score_override")
    ai_score = cand.get("ai_score")
    effective = hr_override if hr_override is not None else ai_score
    now_utc = datetime.now(timezone.utc)

    if st in {"applied", "shortlisted"}:
        detail = f"Scored {int(effective)}" if effective is not None else "Scoring pending"
        return CandidateStage(step=2, label="Applications open", detail=detail)

    if st == "invited":
        is_expired = False
        if interview and interview.get("expires_at"):
            exp_raw = interview["expires_at"]
            try:
                exp_dt = datetime.fromisoformat(str(exp_raw).replace("Z", "+00:00"))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt <= now_utc:
                    is_expired = True
            except Exception:
                pass
        if is_expired:
            return CandidateStage(step=4, label="Invite expired", detail="Invite expired")
        return CandidateStage(step=4, label="Invited", detail="Invite sent, interview not started")

    if st == "interviewing":
        return CandidateStage(step=4, label="Interviewing", detail="Interview in progress")

    if st == "interviewed":
        detail = "Report ready" if has_report else "Report generating"
        return CandidateStage(step=5, label="Reports ready", detail=detail)

    if st in {"hired", "rejected", "on_hold"}:
        dec_label = {"hired": "Hired", "rejected": "Rejected", "on_hold": "On hold"}.get(st, st.capitalize())
        return CandidateStage(step=6, label="Final decision", detail=f"Decision: {dec_label}")

    return CandidateStage(step=2, label="Applications open", detail="Scoring pending")


def _compute_job_progress(client: Any, job_row: Dict[str, Any]) -> JobProgressResponse:
    job_id = str(job_row["id"])
    timing = _compute_job_timing_fields(job_row)
    deadline_at = timing["deadline_at"]
    server_time = timing["server_time"]
    seconds_until_deadline = timing["seconds_until_deadline"]
    scheduler_state = timing["scheduler_state"]
    scheduler_ran_at = job_row.get("scheduler_ran_at")
    auto_invite = bool(job_row.get("auto_invite", True))
    min_score = float(job_row.get("min_score") or 60.0)
    top_n = int(job_row.get("top_n") or 5)
    job_status = str(job_row.get("status") or "open")

    cands_res = (
        client.table("candidates")
        .select("id, status, ai_score, hr_score_override, injection_suspected")
        .eq("job_id", job_id)
        .execute()
    )
    candidates = cands_res.data or []
    cand_ids = [str(c["id"]) for c in candidates]

    applied_count = sum(1 for c in candidates if c.get("status") in {"applied", "shortlisted"})
    scored_count = 0
    below_min_count = 0
    injection_count = 0
    invited_count = 0
    interviewing_count = 0
    interviewed_count = 0
    hired_count = 0
    rejected_count = 0
    on_hold_count = 0

    for c in candidates:
        st = str(c.get("status") or "applied").lower()
        if c.get("injection_suspected"):
            injection_count += 1

        eff = c.get("hr_score_override") if c.get("hr_score_override") is not None else c.get("ai_score")
        if eff is not None:
            scored_count += 1
            if float(eff) < min_score:
                below_min_count += 1

        if st == "invited":
            invited_count += 1
        elif st == "interviewing":
            interviewing_count += 1
        elif st == "interviewed":
            interviewed_count += 1
        elif st == "hired":
            hired_count += 1
        elif st == "rejected":
            rejected_count += 1
        elif st == "on_hold":
            on_hold_count += 1

    reports_count = 0
    if cand_ids:
        try:
            rep_res = client.table("reports").select("id, candidate_id").in_("candidate_id", cand_ids).execute()
            reports_count = len(rep_res.data or [])
        except Exception:
            reports_count = 0

    email_failures_count = 0
    try:
        em_res = client.table("emails").select("id").eq("job_id", job_id).eq("status", "failed").execute()
        email_failures_count = len(em_res.data or [])
    except Exception:
        email_failures_count = 0

    now_utc = datetime.now(timezone.utc)
    expired_invites_count = 0
    if cand_ids and invited_count > 0:
        try:
            int_res = client.table("interviews").select("id, candidate_id, expires_at, status").in_("candidate_id", cand_ids).execute()
            for iv in (int_res.data or []):
                if iv.get("expires_at"):
                    try:
                        exp_dt = datetime.fromisoformat(str(iv["expires_at"]).replace("Z", "+00:00"))
                        if exp_dt.tzinfo is None:
                            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                        if exp_dt <= now_utc and str(iv.get("status") or "").lower() not in {"interviewed", "completed"}:
                            expired_invites_count += 1
                    except Exception:
                        pass
        except Exception:
            expired_invites_count = 0

    steps: List[ProgressStepItem] = []

    # Step 1: Job posted and rubric ready
    rubric_ready = bool(job_row.get("rubric")) and job_status != "draft"
    step1_state = "attention" if not rubric_ready else "done"
    step1_summary = "Rubric missing or job in draft status" if not rubric_ready else "Rubric ready with custom criteria"
    steps.append(ProgressStepItem(
        step=1,
        name="Job posted and rubric ready",
        state=step1_state,
        summary=step1_summary,
        counts={"rubric_ready": rubric_ready, "status": job_status},
    ))

    # Step 2: Applications open (resumes being scored)
    is_deadline_passed = (seconds_until_deadline is not None and seconds_until_deadline <= 0) or scheduler_ran_at is not None
    if not rubric_ready:
        step2_state = "upcoming"
    elif is_deadline_passed:
        step2_state = "done"
    else:
        step2_state = "current"
    step2_summary = f"{len(candidates)} applied, {scored_count} scored"
    steps.append(ProgressStepItem(
        step=2,
        name="Applications open (resumes being scored)",
        state=step2_state,
        summary=step2_summary,
        counts={
            "applied": applied_count,
            "scored": scored_count,
            "below_minimum": below_min_count,
            "injection_flagged": injection_count,
        },
    ))

    # Step 3: Deadline and auto-invite
    time_left_str = _format_time_remaining(seconds_until_deadline)
    if not rubric_ready:
        step3_state = "upcoming"
        step3_summary = "Awaiting rubric readiness"
    elif scheduler_ran_at:
        step3_state = "attention" if email_failures_count > 0 else "done"
        step3_summary = f"Pipeline ran; {invited_count} invited" + (f" ({email_failures_count} email failed)" if email_failures_count > 0 else "")
    elif is_deadline_passed:
        step3_state = "attention"
        step3_summary = "Deadline passed; pipeline awaiting execution"
    else:
        step3_state = "current"
        if not auto_invite:
            step3_summary = f"Closes in {time_left_str} (invites manual)"
        else:
            step3_summary = f"Closes in {time_left_str}: pipeline starts automatically"
    steps.append(ProgressStepItem(
        step=3,
        name="Deadline and auto-invite",
        state=step3_state,
        summary=step3_summary,
        counts={
            "invited": invited_count,
            "auto_invite": auto_invite,
            "scheduler_state": scheduler_state,
            "email_failures": email_failures_count,
        },
    ))

    # Step 4: Interviews
    if invited_count == 0 and interviewing_count == 0 and interviewed_count == 0:
        step4_state = "upcoming"
        step4_summary = "No interviews in progress"
    elif expired_invites_count > 0:
        step4_state = "attention"
        step4_summary = f"{expired_invites_count} interview link(s) expired"
    elif invited_count > 0 or interviewing_count > 0:
        step4_state = "current"
        step4_summary = f"{interviewing_count} in progress, {invited_count} pending"
    else:
        step4_state = "done"
        step4_summary = f"{interviewed_count} interviews completed"
    steps.append(ProgressStepItem(
        step=4,
        name="Interviews",
        state=step4_state,
        summary=step4_summary,
        counts={
            "invited": invited_count,
            "interviewing": interviewing_count,
            "interviewed": interviewed_count,
            "expired_invites": expired_invites_count,
        },
    ))

    # Step 5: Reports ready
    if interviewed_count == 0:
        step5_state = "upcoming"
        step5_summary = "Awaiting completed interviews"
    elif reports_count < interviewed_count:
        step5_state = "current"
        step5_summary = f"{reports_count} of {interviewed_count} reports generated"
    else:
        step5_state = "done"
        step5_summary = f"{reports_count} reports ready for review"
    steps.append(ProgressStepItem(
        step=5,
        name="Reports ready",
        state=step5_state,
        summary=step5_summary,
        counts={
            "reports_ready": reports_count,
            "interviewed": interviewed_count,
        },
    ))

    # Step 6: Final decisions
    total_decided = hired_count + rejected_count + on_hold_count
    undecided = interviewed_count
    if interviewed_count == 0 and total_decided == 0:
        step6_state = "upcoming"
        step6_summary = "No candidates ready for decision"
    elif undecided > 0:
        step6_state = "current"
        step6_summary = f"{undecided} candidate(s) awaiting decision"
    else:
        step6_state = "done"
        step6_summary = f"All decisions made ({hired_count} hired, {rejected_count} rejected, {on_hold_count} on hold)"
    steps.append(ProgressStepItem(
        step=6,
        name="Final decisions",
        state=step6_state,
        summary=step6_summary,
        counts={
            "hired": hired_count,
            "rejected": rejected_count,
            "on_hold": on_hold_count,
            "undecided": undecided,
        },
    ))

    # Current step evaluation (Rules C2)
    qualified_uninvited = (
        scored_count > 0
        and (len(candidates) - below_min_count) > invited_count
        and invited_count < top_n
    )
    if not rubric_ready or job_status == "draft":
        current_step = 1
    elif job_status == "open" and not is_deadline_passed and scheduler_ran_at is None:
        current_step = 2
    elif (is_deadline_passed or scheduler_ran_at is not None) and (qualified_uninvited or scheduler_ran_at is None):
        current_step = 3
    elif (invited_count > 0 or interviewing_count > 0):
        current_step = 4
    elif interviewed_count > 0:
        current_step = 5
    else:
        current_step = 6

    # Next action determination
    next_action: Optional[ProgressNextAction] = None
    if not rubric_ready:
        next_action = ProgressNextAction(
            label="Regenerate rubric",
            hint="The AI rubric is missing or in draft state. Regenerate rubric to proceed.",
            type="warning",
        )
    elif email_failures_count > 0:
        next_action = ProgressNextAction(
            label=f"Resend {email_failures_count} failed invite{'s' if email_failures_count > 1 else ''}",
            hint="One or more invitation emails failed to deliver to candidates.",
            type="warning",
        )
    elif expired_invites_count > 0:
        next_action = ProgressNextAction(
            label="Review expired invites",
            hint="Candidates did not complete their interviews before the deadline expired.",
            type="warning",
        )
    elif current_step == 2:
        next_action = ProgressNextAction(
            label="Simulate deadline",
            hint=f"Closes in {time_left_str}: the scheduler will invite the top {top_n} who scored {int(min_score)} or more.",
            type="info",
        )
    elif current_step == 3:
        next_action = ProgressNextAction(
            label="Simulate deadline",
            hint="Deadline has passed. Run the scheduling pipeline to invite top candidates.",
            type="action",
        )
    elif current_step == 4:
        next_action = ProgressNextAction(
            label="Monitor interviews",
            hint=f"{interviewing_count} interview(s) in progress, {invited_count} pending candidate response.",
            type="info",
        )
    elif current_step == 5:
        next_action = ProgressNextAction(
            label=f"Review {interviewed_count} report{'s' if interviewed_count > 1 else ''}",
            hint=f"{reports_count} candidate report(s) ready for review and hiring decision.",
            type="action",
        )
    elif current_step == 6:
        if undecided > 0:
            next_action = ProgressNextAction(
                label="Make final decisions",
                hint=f"{undecided} interviewed candidate(s) still require a decision.",
                type="action",
            )
        else:
            next_action = ProgressNextAction(
                label="All decisions made",
                hint="All candidate reviews and decisions are complete.",
                type="info",
            )

    # Warnings list
    warnings: List[str] = []
    if not rubric_ready:
        warnings.append("Rubric is missing or job is in draft state.")
    if is_deadline_passed and scheduler_ran_at is None and auto_invite:
        warnings.append("Scheduler has not run and the deadline has passed.")
    if email_failures_count > 0:
        warnings.append(f"{email_failures_count} email failure(s) with no resend yet.")
    if expired_invites_count > 0:
        warnings.append(f"{expired_invites_count} interview link(s) expired without a completed interview.")
    if injection_count > 0:
        warnings.append(f"{injection_count} candidate(s) with injection_suspected waiting for review.")
    if job_status == "closed" and (applied_count > 0 or interviewed_count > 0):
        warnings.append("Job is closed with undecided candidates.")

    return JobProgressResponse(
        current_step=current_step,
        steps=steps,
        next_action=next_action,
        warnings=warnings,
        deadline_at=deadline_at,
        server_time=server_time,
        seconds_until_deadline=seconds_until_deadline,
        scheduler_ran_at=str(scheduler_ran_at) if scheduler_ran_at else None,
        scheduler_state=scheduler_state,
    )


def _row_to_job_detail(row: Dict[str, Any], message: Optional[str] = None) -> JobDetailResponse:
    timing = _compute_job_timing_fields(row)
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
        deadline_at=timing["deadline_at"],
        server_time=timing["server_time"],
        seconds_until_deadline=timing["seconds_until_deadline"],
        scheduler_state=timing["scheduler_state"],
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
        "department": job_in.department,
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


@router.get(
    "/jobs/{job_id}/progress",
    response_model=JobProgressResponse,
    summary="Get workflow progress and step breakdown for job",
)
async def get_job_progress(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> JobProgressResponse:
    """Returns rule-based 6-step progress, breakdown counts, next_action and warnings."""
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)
    client = get_supabase_service_client()
    return _compute_job_progress(client, job_row)


@router.patch(
    "/jobs/{job_id}",
    response_model=JobDetailResponse,
    summary="Update job settings or deadline",
)
async def update_job(
    job_id: str,
    payload: JobUpdateRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> JobDetailResponse:
    """
    Updates job configuration and deadline.
    If deadline is moved into the future, re-arms the scheduler (sets scheduler_ran_at = null).
    """
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)
    client = get_supabase_service_client()

    update_dict: Dict[str, Any] = {}
    if payload.title is not None:
        update_dict["title"] = payload.title
    if payload.description is not None:
        update_dict["description"] = payload.description
    if payload.skills is not None:
        update_dict["skills"] = payload.skills
    if payload.experience_level is not None:
        update_dict["experience_level"] = payload.experience_level
    if payload.top_n is not None:
        update_dict["top_n"] = payload.top_n
    if payload.min_score is not None:
        update_dict["min_score"] = payload.min_score
    if payload.auto_invite is not None:
        update_dict["auto_invite"] = payload.auto_invite
    if payload.status is not None:
        update_dict["status"] = payload.status
    if payload.department is not None:
        update_dict["department"] = payload.department
    if payload.deadline is not None:
        update_dict["deadline"] = payload.deadline.isoformat()
        now_utc = datetime.now(timezone.utc)
        if payload.deadline > now_utc:
            update_dict["scheduler_ran_at"] = None

    if update_dict:
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = client.table("jobs").update(update_dict).eq("id", job_id).execute()
        if res and res.data:
            job_row = res.data[0]

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="job_updated",
        job_id=job_id,
        reason="Job settings or deadline updated by HR",
    )

    return _row_to_job_detail(job_row)


@router.post(
    "/jobs/{job_id}/rubric/regenerate",
    response_model=JobDetailResponse,
    summary="Regenerate rubric for an existing job",
)
async def regenerate_job_rubric(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> JobDetailResponse:
    """
    Reruns the Rubric Agent for an existing job owned by the HR user,
    updates jobs.rubric, writes audit_log, and returns the updated job.
    """
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)
    title = str(job_row.get("title") or "")
    description = str(job_row.get("description") or "")
    skills = job_row.get("skills") or []
    experience_level = str(job_row.get("experience_level") or "mid")

    rubric_dict, final_status, fallback_msg = await run_rubric_for_job(
        job_id=job_id,
        title=title,
        description=description,
        skills=skills,
        experience_level=experience_level,
    )

    client = get_supabase_service_client()
    res = client.table("jobs").select("*").eq("id", job_id).execute()
    updated_job = res.data[0] if (res and res.data) else job_row
    updated_job["rubric"] = rubric_dict

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="rubric_regenerated",
        job_id=job_id,
        reason="Rubric regenerated by HR",
    )

    return _row_to_job_detail(updated_job, message=fallback_msg)


@router.get(
    "/jobs/{job_id}/delete-preview",
    response_model=DeletePreviewResponse,
    summary="Get preview counts for job deletion",
)
async def get_job_delete_preview(
    job_id: str,
    current_user: HRUser = Depends(get_hr_user),
) -> DeletePreviewResponse:
    """Returns counts of all candidate, interview, and telemetry data to be removed on job deletion."""
    await assert_job_owner(job_id=job_id, user_id=current_user.id)
    client = get_supabase_service_client()

    cands_res = client.table("candidates").select("id, resume_path").eq("job_id", job_id).execute()
    cands = cands_res.data or []
    cand_ids = [str(c["id"]) for c in cands]
    candidates_count = len(cands)
    resume_files_count = sum(1 for c in cands if c.get("resume_path"))

    interviews_count = 0
    interview_ids = []
    if cand_ids:
        int_res = client.table("interviews").select("id").in_("candidate_id", cand_ids).execute()
        ints = int_res.data or []
        interviews_count = len(ints)
        interview_ids = [str(i["id"]) for i in ints]

    proctor_events_count = 0
    if interview_ids:
        ev_res = client.table("proctor_events").select("id").in_("interview_id", interview_ids).execute()
        proctor_events_count = len(ev_res.data or [])

    reports_count = 0
    if cand_ids:
        rep_res = client.table("reports").select("id").in_("candidate_id", cand_ids).execute()
        reports_count = len(rep_res.data or [])

    email_logs_count = 0
    try:
        em_res = client.table("emails").select("id").eq("job_id", job_id).execute()
        email_logs_count = len(em_res.data or [])
    except Exception:
        email_logs_count = 0

    agent_runs_count = 0
    try:
        ar_res = client.table("agent_runs").select("id").eq("job_id", job_id).execute()
        agent_runs_count = len(ar_res.data or [])
    except Exception:
        agent_runs_count = 0

    return DeletePreviewResponse(
        candidates=candidates_count,
        resume_files=resume_files_count,
        interviews=interviews_count,
        proctor_events=proctor_events_count,
        reports=reports_count,
        email_logs=email_logs_count,
        agent_runs=agent_runs_count,
    )


@router.delete(
    "/jobs/{job_id}",
    response_model=JobDeleteResponse,
    summary="Permanently delete job and all candidate data",
)
async def delete_job(
    job_id: str,
    payload: JobDeleteRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> JobDeleteResponse:
    """
    Fail-safe job deletion:
    1. Sets status = 'deleting'
    2. Deletes resume files with retry
    3. Cascades delete of DB rows (proctor events, reports, interviews, emails, agent_runs, candidate audit logs, candidates, job)
    4. Records count-only tombstone in audit_log
    """
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)
    client = get_supabase_service_client()

    expected_title = str(job_row.get("title") or "").strip()
    if payload.confirm_title.strip() != expected_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation title does not match job title",
        )

    # 1. Atomically set status = 'deleting'
    client.table("jobs").update({"status": "deleting"}).eq("id", job_id).execute()

    # 2. Gather candidates & resume files
    cands_res = client.table("candidates").select("id, resume_path").eq("job_id", job_id).execute()
    cands = cands_res.data or []
    cand_ids = [str(c["id"]) for c in cands]
    resume_paths = [str(c["resume_path"]) for c in cands if c.get("resume_path")]

    deleted_resumes, failed_resumes = delete_resume_files(resume_paths)

    # 3. Cascading delete from child tables
    interviews_count = 0
    if cand_ids:
        int_res = client.table("interviews").select("id").in_("candidate_id", cand_ids).execute()
        ints = int_res.data or []
        interview_ids = [str(i["id"]) for i in ints]
        interviews_count = len(ints)
        if interview_ids:
            client.table("proctor_events").delete().in_("interview_id", interview_ids).execute()
        client.table("reports").delete().in_("candidate_id", cand_ids).execute()
        client.table("interviews").delete().in_("candidate_id", cand_ids).execute()

    try:
        client.table("emails").delete().eq("job_id", job_id).execute()
    except Exception:
        pass
    try:
        client.table("agent_runs").delete().eq("job_id", job_id).execute()
    except Exception:
        pass

    try:
        client.table("audit_log").delete().eq("job_id", job_id).execute()
        if cand_ids:
            client.table("audit_log").delete().in_("candidate_id", cand_ids).execute()
    except Exception:
        pass

    client.table("candidates").delete().eq("job_id", job_id).execute()
    client.table("jobs").delete().eq("id", job_id).execute()

    counts_dict = {
        "candidates": len(cands),
        "resume_files": len(deleted_resumes),
        "interviews": interviews_count,
    }
    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="job_deleted",
        job_id=job_id,
        reason=f"Job '{expected_title}' deleted with {len(cands)} candidates",
    )

    return JobDeleteResponse(deleted=True, counts=counts_dict)


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
    cand_ids = [str(r["id"]) for r in rows]

    cand_interviews: Dict[str, Dict[str, Any]] = {}
    if cand_ids:
        try:
            int_res = client.table("interviews").select("candidate_id, status, expires_at").in_("candidate_id", cand_ids).execute()
            for iv in (int_res.data or []):
                cand_interviews[str(iv["candidate_id"])] = iv
        except Exception:
            cand_interviews = {}

    cand_reports: set[str] = set()
    if cand_ids:
        try:
            rep_res = client.table("reports").select("candidate_id").in_("candidate_id", cand_ids).execute()
            for rp in (rep_res.data or []):
                cand_reports.add(str(rp["candidate_id"]))
        except Exception:
            cand_reports = set()

    for r in rows:
        cid = str(r["id"])
        hr_override = r.get("hr_score_override")
        ai_score = r.get("ai_score")
        effective = hr_override if hr_override is not None else ai_score

        match_data = r.get("match") if isinstance(r.get("match"), dict) else {}
        strengths = list(match_data.get("strengths") or [])[:3]
        gaps = list(match_data.get("gaps") or [])[:3]

        stage = _compute_candidate_stage(
            r,
            interview=cand_interviews.get(cid),
            has_report=(cid in cand_reports),
        )

        summaries.append(
            CandidateSummaryResponse(
                id=cid,
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
                stage=stage,
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

    stage = _compute_candidate_stage(
        candidate,
        interview=interview_row,
        has_report=(latest_report is not None),
    )

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
        "stage": stage.model_dump(),
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
    Verifies job ownership, records hr_override_events, and writes audit_log.
    """
    try:
        target_status, clean_reason, reason_category = payload.get_validated()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "applied")

    client.table("candidates").update({
        "status": target_status,
        "hr_notes": clean_reason,
    }).eq("id", candidate_id).execute()

    _record_override_event(
        client=client,
        hr_user_id=current_user.id,
        job_id=job_id,
        job_title=str(job_row.get("title") or ""),
        candidate_id=candidate_id,
        candidate_name=str(candidate.get("name") or ""),
        override_type="status_change",
        from_value=previous_status,
        to_value=target_status,
        reason_category=reason_category,
        reason=clean_reason,
    )

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
    Verifies job ownership, records hr_override_events, and writes audit_log.
    """
    try:
        new_score, clean_note, reason_category = payload.get_validated()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    prev_effective = (
        candidate.get("hr_score_override")
        if candidate.get("hr_score_override") is not None
        else candidate.get("ai_score")
    )

    client.table("candidates").update({
        "hr_score_override": new_score,
        "hr_score_note": clean_note,
    }).eq("id", candidate_id).execute()

    _record_override_event(
        client=client,
        hr_user_id=current_user.id,
        job_id=job_id,
        job_title=str(job_row.get("title") or ""),
        candidate_id=candidate_id,
        candidate_name=str(candidate.get("name") or ""),
        override_type="score_override",
        from_value=str(prev_effective) if prev_effective is not None else "",
        to_value=str(new_score),
        reason_category=reason_category,
        reason=clean_note,
    )

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
    If score is below min_score, records manual_invite_below_min override event.
    Verifies ownership via assert_job_owner and writes audit_log + email_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    send_email = payload.send_email if payload is not None else True
    reason = (payload.reason if (payload and payload.reason) else "Manual invite by HR")
    reason_cat = (payload.reason_category if (payload and payload.reason_category) else "other")

    eff_score = (
        candidate.get("hr_score_override")
        if candidate.get("hr_score_override") is not None
        else candidate.get("ai_score")
    )
    min_score = float(job_row.get("min_score") or 60.0)
    is_below_min = eff_score is not None and float(eff_score) < min_score

    if is_below_min:
        if not reason or len(reason.strip()) < 10 or len(reason.strip()) > 500:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required (10-500 chars) for invite below minimum score",
            )
        if reason_cat not in VALID_REASON_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid reason_category",
            )
        _record_override_event(
            client=client,
            hr_user_id=current_user.id,
            job_id=job_id,
            job_title=str(job_row.get("title") or ""),
            candidate_id=candidate_id,
            candidate_name=str(candidate.get("name") or ""),
            override_type="manual_invite_below_min",
            from_value=f"score={eff_score}",
            to_value=f"invited (min={min_score})",
            reason_category=reason_cat,
            reason=reason.strip(),
        )

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
    records cancel_invite override event, and writes audit_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "invited")
    if payload:
        try:
            clean_reason, reason_cat = payload.get_validated()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required (10-500 chars)",
            )
    else:
        clean_reason, reason_cat = "Invite cancelled by HR", "other"

    client.table("interviews").update({"voided": True}).eq("candidate_id", candidate_id).execute()
    client.table("candidates").update({"status": "shortlisted"}).eq("id", candidate_id).execute()

    _record_override_event(
        client=client,
        hr_user_id=current_user.id,
        job_id=job_id,
        job_title=str(job_row.get("title") or ""),
        candidate_id=candidate_id,
        candidate_name=str(candidate.get("name") or ""),
        override_type="cancel_invite",
        from_value=previous_status,
        to_value="shortlisted",
        reason_category=reason_cat,
        reason=clean_reason,
    )

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="invite_cancelled",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status="shortlisted",
        reason=clean_reason,
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
    sets candidate status to 'invited', records allow_retry override event, and writes audit_log.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "interviewed")
    if payload:
        try:
            clean_reason, reason_cat = payload.get_validated()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required (10-500 chars)",
            )
    else:
        clean_reason, reason_cat = "Interview retry allowed by HR", "other"

    _record_override_event(
        client=client,
        hr_user_id=current_user.id,
        job_id=job_id,
        job_title=str(job_row.get("title") or ""),
        candidate_id=candidate_id,
        candidate_name=str(candidate.get("name") or ""),
        override_type="allow_retry",
        from_value=previous_status,
        to_value="invited",
        reason_category=reason_cat,
        reason=clean_reason,
    )

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
            reason=clean_reason,
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
        reason=clean_reason,
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
    If decision differs from AI recommendation or changes an existing decision,
    it records an hr_override_events record.
    """
    client = get_supabase_service_client()
    candidate = _load_candidate_or_404(client, candidate_id)
    job_id = str(candidate.get("job_id") or "")
    job_row = await assert_job_owner(job_id=job_id, user_id=current_user.id)

    previous_status = str(candidate.get("status") or "interviewed").lower()

    # Look up recommendation from latest supervisor report
    rep_res = (
        client.table("reports")
        .select("recommendation")
        .eq("candidate_id", candidate_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    rec_val = (
        (rep_res.data[0].get("recommendation") or "").strip().lower()
        if (rep_res and rep_res.data)
        else ""
    )
    rec_mapped = {"hire": "hired", "advance": "hired", "reject": "rejected", "hold": "on_hold"}.get(rec_val, rec_val)

    # Check if target status will be an override
    target_tentative = (payload.decision or "").strip().lower()
    target_tentative = {"hire": "hired", "reject": "rejected", "hold": "on_hold"}.get(target_tentative, target_tentative)

    is_decision_change = (
        previous_status in {"hired", "rejected", "on_hold"}
        and previous_status != target_tentative
    )
    is_rec_diff = (
        bool(rec_mapped)
        and rec_mapped in {"hired", "rejected", "on_hold"}
        and target_tentative != rec_mapped
    )
    is_override = is_decision_change or is_rec_diff

    try:
        target_status, clean_reason, reason_cat, send_email = payload.get_validated(is_override=is_override)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request payload",
        )

    client.table("candidates").update({
        "status": target_status,
        "hr_notes": clean_reason,
    }).eq("id", candidate_id).execute()

    if is_override:
        override_type = "decision_change" if is_decision_change else "recommendation_override"
        from_val = previous_status if is_decision_change else (rec_mapped or "no_recommendation")
        _record_override_event(
            client=client,
            hr_user_id=current_user.id,
            job_id=job_id,
            job_title=str(job_row.get("title") or ""),
            candidate_id=candidate_id,
            candidate_name=str(candidate.get("name") or ""),
            override_type=override_type,
            from_value=from_val,
            to_value=target_status,
            reason_category=reason_cat or "other",
            reason=clean_reason,
        )

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


# ============================================================================
# HR Override Views & Admin Question Answering
# ============================================================================

@router.get("/overrides", response_model=HROverridesListResponse, summary="List HR's own overrides and questions")
async def list_hr_overrides(
    current_user: HRUser = Depends(get_hr_user),
) -> HROverridesListResponse:
    """
    Returns list of overrides created by the current HR user, along with questions
    asked by Admin and count of unanswered questions.
    """
    client = get_supabase_service_client()
    res = (
        client.table("hr_override_events")
        .select("*")
        .eq("hr_user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []

    override_ids = [str(r["id"]) for r in rows if r.get("id")]
    questions_map: Dict[str, List[OverrideQuestionItem]] = {}
    if override_ids:
        try:
            q_res = (
                client.table("hr_override_questions")
                .select("*")
                .in_("override_id", override_ids)
                .order("asked_at", desc=False)
                .execute()
            )
            for q in (q_res.data or []):
                oid = str(q.get("override_id"))
                questions_map.setdefault(oid, []).append(
                    OverrideQuestionItem(
                        id=str(q.get("id")),
                        override_id=oid,
                        admin_id=str(q.get("admin_id")),
                        question=str(q.get("question") or ""),
                        answer=q.get("answer"),
                        asked_at=q.get("asked_at"),
                        answered_at=q.get("answered_at"),
                    )
                )
        except Exception:
            pass

    items: List[HROverrideItem] = []
    unanswered_count = 0
    for r in rows:
        oid = str(r.get("id"))
        status_val = str(r.get("admin_status") or "pending")
        if status_val == "question_asked":
            unanswered_count += 1

        items.append(
            HROverrideItem(
                id=oid,
                job_id=str(r.get("job_id")),
                job_title=str(r.get("job_title") or ""),
                candidate_id=str(r.get("candidate_id")) if r.get("candidate_id") else None,
                candidate_name=str(r.get("candidate_name") or ""),
                override_type=str(r.get("override_type") or ""),
                from_value=str(r.get("from_value") or ""),
                to_value=str(r.get("to_value") or ""),
                reason_category=str(r.get("reason_category") or "other"),
                reason=str(r.get("reason") or ""),
                admin_status=status_val,
                admin_note=r.get("admin_note"),
                created_at=r.get("created_at"),
                questions=questions_map.get(oid, []),
            )
        )

    return HROverridesListResponse(overrides=items, unanswered_questions_count=unanswered_count)


@router.post("/overrides/{override_id}/questions/{question_id}/answer", summary="Answer Admin's question about an override")
async def answer_override_question(
    override_id: str,
    question_id: str,
    payload: HROverrideAnswerRequest,
    current_user: HRUser = Depends(get_hr_user),
) -> Dict[str, Any]:
    """
    Submits HR's answer to an Admin question, transitions admin_status to 'answered',
    and records audit_log.
    """
    clean_answer = payload.answer.strip()
    if not clean_answer or len(clean_answer) > 1000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Answer must be between 1 and 1000 characters",
        )

    client = get_supabase_service_client()
    ov_res = (
        client.table("hr_override_events")
        .select("*")
        .eq("id", override_id)
        .eq("hr_user_id", current_user.id)
        .execute()
    )
    if not ov_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Override event not found")

    q_res = (
        client.table("hr_override_questions")
        .select("*")
        .eq("id", question_id)
        .eq("override_id", override_id)
        .execute()
    )
    if not q_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    client.table("hr_override_questions").update({
        "answer": clean_answer,
        "answered_at": now_iso,
    }).eq("id", question_id).execute()

    client.table("hr_override_events").update({
        "admin_status": "answered",
    }).eq("id", override_id).execute()

    write_audit_log(
        owner_id=current_user.id,
        actor=current_user.id,
        action="override_question_answered",
        job_id=str(ov_res.data[0].get("job_id")),
        candidate_id=str(ov_res.data[0].get("candidate_id")) if ov_res.data[0].get("candidate_id") else None,
        reason=f"Answered admin question: {clean_answer[:60]}...",
    )

    return {"success": True, "status": "answered"}
