import re
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from email_validator import validate_email, EmailNotValidError

from app.core.rate_limit import rate_limit_public
from app.core.db import get_supabase_service_client
from app.models.schemas import JobPublicResponse, ApplicationSubmitResponse, RegisterRoleRequest
from app.services.pdf import validate_pdf, extract_text, sanitize_text
from app.services.storage import upload_resume
from app.agents.matcher import run_matcher_for_candidate, detect_prompt_injection

logger = logging.getLogger("asanhire.api.public")

router = APIRouter(tags=["Public Candidate Flow"])

_CTRL_RE = re.compile(r"[\x00-\x1f\x7f-\x9f]")


def _parse_iso_datetime(dt_val: object) -> datetime:
    if isinstance(dt_val, datetime):
        return dt_val if dt_val.tzinfo is not None else dt_val.replace(tzinfo=timezone.utc)
    s = str(dt_val).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


@router.get(
    "/jobs/{job_id}",
    response_model=JobPublicResponse,
    dependencies=[Depends(rate_limit_public)],
    summary="Get public job details",
)
async def get_public_job(job_id: str) -> JobPublicResponse:
    """
    Returns public job details ONLY if status is 'open'.
    Never returns rubric, owner_id, top_n, min_score, or any internal field.
    """
    try:
        client = get_supabase_service_client()
        res = (
            client.table("jobs")
            .select("id, title, description, skills, deadline, status")
            .eq("id", job_id)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    row = res.data[0]
    if row.get("status") in {"deleting", "deleted"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if row.get("status") != "open":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_status = str(row["status"])
    deadline_dt = _parse_iso_datetime(row["deadline"])
    if deadline_dt <= datetime.now(timezone.utc):
        job_status = "closed"

    return JobPublicResponse(
        id=str(row["id"]),
        title=row.get("title", ""),
        description=row.get("description", ""),
        skills=row.get("skills") or [],
        deadline=row["deadline"],
        status=job_status,
    )


async def _handle_application_submission(
    job_id: str,
    name: str,
    email: str,
    consent: bool,
    resume: UploadFile,
) -> ApplicationSubmitResponse:
    # 1. Verify consent
    if consent is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent is required to submit an application",
        )

    # 2. Validate name (1-120 chars, no control chars)
    if not isinstance(name, str) or _CTRL_RE.search(name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application details",
        )
    clean_name = name.strip()
    if len(clean_name) < 1 or len(clean_name) > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application details",
        )

    # 3. Validate and normalize email (lowercase)
    if not isinstance(email, str) or _CTRL_RE.search(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application details",
        )
    try:
        validated_email = validate_email(email.strip(), check_deliverability=False)
        lower_email = validated_email.normalized.lower()
    except EmailNotValidError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application details",
        )

    # 4. Validate job exists, status is 'open', and deadline has not passed
    client = get_supabase_service_client()
    try:
        job_res = (
            client.table("jobs")
            .select("id, status, deadline, rubric, min_score")
            .eq("id", job_id)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is not accepting applications",
        )

    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is not accepting applications",
        )

    job_row = job_res.data[0]
    if job_row.get("status") in {"deleting", "deleted"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    if job_row.get("status") != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is not accepting applications (applications are closed for this position)",
        )

    deadline_dt = _parse_iso_datetime(job_row["deadline"])
    now_utc = datetime.now(timezone.utc)
    if deadline_dt <= now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is not accepting applications (applications are closed for this position)",
        )

    # 5. Reject duplicate applications (job_id + lower(email)) with a generic message
    dup_res = (
        client.table("candidates")
        .select("id")
        .eq("job_id", job_id)
        .ilike("email", lower_email)
        .execute()
    )
    if dup_res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to process application",
        )

    # 6. Validate PDF, extract text, and sanitize text
    pdf_bytes = validate_pdf(resume)
    raw_text = extract_text(pdf_bytes)
    clean_text = sanitize_text(raw_text)

    # 7. Upload PDF to private 'resumes' bucket under random UUID filename
    storage_path = upload_resume(pdf_bytes)

    # 8. Insert candidate with status='applied' and consent_at=now
    cand_payload = {
        "job_id": job_id,
        "name": clean_name,
        "email": lower_email,
        "resume_path": storage_path,
        "resume_text": clean_text,
        "status": "applied",
        "consent_at": now_utc.isoformat(),
        "injection_suspected": detect_prompt_injection(clean_text),
    }
    cand_res = client.table("candidates").insert(cand_payload).execute()
    if not cand_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong",
        )

    candidate_id = str(cand_res.data[0]["id"])

    # 9. Run Matcher Agent (keeps candidate with ai_score=None if LLM fails)
    rubric = job_row.get("rubric")
    if isinstance(rubric, dict) and rubric:
        await run_matcher_for_candidate(
            candidate_id=candidate_id,
            job_id=job_id,
            rubric=rubric,
            resume_text=clean_text,
            min_score=float(job_row.get("min_score", 60)),
        )

    # 10. Return ONLY candidate_id and status='received'
    return ApplicationSubmitResponse(candidate_id=candidate_id, status="received")


@router.post(
    "/apply",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_public)],
    summary="Submit application and upload PDF resume",
)
async def apply_to_job(
    job_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    consent: bool = Form(False),
    resume: UploadFile = File(...),
) -> ApplicationSubmitResponse:
    """Public candidate application endpoint."""
    return await _handle_application_submission(
        job_id=job_id,
        name=name,
        email=email,
        consent=consent,
        resume=resume,
    )


@router.post(
    "/jobs/{job_id}/apply",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_public)],
    summary="Submit application by path job_id",
)
async def submit_application(
    job_id: str,
    name: Optional[str] = Form(None),
    full_name: Optional[str] = Form(None),
    email: str = Form(...),
    consent: bool = Form(True),
    resume: UploadFile = File(...),
) -> ApplicationSubmitResponse:
    """Compatibility route for /jobs/{job_id}/apply."""
    resolved_name = name if name is not None else (full_name or "")
    return await _handle_application_submission(
        job_id=job_id,
        name=resolved_name,
        email=email,
        consent=consent,
        resume=resume,
    )


@router.post(
    "/register-role",
    summary="Register user role intent (HR pending gate or Candidate)",
)
async def register_role(req: RegisterRoleRequest):
    """
    Called upon user registration to enforce role separation:
    - If HR: sets user_roles.role = 'hr', creates hr_profiles with status = 'pending',
      and creates a pending row in hr_access_requests for admin review.
    - If Candidate: sets user_roles.role = 'candidate', creates candidate_portal_profiles.
    """
    db = get_supabase_service_client()
    clean_email = req.email.strip().lower()
    clean_name = (req.full_name or "").strip()
    clean_org = (req.organization or "").strip()
    role_type = req.role.strip().lower()

    if role_type == "hr":
        # 1. user_roles: HR (pending until approved)
        try:
            db.table("user_roles").upsert({
                "user_id": req.user_id,
                "role": "hr",
                "status": "pending",
                "must_change_password": False,
            }, on_conflict="user_id").execute()
        except Exception as e:
            logger.warning(f"Error upserting user_roles: {e}")

        # 2. hr_profiles: user_id is the key, full_name and job_title are required
        try:
            db.table("hr_profiles").upsert({
                "user_id": req.user_id,
                "contact_email": clean_email,
                "full_name": clean_name or "HR Recruiter",
                "organization": clean_org or "Independent",
                "job_title": "Recruiter",
                "reply_to_enabled": True,
            }, on_conflict="user_id").execute()
        except Exception as e:
            logger.warning(f"Error upserting hr_profiles: {e}")

        # 3. hr_access_requests: record request for admin portal approval
        try:
            db.table("hr_access_requests").insert({
                "user_id": req.user_id,
                "full_name": clean_name or "HR Recruiter",
                "organization": clean_org or "Independent",
                "job_title": "Recruiter",
                "reason": req.reason or "HR Recruiter Portal Registration",
                "status": "pending",
            }).execute()
        except Exception as e:
            logger.warning(f"Error inserting hr_access_requests: {e}")

        return {
            "role": "hr",
            "status": "pending",
            "message": "HR account created. Awaiting administrator approval before access is granted. Please email yjaveria3@gmail.com.",
        }

    else:
        # Candidate registration
        try:
            db.table("user_roles").upsert({
                "user_id": req.user_id,
                "role": "candidate",
                "must_change_password": False,
            }, on_conflict="user_id").execute()
        except Exception as e:
            logger.warning(f"Error upserting candidate user_roles: {e}")

        try:
            db.table("candidate_portal_profiles").upsert({
                "id": req.user_id,
                "email": clean_email,
                "full_name": clean_name,
            }, on_conflict="id").execute()
        except Exception as e:
            logger.warning(f"Error upserting candidate_portal_profiles: {e}")

        return {
            "role": "candidate",
            "status": "active",
            "message": "Candidate registered successfully.",
        }
