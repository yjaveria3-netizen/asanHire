import logging
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from urllib.parse import unquote
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.config import settings
from app.core.db import get_supabase_service_client
from app.core.security import (
    get_admin_user,
    AdminUser,
    get_current_user_profile,
    assert_job_owner,
)
from app.models.schemas import (
    AdminChangePasswordRequest,
    AdminOverviewResponse,
    AdminHRUserItem,
    AdminHRUserDetailResponse,
    AdminCandidateSummaryResponse,
    AdminOverridesListResponse,
    AdminOverrideItem,
    OverrideQuestionItem,
    AdminOverrideReviewRequest,
    AdminOverrideQuestionRequest,
    HRAccessRequestItem,
)
from app.services.email import send_templated_email

logger = logging.getLogger("asanhire.api.admin")

router = APIRouter(
    tags=["Admin Controls & Platform Supervision"],
)

# In-memory rate limiting and lockout for change password
# email -> [timestamps]
_change_pwd_attempts: Dict[str, List[float]] = {}
# email -> lockout_until_timestamp
_lockouts: Dict[str, float] = {}
_MAX_ATTEMPTS_PER_HOUR = 5
_LOCKOUT_DURATION_SECONDS = 900.0  # 15 minutes


def _check_password_rate_limit_and_lockout(email: str) -> None:
    now = time.time()
    clean_email = email.strip().lower()

    # Check lockout
    if clean_email in _lockouts:
        if now < _lockouts[clean_email]:
            remaining = int(_lockouts[clean_email] - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Account locked for {remaining} seconds.",
            )
        else:
            _lockouts.pop(clean_email, None)

    # Prune attempts older than 1 hour
    history = [t for t in _change_pwd_attempts.get(clean_email, []) if now - t < 3600.0]
    _change_pwd_attempts[clean_email] = history

    if len(history) >= _MAX_ATTEMPTS_PER_HOUR:
        _lockouts[clean_email] = now + _LOCKOUT_DURATION_SECONDS
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for password change (max 5 per hour).",
        )


def _record_failed_password_attempt(email: str) -> None:
    clean_email = email.strip().lower()
    now = time.time()
    _change_pwd_attempts.setdefault(clean_email, []).append(now)
    if len(_change_pwd_attempts[clean_email]) >= _MAX_ATTEMPTS_PER_HOUR:
        _lockouts[clean_email] = now + _LOCKOUT_DURATION_SECONDS


def _assert_password_not_locked(user: AdminUser) -> None:
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
        )


def _write_admin_audit_log(
    client,
    admin_id: str,
    action: str,
    target_type: str = "",
    target_id: str = "",
    details: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        client.table("admin_audit_log").insert({
            "admin_id": admin_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
        }).execute()
    except Exception as e:
        logger.error(f"Failed to record admin_audit_log: {type(e).__name__}")


# ============================================================================
# User Profile Endpoint (Mounted for /me and /api/me)
# ============================================================================

@router.get("/me", summary="Get current user identity, role, and profile")
async def get_me(user_data: Dict[str, Any] = Depends(get_current_user_profile)) -> Dict[str, Any]:
    return user_data


# ============================================================================
# G0: Admin Password Change
# ============================================================================

@router.post("/change-password", summary="Change admin password and clear must_change_password")
async def admin_change_password(
    payload: AdminChangePasswordRequest,
    current_user: AdminUser = Depends(get_admin_user),
) -> Dict[str, Any]:
    """
    Verifies current password via Supabase Auth sign-in endpoint,
    validates new password (>=12 chars, different from current, != email),
    updates password via Supabase Admin API, sets must_change_password = false,
    and logs action to admin_audit_log without logging passwords.
    """
    email = current_user.email.strip().lower()
    _check_password_rate_limit_and_lockout(email)

    curr_pwd = payload.current_password
    new_pwd = payload.new_password

    if not curr_pwd or not new_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Current and new password are required",
        )

    if len(new_pwd) < 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 12 characters",
        )

    if new_pwd == curr_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be different from current password",
        )

    if new_pwd.lower() == email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password cannot be equal to your email address",
        )

    supabase_url = settings.SUPABASE_URL.rstrip("/")
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY
    anon_key = settings.SUPABASE_PUBLISHABLE_KEY

    # 1. Verify current password with Supabase password grant
    async with httpx.AsyncClient(timeout=10.0) as client:
        verify_resp = await client.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": anon_key, "Content-Type": "application/json"},
            json={"email": email, "password": curr_pwd},
        )
        if verify_resp.status_code != 200:
            _record_failed_password_attempt(email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed",
            )

        # 2. Update password with Supabase Admin API
        admin_headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        }
        update_resp = await client.put(
            f"{supabase_url}/auth/v1/admin/users/{current_user.id}",
            headers=admin_headers,
            json={"password": new_pwd},
        )
        if update_resp.status_code not in (200, 204):
            logger.error(f"Failed to update admin password: {update_resp.status_code}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password",
            )

    # 3. Update user_roles table: set must_change_password = false
    db = get_supabase_service_client()
    try:
        db.table("user_roles").update({
            "must_change_password": False,
        }).eq("user_id", current_user.id).execute()
    except Exception as e:
        logger.warning(f"Failed to update must_change_password flag: {e}")

    # 4. Write admin_audit_log (zero password data)
    _write_admin_audit_log(
        client=db,
        admin_id=current_user.id,
        action="admin_password_changed",
        target_type="user",
        target_id=current_user.id,
        details={"email_domain": email.split("@")[-1] if "@" in email else ""},
    )

    return {"success": True, "message": "Password changed successfully"}


# ============================================================================
# G3: Admin Data Views
# ============================================================================

@router.get("/overview", response_model=AdminOverviewResponse, summary="Platform overview totals and 14-day trends")
async def get_platform_overview(
    current_user: AdminUser = Depends(get_admin_user),
) -> AdminOverviewResponse:
    _assert_password_not_locked(current_user)
    client = get_supabase_service_client()
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # 1. HR Users count
    hr_users_count = 0
    try:
        hr_res = client.table("user_roles").select("id").eq("role", "hr").execute()
        hr_users_count = len(hr_res.data or [])
        if hr_users_count == 0:
            prof_res = client.table("hr_profiles").select("user_id").execute()
            hr_users_count = len(prof_res.data or [])
    except Exception:
        pass

    # 2. Jobs counts
    jobs_active_count = 0
    jobs_closed_count = 0
    jobs_rows: List[Dict[str, Any]] = []
    try:
        j_res = client.table("jobs").select("id, status, created_at").execute()
        jobs_rows = j_res.data or []
        for j in jobs_rows:
            st = str(j.get("status") or "").lower()
            if st in ("active", "open"):
                jobs_active_count += 1
            elif st == "closed":
                jobs_closed_count += 1
    except Exception:
        pass

    # 3. Candidates & Decisions counts
    candidates_count = 0
    decisions_hired = 0
    decisions_rejected = 0
    decisions_on_hold = 0
    cand_rows: List[Dict[str, Any]] = []
    try:
        c_res = client.table("candidates").select("id, status, created_at").execute()
        cand_rows = c_res.data or []
        candidates_count = len(cand_rows)
        for c in cand_rows:
            st = str(c.get("status") or "").lower()
            if st == "hired":
                decisions_hired += 1
            elif st == "rejected":
                decisions_rejected += 1
            elif st == "on_hold":
                decisions_on_hold += 1
    except Exception:
        pass

    # 4. Interviews completed count
    interviews_completed = 0
    try:
        iv_res = client.table("interviews").select("id").eq("status", "completed").execute()
        interviews_completed = len(iv_res.data or [])
    except Exception:
        pass

    # 5. Overrides this week
    overrides_this_week = 0
    try:
        ov_res = client.table("hr_override_events").select("id, created_at").execute()
        for ov in (ov_res.data or []):
            cat_str = ov.get("created_at")
            if cat_str:
                dt = datetime.fromisoformat(str(cat_str).replace("Z", "+00:00"))
                if dt >= week_ago:
                    overrides_this_week += 1
    except Exception:
        pass

    # 6. Pending HR access requests
    pending_requests = 0
    try:
        req_res = client.table("hr_access_requests").select("id").eq("status", "pending").execute()
        pending_requests = len(req_res.data or [])
    except Exception:
        pass

    # 7. Emails sent today
    emails_today = 0
    try:
        em_res = client.table("email_log").select("id, sent_at").execute()
        for em in (em_res.data or []):
            sat = em.get("sent_at")
            if sat:
                dt = datetime.fromisoformat(str(sat).replace("Z", "+00:00"))
                if dt >= today_start:
                    emails_today += 1
    except Exception:
        pass

    # 8. Trends for last 14 days
    date_keys = [(today_start - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
    app_counts: Dict[str, int] = {k: 0 for k in date_keys}
    job_counts: Dict[str, int] = {k: 0 for k in date_keys}

    for c in cand_rows:
        cat_str = c.get("created_at")
        if cat_str:
            d_key = str(cat_str)[:10]
            if d_key in app_counts:
                app_counts[d_key] += 1

    for j in jobs_rows:
        cat_str = j.get("created_at")
        if cat_str:
            d_key = str(cat_str)[:10]
            if d_key in job_counts:
                job_counts[d_key] += 1

    trends_apps = [{"date": k, "count": app_counts[k]} for k in date_keys]
    trends_jobs = [{"date": k, "count": job_counts[k]} for k in date_keys]

    return AdminOverviewResponse(
        hr_users_count=hr_users_count,
        jobs_active_count=jobs_active_count,
        jobs_closed_count=jobs_closed_count,
        candidates_count=candidates_count,
        interviews_completed_count=interviews_completed,
        decisions_hired_count=decisions_hired,
        decisions_rejected_count=decisions_rejected,
        decisions_on_hold_count=decisions_on_hold,
        overrides_this_week_count=overrides_this_week,
        pending_hr_access_requests_count=pending_requests,
        emails_sent_today_count=emails_today,
        trends_applications_14d=trends_apps,
        trends_jobs_14d=trends_jobs,
    )


@router.get("/hr-users", response_model=List[AdminHRUserItem], summary="List HR users with aggregate metrics")
async def list_hr_users(
    sort_by: str = Query("last_active", enum=["jobs", "candidates", "override_rate", "last_active"]),
    order: str = Query("desc", enum=["asc", "desc"]),
    current_user: AdminUser = Depends(get_admin_user),
) -> List[AdminHRUserItem]:
    _assert_password_not_locked(current_user)
    client = get_supabase_service_client()
    profiles_res = client.table("hr_profiles").select("*").execute()
    profiles = profiles_res.data or []

    # Map jobs to created_by / owner_id
    jobs_res = client.table("jobs").select("id, created_by, owner_id").execute()
    all_jobs = jobs_res.data or []
    jobs_by_user: Dict[str, List[str]] = {}
    for j in all_jobs:
        u_id = str(j.get("owner_id") or j.get("created_by") or "")
        if u_id:
            jobs_by_user.setdefault(u_id, []).append(str(j["id"]))

    # Map candidates and decisions to jobs
    cand_res = client.table("candidates").select("id, job_id, status").execute()
    all_cands = cand_res.data or []
    cands_by_job: Dict[str, List[Dict[str, Any]]] = {}
    for c in all_cands:
        jid = str(c.get("job_id") or "")
        if jid:
            cands_by_job.setdefault(jid, []).append(c)

    # Overrides count by hr_user_id
    ov_res = client.table("hr_override_events").select("id, hr_user_id").execute()
    all_overrides = ov_res.data or []
    overrides_by_user: Dict[str, int] = {}
    for ov in all_overrides:
        uid = str(ov.get("hr_user_id") or "")
        if uid:
            overrides_by_user[uid] = overrides_by_user.get(uid, 0) + 1

    hr_items: List[AdminHRUserItem] = []
    for p in profiles:
        uid = str(p.get("user_id") or p.get("id"))
        user_jobs = jobs_by_user.get(uid, [])
        user_candidates = []
        for jid in user_jobs:
            user_candidates.extend(cands_by_job.get(jid, []))

        decisions_count = sum(
            1 for c in user_candidates if str(c.get("status") or "").lower() in ("hired", "rejected", "on_hold")
        )
        user_overrides = overrides_by_user.get(uid, 0)
        override_rate = (
            round((user_overrides / float(max(1, decisions_count))) * 100.0, 1)
            if decisions_count > 0
            else 0.0
        )

        hr_items.append(
            AdminHRUserItem(
                id=uid,
                email=str(p.get("contact_email") or ""),
                full_name=str(p.get("full_name") or ""),
                organization=str(p.get("organization") or ""),
                contact_email=str(p.get("contact_email") or ""),
                reply_to_enabled=bool(p.get("reply_to_enabled", True)),
                status=str(p.get("status") or "active"),
                jobs_count=len(user_jobs),
                candidates_count=len(user_candidates),
                override_rate=override_rate,
                created_at=p.get("created_at"),
                last_active_at=p.get("last_active_at") or p.get("created_at"),
            )
        )

    # Sort
    reverse = (order == "desc")
    if sort_by == "jobs":
        hr_items.sort(key=lambda x: x.jobs_count, reverse=reverse)
    elif sort_by == "candidates":
        hr_items.sort(key=lambda x: x.candidates_count, reverse=reverse)
    elif sort_by == "override_rate":
        hr_items.sort(key=lambda x: x.override_rate, reverse=reverse)
    else:
        hr_items.sort(key=lambda x: str(x.last_active_at or ""), reverse=reverse)

    return hr_items


@router.get("/hr-users/{hr_user_id}", response_model=AdminHRUserDetailResponse, summary="Get HR user details and jobs (no candidate PII)")
async def get_hr_user_detail(
    hr_user_id: str,
    current_user: AdminUser = Depends(get_admin_user),
) -> AdminHRUserDetailResponse:
    _assert_password_not_locked(current_user)
    client = get_supabase_service_client()
    try:
        p_res = client.table("hr_profiles").select("*").eq("user_id", hr_user_id).execute()
        if not p_res.data:
            p_res = client.table("hr_profiles").select("*").eq("id", hr_user_id).execute()
    except Exception:
        p_res = client.table("hr_profiles").select("*").eq("user_id", hr_user_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR user not found")
    profile = p_res.data[0]

    # Fetch jobs owned by user
    jobs_res = (
        client.table("jobs")
        .select("id, title, department, status, created_at")
        .or_(f"created_by.eq.{hr_user_id},owner_id.eq.{hr_user_id}")
        .execute()
    )
    user_jobs = jobs_res.data or []
    job_ids = [str(j["id"]) for j in user_jobs]

    # Aggregates per job
    cands_by_job: Dict[str, int] = {}
    interviews_by_job: Dict[str, int] = {}
    if job_ids:
        c_res = client.table("candidates").select("id, job_id, status").in_("job_id", job_ids).execute()
        for c in (c_res.data or []):
            jid = str(c.get("job_id"))
            cands_by_job[jid] = cands_by_job.get(jid, 0) + 1

        iv_res = client.table("interviews").select("id, job_id").in_("job_id", job_ids).execute()
        for iv in (iv_res.data or []):
            jid = str(iv.get("job_id"))
            interviews_by_job[jid] = interviews_by_job.get(jid, 0) + 1

    formatted_jobs: List[Dict[str, Any]] = []
    total_candidates = 0
    for j in user_jobs:
        jid = str(j["id"])
        c_count = cands_by_job.get(jid, 0)
        total_candidates += c_count
        formatted_jobs.append({
            "id": jid,
            "title": str(j.get("title") or ""),
            "department": str(j.get("department") or ""),
            "status": str(j.get("status") or "active"),
            "created_at": j.get("created_at"),
            "candidates_count": c_count,
            "interviews_count": interviews_by_job.get(jid, 0),
        })

    # Overrides calculation
    ov_res = client.table("hr_override_events").select("id").eq("hr_user_id", hr_user_id).execute()
    user_overrides = len(ov_res.data or [])

    decisions_count = 0
    if job_ids:
        dec_res = (
            client.table("candidates")
            .select("id")
            .in_("job_id", job_ids)
            .in_("status", ["hired", "rejected", "on_hold"])
            .execute()
        )
        decisions_count = len(dec_res.data or [])

    override_rate = (
        round((user_overrides / float(max(1, decisions_count))) * 100.0, 1)
        if decisions_count > 0
        else 0.0
    )

    return AdminHRUserDetailResponse(
        id=hr_user_id,
        email=str(profile.get("contact_email") or ""),
        full_name=str(profile.get("full_name") or ""),
        organization=str(profile.get("organization") or ""),
        job_title=str(profile.get("job_title") or ""),
        contact_email=str(profile.get("contact_email") or ""),
        reply_to_enabled=bool(profile.get("reply_to_enabled", True)),
        status=str(profile.get("status") or "active"),
        jobs_count=len(user_jobs),
        candidates_count=total_candidates,
        override_rate=override_rate,
        created_at=profile.get("created_at"),
        last_active_at=profile.get("last_active_at") or profile.get("created_at"),
        jobs=formatted_jobs,
    )


@router.get(
    "/hr-requests",
    response_model=List[HRAccessRequestItem],
    summary="List pending and recent HR access requests for admin review",
)
async def list_hr_access_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: AdminUser = Depends(get_admin_user),
) -> List[HRAccessRequestItem]:
    _assert_password_not_locked(admin)
    client = get_supabase_service_client()
    query = client.table("hr_access_requests").select("*")
    if status_filter:
        query = query.eq("status", status_filter.strip().lower())
    res = query.order("created_at", desc=True).limit(100).execute()
    items = []
    for row in (res.data or []):
        items.append(HRAccessRequestItem(
            id=str(row["id"]),
            user_id=row.get("user_id"),
            email=str(row.get("email") or ""),
            full_name=str(row.get("full_name") or ""),
            organization=str(row.get("organization") or ""),
            reason=row.get("reason"),
            status=str(row.get("status") or "pending"),
            created_at=row.get("created_at"),
            reviewed_at=row.get("reviewed_at"),
            reviewed_by=row.get("reviewed_by"),
        ))
    return items


@router.post(
    "/hr-requests/{request_id}/approve",
    summary="Approve HR recruiter access request",
)
async def approve_hr_access_request(
    request_id: str,
    admin: AdminUser = Depends(get_admin_user),
):
    _assert_password_not_locked(admin)
    client = get_supabase_service_client()
    res = client.table("hr_access_requests").select("*").eq("id", request_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    req_data = res.data[0]
    now_utc = datetime.now(timezone.utc).isoformat()
    client.table("hr_access_requests").update({
        "status": "approved",
        "reviewed_at": now_utc,
        "reviewed_by": admin.id,
    }).eq("id", request_id).execute()

    user_id = req_data.get("user_id")
    email = req_data.get("email")
    if user_id:
        client.table("hr_profiles").upsert({
            "id": user_id,
            "status": "active",
            "contact_email": email,
            "full_name": req_data.get("full_name", ""),
            "organization": req_data.get("organization", ""),
        }, on_conflict="id").execute()

    _write_admin_audit_log(
        client,
        admin_id=admin.id,
        action="admin_approved_hr_request",
        target_type="hr_access_request",
        target_id=request_id,
        details={"user_id": user_id, "email": email},
    )

    return {"success": True, "message": "HR recruiter access approved successfully."}


@router.post(
    "/hr-requests/{request_id}/reject",
    summary="Reject HR recruiter access request",
)
async def reject_hr_access_request(
    request_id: str,
    admin: AdminUser = Depends(get_admin_user),
):
    _assert_password_not_locked(admin)
    client = get_supabase_service_client()
    res = client.table("hr_access_requests").select("*").eq("id", request_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    req_data = res.data[0]
    now_utc = datetime.now(timezone.utc).isoformat()
    client.table("hr_access_requests").update({
        "status": "rejected",
        "reviewed_at": now_utc,
        "reviewed_by": admin.id,
    }).eq("id", request_id).execute()

    user_id = req_data.get("user_id")
    if user_id:
        client.table("hr_profiles").update({
            "status": "suspended",
        }).eq("id", user_id).execute()

    _write_admin_audit_log(
        client,
        admin_id=admin.id,
        action="admin_rejected_hr_request",
        target_type="hr_access_request",
        target_id=request_id,
        details={"user_id": user_id, "email": req_data.get("email")},
    )

    return {"success": True, "message": "HR recruiter access rejected."}


@router.get("/candidates/{email_key}", response_model=AdminCandidateSummaryResponse, summary="Candidate cross-job history (no resume/transcripts)")
async def get_candidate_admin_summary(
    email_key: str,
    current_user: AdminUser = Depends(get_admin_user),
) -> AdminCandidateSummaryResponse:
    _assert_password_not_locked(current_user)
    """
    Returns platform-wide application history for candidate email key.
    Data Protection: Strictly NO resume text, scores, transcripts, or proctoring details.
    """
    clean_email = unquote(email_key).strip().lower()
    client = get_supabase_service_client()

    # Check blocked status
    is_blocked = False
    try:
        blk_res = client.table("blocked_emails").select("email").eq("email", clean_email).execute()
        if blk_res and blk_res.data:
            is_blocked = True
    except Exception:
        pass

    # Check candidate portal last sign-in
    portal_last_sign_in = None
    try:
        cp_res = client.table("candidate_portal_profiles").select("last_sign_in_at").eq("email", clean_email).execute()
        if cp_res and cp_res.data:
            portal_last_sign_in = cp_res.data[0].get("last_sign_in_at")
    except Exception:
        pass

    # Fetch candidate rows across all jobs
    c_res = client.table("candidates").select("id, job_id, status, created_at").eq("email", clean_email).execute()
    cands = c_res.data or []

    job_ids = [str(c["job_id"]) for c in cands if c.get("job_id")]
    jobs_map: Dict[str, Dict[str, Any]] = {}
    if job_ids:
        j_res = client.table("jobs").select("id, title, created_by, owner_id").in_("id", job_ids).execute()
        for j in (j_res.data or []):
            jobs_map[str(j["id"])] = j

    # HR Profiles for organizations
    hr_ids = [
        str(j.get("owner_id") or j.get("created_by"))
        for j in jobs_map.values()
        if j.get("owner_id") or j.get("created_by")
    ]
    orgs_map: Dict[str, str] = {}
    if hr_ids:
        try:
            p_res = client.table("hr_profiles").select("user_id, organization").in_("user_id", hr_ids).execute()
            for p in (p_res.data or []):
                uid = str(p.get("user_id") or "")
                if uid:
                    orgs_map[uid] = str(p.get("organization") or "")
        except Exception:
            pass

    # Check completed interviews
    cand_ids = [str(c["id"]) for c in cands]
    completed_interviews_count = 0
    cand_has_interview: set[str] = set()
    if cand_ids:
        iv_res = client.table("interviews").select("candidate_id, status").in_("candidate_id", cand_ids).execute()
        for iv in (iv_res.data or []):
            cid = str(iv.get("candidate_id"))
            if str(iv.get("status") or "").lower() == "completed":
                completed_interviews_count += 1
                cand_has_interview.add(cid)

    app_list: List[Dict[str, Any]] = []
    for c in cands:
        cid = str(c["id"])
        jid = str(c.get("job_id") or "")
        job_info = jobs_map.get(jid, {})
        hr_id = str(job_info.get("owner_id") or job_info.get("created_by") or "")
        org_name = orgs_map.get(hr_id, "asanHire")

        app_list.append({
            "job_title": str(job_info.get("title") or "Position"),
            "organization": org_name,
            "stage": str(c.get("status") or "applied"),
            "applied_date": c.get("created_at"),
            "interview_completed": cid in cand_has_interview,
        })

    return AdminCandidateSummaryResponse(
        email_key=clean_email,
        applications_count=len(cands),
        interviews_completed_count=completed_interviews_count,
        portal_last_sign_in=portal_last_sign_in,
        is_blocked=is_blocked,
        applications=app_list,
    )


# ============================================================================
# G2: Admin Overrides Supervision & Questions
# ============================================================================

@router.get("/overrides", response_model=AdminOverridesListResponse, summary="List all HR overrides with filters and rule-based advisory flags")
async def list_admin_overrides(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    hr_user_id: Optional[str] = None,
    job_id: Optional[str] = None,
    override_type: Optional[str] = None,
    admin_status: Optional[str] = Query(None, enum=["all", "pending", "reviewed", "question_asked", "answered"]),
    search: Optional[str] = None,
    current_user: AdminUser = Depends(get_admin_user),
) -> AdminOverridesListResponse:
    _assert_password_not_locked(current_user)
    client = get_supabase_service_client()
    query = client.table("hr_override_events").select("*")

    if hr_user_id:
        query = query.eq("hr_user_id", hr_user_id)
    if job_id:
        query = query.eq("job_id", job_id)
    if override_type:
        query = query.eq("override_type", override_type)
    if admin_status and admin_status != "all":
        query = query.eq("admin_status", admin_status)

    res = query.order("created_at", desc=True).execute()
    all_rows = res.data or []

    # Client-side search for candidate_name or job_title
    if search and search.strip():
        s_lower = search.strip().lower()
        all_rows = [
            r for r in all_rows
            if s_lower in str(r.get("candidate_name") or "").lower()
            or s_lower in str(r.get("job_title") or "").lower()
        ]

    # Rule-based calculation for "Worth a look"
    # 1. Total decisions and overrides per HR user
    hr_counts_decisions: Dict[str, int] = {}
    hr_counts_overrides: Dict[str, int] = {}
    for r in all_rows:
        uid = str(r.get("hr_user_id") or "")
        hr_counts_overrides[uid] = hr_counts_overrides.get(uid, 0) + 1

    # Fetch decisions count for all relevant HR users
    all_hr_ids = list(hr_counts_overrides.keys())
    if all_hr_ids:
        try:
            j_res = client.table("jobs").select("id, created_by, owner_id").execute()
            hr_job_ids: Dict[str, List[str]] = {}
            for j in (j_res.data or []):
                uid = str(j.get("owner_id") or j.get("created_by") or "")
                hr_job_ids.setdefault(uid, []).append(str(j["id"]))

            for uid in all_hr_ids:
                jids = hr_job_ids.get(uid, [])
                if jids:
                    c_dec = client.table("candidates").select("id").in_("job_id", jids).in_("status", ["hired", "rejected", "on_hold"]).execute()
                    hr_counts_decisions[uid] = len(c_dec.data or [])
        except Exception:
            pass

    # 2. Overrides count per candidate
    cand_override_counts: Dict[str, int] = {}
    for r in all_rows:
        cid = str(r.get("candidate_id") or "")
        if cid and cid != "None":
            cand_override_counts[cid] = cand_override_counts.get(cid, 0) + 1

    total = len(all_rows)
    start_idx = (page - 1) * limit
    page_rows = all_rows[start_idx : start_idx + limit]

    override_ids = [str(r["id"]) for r in page_rows if r.get("id")]
    questions_map: Dict[str, List[OverrideQuestionItem]] = {}
    if override_ids:
        try:
            q_res = client.table("hr_override_questions").select("*").in_("override_id", override_ids).execute()
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

    items: List[AdminOverrideItem] = []
    for r in page_rows:
        oid = str(r["id"])
        uid = str(r.get("hr_user_id") or "")
        cid = str(r.get("candidate_id") or "")

        decisions = hr_counts_decisions.get(uid, 0)
        overrides = hr_counts_overrides.get(uid, 0)
        cand_overrides = cand_override_counts.get(cid, 0)

        worth_a_look = False
        worth_reason = None

        if decisions >= 5 and (overrides / float(max(1, decisions))) > 0.30:
            worth_a_look = True
            worth_reason = f"HR user has {overrides} overrides out of {decisions} decisions (>30%)"
        elif cand_overrides > 2:
            worth_a_look = True
            worth_reason = f"Candidate has been overridden {cand_overrides} times across jobs"

        items.append(
            AdminOverrideItem(
                id=oid,
                hr_user_id=uid,
                hr_organization=str(r.get("hr_organization") or ""),
                job_id=str(r.get("job_id")),
                job_title=str(r.get("job_title") or ""),
                candidate_id=r.get("candidate_id"),
                candidate_name=str(r.get("candidate_name") or ""),
                override_type=str(r.get("override_type") or ""),
                from_value=str(r.get("from_value") or ""),
                to_value=str(r.get("to_value") or ""),
                reason_category=str(r.get("reason_category") or "other"),
                reason=str(r.get("reason") or ""),
                admin_status=str(r.get("admin_status") or "pending"),
                admin_note=r.get("admin_note"),
                created_at=r.get("created_at"),
                worth_a_look=worth_a_look,
                worth_a_look_reason=worth_reason,
                questions=questions_map.get(oid, []),
            )
        )

    return AdminOverridesListResponse(total=total, page=page, limit=limit, overrides=items)


@router.post("/overrides/{override_id}/review", summary="Mark override as reviewed with optional note")
async def review_override(
    override_id: str,
    payload: AdminOverrideReviewRequest,
    current_user: AdminUser = Depends(get_admin_user),
) -> Dict[str, Any]:
    _assert_password_not_locked(current_user)
    clean_note = (payload.admin_note or "").strip()
    if len(clean_note) > 300:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Admin note exceeds 300 chars")

    client = get_supabase_service_client()
    ov_res = client.table("hr_override_events").select("*").eq("id", override_id).execute()
    if not ov_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Override not found")

    client.table("hr_override_events").update({
        "admin_status": "reviewed",
        "admin_note": clean_note or None,
    }).eq("id", override_id).execute()

    _write_admin_audit_log(
        client=client,
        admin_id=current_user.id,
        action="override_reviewed",
        target_type="hr_override_events",
        target_id=override_id,
        details={"note_length": len(clean_note)},
    )

    return {"success": True, "admin_status": "reviewed"}


@router.post("/overrides/{override_id}/question", summary="Ask HR a question about an override")
async def ask_override_question(
    override_id: str,
    payload: AdminOverrideQuestionRequest,
    current_user: AdminUser = Depends(get_admin_user),
) -> Dict[str, Any]:
    _assert_password_not_locked(current_user)
    """
    Records an admin inquiry in hr_override_questions, sets admin_status = 'question_asked',
    and dispatches an email to the HR user's login email.
    """
    clean_q = payload.question.strip()
    if len(clean_q) < 5 or len(clean_q) > 500:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question must be between 5 and 500 characters",
        )

    client = get_supabase_service_client()
    ov_res = client.table("hr_override_events").select("*").eq("id", override_id).execute()
    if not ov_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Override not found")
    ov_data = ov_res.data[0]
    hr_uid = str(ov_data.get("hr_user_id"))

    # Insert into hr_override_questions
    q_ins = client.table("hr_override_questions").insert({
        "override_id": override_id,
        "admin_id": current_user.id,
        "question": clean_q,
    }).execute()
    question_row = q_ins.data[0] if (q_ins and q_ins.data) else {}

    # Update override event admin_status
    client.table("hr_override_events").update({
        "admin_status": "question_asked",
    }).eq("id", override_id).execute()

    # Dispatch email notification to HR user's login email
    try:
        prof_res = client.table("hr_profiles").select("contact_email, full_name").eq("user_id", hr_uid).execute()
        if prof_res and prof_res.data:
            hr_email = prof_res.data[0].get("contact_email")
            if hr_email and "@" in hr_email:
                await send_templated_email(
                    recipient_email=hr_email,
                    template_type="on_hold",  # Transactional inquiry wrapper
                    context={
                        "candidate_name": str(ov_data.get("candidate_name") or "Candidate"),
                        "job_title": str(ov_data.get("job_title") or "Requisition"),
                        "notes": f"Admin Question regarding your override: {clean_q}",
                    },
                    sent_by=f"admin:{current_user.id}",
                )
    except Exception as e:
        logger.warning(f"Failed to deliver admin question email to HR: {e}")

    _write_admin_audit_log(
        client=client,
        admin_id=current_user.id,
        action="override_question_asked",
        target_type="hr_override_events",
        target_id=override_id,
        details={"question_length": len(clean_q)},
    )

    return {
        "success": True,
        "admin_status": "question_asked",
        "question_id": question_row.get("id"),
    }
