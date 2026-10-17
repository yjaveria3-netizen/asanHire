import re
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from email_validator import validate_email, EmailNotValidError

from app.core.rate_limit import rate_limit_public
from app.core.db import get_supabase_service_client
from app.models.schemas import (
    JobPublicResponse,
    ApplicationSubmitResponse,
    RegisterRoleRequest,
    CandidateApplicationItem,
)
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


def _parse_job_department(row: Dict[str, Any]) -> str:
    desc = row.get("description", "")
    department = row.get("department")
    if not department and desc.startswith("Department:"):
        first_line = desc.split("\n", 1)[0]
        department = first_line.replace("Department:", "").strip()
    return department or "General"


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
            .select("id, title, description, skills, deadline, status, created_at, experience_level")
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
        department=_parse_job_department(row),
        skills=row.get("skills") or [],
        experience_level=row.get("experience_level"),
        deadline=row["deadline"],
        status=job_status,
        created_at=row.get("created_at"),
    )


@router.get(
    "/jobs",
    response_model=list[JobPublicResponse],
    dependencies=[Depends(rate_limit_public)],
    summary="List active public jobs",
)
async def list_public_jobs(search: Optional[str] = None) -> list[JobPublicResponse]:
    """
    Returns list of open public jobs. Never exposes internal rubric, owner_id, or scoring criteria.
    """
    try:
        client = get_supabase_service_client()
        query = (
            client.table("jobs")
            .select("id, title, description, skills, deadline, status, created_at, experience_level")
            .eq("status", "open")
            .order("created_at", desc=True)
        )
        res = query.execute()
        jobs: list[JobPublicResponse] = []
        now = datetime.now(timezone.utc)
        for row in res.data or []:
            try:
                deadline_dt = _parse_iso_datetime(row["deadline"])
                job_status = "closed" if deadline_dt <= now else str(row.get("status", "open"))
            except Exception:
                job_status = str(row.get("status", "open"))

            if job_status == "closed":
                continue

            dept = _parse_job_department(row)

            if search:
                s_lower = search.strip().lower()
                title_match = s_lower in (row.get("title") or "").lower()
                desc_match = s_lower in (row.get("description") or "").lower()
                dept_match = s_lower in dept.lower()
                skills_match = any(s_lower in str(k).lower() for k in (row.get("skills") or []))
                if not (title_match or desc_match or dept_match or skills_match):
                    continue

            jobs.append(
                JobPublicResponse(
                    id=str(row["id"]),
                    title=row.get("title", ""),
                    description=row.get("description", ""),
                    department=dept,
                    skills=row.get("skills") or [],
                    experience_level=row.get("experience_level"),
                    deadline=row["deadline"],
                    status=job_status,
                    created_at=row.get("created_at"),
                )
            )
        return jobs
    except Exception as e:
        logger.warning(f"Error fetching public jobs: {e}")
        return []



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


@router.get(
    "/candidate/active-interview",
    summary="Get active interview invitation for candidate by email",
)
async def get_candidate_active_interview(email: str):
    """
    Looks up any active, pending interview invitation for a candidate's email address.
    Enables candidates to launch their technical screening directly from the portal
    even if transactional emails are delayed by third-party mail providers.
    """
    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        return {"has_interview": False}

    try:
        db = get_supabase_service_client()
        # Find candidate applications with status = 'invited'
        c_res = (
            db.table("candidates")
            .select("id, job_id, name, email, status")
            .eq("email", clean_email)
            .eq("status", "invited")
            .order("created_at", desc=True)
            .execute()
        )
        candidates = c_res.data if (c_res and c_res.data) else []
        if not candidates:
            return {"has_interview": False}

        cand = candidates[0]
        cand_id = cand["id"]
        job_id = cand["job_id"]

        # Fetch pending interview for candidate
        int_res = (
            db.table("interviews")
            .select("id, status, expires_at, created_at")
            .eq("candidate_id", cand_id)
            .in_("status", ["pending", "in_progress"])
            .eq("voided", False)
            .order("created_at", desc=True)
            .execute()
        )
        interviews = int_res.data if (int_res and int_res.data) else []
        if not interviews:
            # Auto-provision active interview row for invited candidate if missing
            import secrets, hashlib
            token = secrets.token_urlsafe(32)
            thash = hashlib.sha256(token.encode("utf-8")).hexdigest()
            now_utc = datetime.now(timezone.utc)
            exp_iso = (now_utc + timedelta(hours=48)).isoformat()
            ins = db.table("interviews").insert({
                "candidate_id": cand_id,
                "token_hash": thash,
                "expires_at": exp_iso,
                "status": "pending",
                "voided": False,
                "trust_score": 100,
            }).execute()
            interviews = ins.data or []

        if not interviews:
            return {"has_interview": False}

        interview = interviews[0]
        # Fetch job title
        job_res = db.table("jobs").select("title, description").eq("id", job_id).execute()
        job_data = job_res.data[0] if (job_res and job_res.data) else {}

        return {
            "has_interview": True,
            "interview_id": str(interview["id"]),
            "candidate_name": cand.get("name"),
            "job_title": job_data.get("title", "Technical Role"),
            "department": _parse_job_department(job_data),
            "expires_at": interview.get("expires_at"),
            "interview_url": f"/interview/{interview['id']}",
        }
    except Exception as e:
        logger.warning(f"Error checking candidate active interview: {e}")
        return {"has_interview": False}


@router.get(
    "/candidate/applications",
    response_model=List[CandidateApplicationItem],
    dependencies=[Depends(rate_limit_public)],
    summary="List all applications submitted by candidate",
)
async def list_candidate_applications(email: str) -> List[CandidateApplicationItem]:
    """
    Returns all submitted job applications for a candidate's email address,
    including real-time status (applied, shortlisted, invited, interviewing, interviewed, hired, rejected)
    and direct interview links if invited.
    """
    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        return []

    try:
        db = get_supabase_service_client()
        # 1. Fetch candidate application records
        c_res = (
            db.table("candidates")
            .select("id, job_id, name, email, status, created_at")
            .eq("email", clean_email)
            .order("created_at", desc=True)
            .execute()
        )
        candidates_data = c_res.data or []
        if not candidates_data:
            return []

        # 2. Fetch corresponding job titles and departments
        job_ids = list({str(c["job_id"]) for c in candidates_data if c.get("job_id")})
        jobs_map: Dict[str, Dict[str, Any]] = {}
        if job_ids:
            try:
                j_res = db.table("jobs").select("id, title, description").in_("id", job_ids).execute()
                for j in (j_res.data or []):
                    jobs_map[str(j["id"])] = {
                        "title": j.get("title", "Technical Position"),
                        "department": _parse_job_department(j),
                    }
            except Exception as e:
                logger.warning(f"Failed to fetch job titles for candidate applications: {e}")

        # 3. Fetch any active interviews
        cand_ids = [str(c["id"]) for c in candidates_data]
        interviews_map: Dict[str, Dict[str, Any]] = {}
        if cand_ids:
            try:
                int_res = (
                    db.table("interviews")
                    .select("id, candidate_id, status, expires_at")
                    .in_("candidate_id", cand_ids)
                    .eq("voided", False)
                    .order("created_at", desc=True)
                    .execute()
                )
                for item in (int_res.data or []):
                    cid = str(item["candidate_id"])
                    if cid not in interviews_map:
                        interviews_map[cid] = item
            except Exception as e:
                logger.warning(f"Failed to fetch interviews for candidate applications: {e}")

        # 4. Construct items
        items: List[CandidateApplicationItem] = []
        for c in candidates_data:
            cid = str(c["id"])
            jid = str(c.get("job_id", ""))
            job_info = jobs_map.get(jid, {"title": "Engineering Role", "department": "General"})
            interview_info = interviews_map.get(cid)

            items.append(
                CandidateApplicationItem(
                    id=cid,
                    job_id=jid,
                    job_title=job_info["title"],
                    department=job_info["department"],
                    status=str(c.get("status") or "applied"),
                    applied_at=c.get("created_at"),
                    interview_id=str(interview_info["id"]) if interview_info else None,
                    interview_url=f"/interview/{interview_info['id']}" if interview_info else None,
                    interview_status=interview_info.get("status") if interview_info else None,
                    interview_expires_at=interview_info.get("expires_at") if interview_info else None,
                )
            )
        return items
    except Exception as e:
        logger.error(f"Error listing candidate applications: {e}")
        return []


