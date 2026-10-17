import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError

from app.models.schemas import (
    JobCreateRequest,
    JobUpdateRequest,
    CandidateStage,
    JobProgressResponse,
    DeletePreviewResponse,
    JobDeleteRequest,
)
from app.api.hr import (
    _compute_job_timing_fields,
    _compute_candidate_stage,
    _format_time_remaining,
)


# ============================================================================
# 1. Exact Deadline Time Validation Tests
# ============================================================================

def test_naive_datetime_rejected():
    """Naive datetime (no timezone offset or Z) must be strictly rejected."""
    # 5 days in future but no timezone
    naive_str = "2026-10-25T18:00:00"
    with pytest.raises(ValidationError) as exc_info:
        JobCreateRequest(
            title="Senior AI Engineer",
            description="Leading AI infrastructure.",
            skills=["Python", "FastAPI"],
            experience_level="Senior",
            deadline=naive_str,
        )
    assert "timezone" in str(exc_info.value).lower()


def test_past_deadline_rejected():
    """Deadline in the past or < 1 minute in the future must be rejected."""
    past_str = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    with pytest.raises(ValidationError) as exc_info:
        JobCreateRequest(
            title="Senior AI Engineer",
            description="Leading AI infrastructure.",
            skills=["Python", "FastAPI"],
            experience_level="Senior",
            deadline=past_str,
        )
    assert "at least 1 minute in the future" in str(exc_info.value).lower()


def test_valid_timezone_deadlines_accepted():
    """Deadlines with Z or offset >= 1 min in future must be accepted."""
    future_z = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    req_z = JobCreateRequest(
        title="Senior AI Engineer",
        description="Leading AI infrastructure.",
        skills=["Python", "FastAPI"],
        experience_level="Senior",
        deadline=future_z,
    )
    assert req_z.deadline.tzinfo is not None

    future_offset = (datetime.now(timezone(timedelta(hours=5))) + timedelta(hours=2)).isoformat()
    req_offset = JobCreateRequest(
        title="Senior AI Engineer",
        description="Leading AI infrastructure.",
        skills=["Python", "FastAPI"],
        experience_level="Senior",
        deadline=future_offset,
    )
    assert req_offset.deadline.tzinfo is not None


# ============================================================================
# 2. Timing Helpers & Formatting Tests
# ============================================================================

def test_time_remaining_formatting():
    assert _format_time_remaining(None) == ""
    assert _format_time_remaining(0) == "Closed"
    assert _format_time_remaining(-50) == "Closed"
    assert _format_time_remaining(30) == "30s"
    assert _format_time_remaining(125) == "2m"
    assert _format_time_remaining(3700) == "1h 1m"
    assert _format_time_remaining(90000) == "1d 1h 0m"


def test_job_timing_fields_computation():
    now_utc = datetime.now(timezone.utc)
    future_deadline = (now_utc + timedelta(hours=5)).isoformat()
    
    # Active waiting
    job_row = {
        "deadline": future_deadline,
        "auto_invite": True,
        "scheduler_ran_at": None,
    }
    timing = _compute_job_timing_fields(job_row)
    assert timing["scheduler_state"] == "waiting"
    assert timing["seconds_until_deadline"] > 0
    assert timing["server_time"] is not None

    # Disabled
    job_row_disabled = {
        "deadline": future_deadline,
        "auto_invite": False,
        "scheduler_ran_at": None,
    }
    assert _compute_job_timing_fields(job_row_disabled)["scheduler_state"] == "disabled"

    # Ran
    job_row_ran = {
        "deadline": future_deadline,
        "auto_invite": True,
        "scheduler_ran_at": now_utc.isoformat(),
    }
    assert _compute_job_timing_fields(job_row_ran)["scheduler_state"] == "ran"

    # Due now
    past_deadline = (now_utc - timedelta(minutes=10)).isoformat()
    job_row_due = {
        "deadline": past_deadline,
        "auto_invite": True,
        "scheduler_ran_at": None,
    }
    assert _compute_job_timing_fields(job_row_due)["scheduler_state"] == "due_now"


# ============================================================================
# 3. Candidate Stage Mapping Tests
# ============================================================================

def test_candidate_stage_mapping():
    # 1. Applied / Shortlisted -> Step 2
    cand_applied = {"status": "applied", "ai_score": 85, "hr_score_override": None}
    stage = _compute_candidate_stage(cand_applied)
    assert stage.step == 2
    assert "85" in stage.detail

    cand_pending = {"status": "applied", "ai_score": None, "hr_score_override": None}
    assert _compute_candidate_stage(cand_pending).detail == "Scoring pending"

    # 2. Invited -> Step 4
    future_exp = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    cand_invited = {"status": "invited"}
    stage_inv = _compute_candidate_stage(cand_invited, interview={"expires_at": future_exp})
    assert stage_inv.step == 4
    assert stage_inv.label == "Invited"
    assert "not started" in stage_inv.detail

    # 3. Invited but expired
    past_exp = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    stage_exp = _compute_candidate_stage(cand_invited, interview={"expires_at": past_exp})
    assert stage_exp.step == 4
    assert stage_exp.label == "Invite expired"

    # 4. Interviewing -> Step 4
    cand_interviewing = {"status": "interviewing"}
    stage_in_prog = _compute_candidate_stage(cand_interviewing)
    assert stage_in_prog.step == 4
    assert stage_in_prog.label == "Interviewing"

    # 5. Interviewed -> Step 5
    cand_interviewed = {"status": "interviewed"}
    stage_rep_ready = _compute_candidate_stage(cand_interviewed, has_report=True)
    assert stage_rep_ready.step == 5
    assert stage_rep_ready.detail == "Report ready"

    stage_rep_gen = _compute_candidate_stage(cand_interviewed, has_report=False)
    assert stage_rep_gen.step == 5
    assert stage_rep_gen.detail == "Report generating"

    # 6. Final decisions -> Step 6
    cand_hired = {"status": "hired"}
    stage_hired = _compute_candidate_stage(cand_hired)
    assert stage_hired.step == 6
    assert "Hired" in stage_hired.detail

    cand_rejected = {"status": "rejected"}
    stage_rej = _compute_candidate_stage(cand_rejected)
    assert stage_rej.step == 6
    assert "Rejected" in stage_rej.detail


# ============================================================================
# 4. Job Deletion Request Title Validation
# ============================================================================

def test_job_delete_request_schema():
    req = JobDeleteRequest(confirm_title="Senior AI Engineer")
    assert req.confirm_title == "Senior AI Engineer"

    # Test mismatch checking logic
    job_title = "Senior AI Engineer"
    assert req.confirm_title.strip() == job_title
    
    wrong_req = JobDeleteRequest(confirm_title="Wrong Title")
    assert wrong_req.confirm_title.strip() != job_title
