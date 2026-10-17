import time
import hashlib
import logging
from typing import Optional, Dict, Tuple
import httpx
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.security")

# HTTP Bearer scheme without auto error so we can return generic 401
security_scheme = HTTPBearer(auto_error=False)

class HRUser(BaseModel):
    id: str
    email: str
    role: str = "hr"
    must_change_password: bool = False

class AdminUser(BaseModel):
    id: str
    email: str
    role: str = "admin"
    must_change_password: bool = False

# In-memory auth cache: sha256(token) -> (HRUser | AdminUser, expires_at_timestamp)
_auth_cache: Dict[str, Tuple[Any, float]] = {}
_MAX_CACHE_ENTRIES = 1000

def _prune_auth_cache(now: float) -> None:
    """Removes expired entries and caps cache size."""
    global _auth_cache
    _auth_cache = {k: v for k, v in _auth_cache.items() if v[1] > now}
    if len(_auth_cache) > _MAX_CACHE_ENTRIES:
        # Evict oldest items if still over capacity
        sorted_keys = sorted(_auth_cache.keys(), key=lambda k: _auth_cache[k][1])
        excess = len(_auth_cache) - _MAX_CACHE_ENTRIES
        for k in sorted_keys[:excess]:
            _auth_cache.pop(k, None)

async def _verify_token_with_supabase(raw_token: str) -> Dict[str, Any]:
    supabase_auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": f"Bearer {raw_token}"
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(supabase_auth_url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unauthorized"
                )
            data = resp.json()
            if not data.get("id"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unauthorized"
                )
            return data
    except httpx.HTTPError as e:
        logger.error(f"Supabase auth verification failed with network error: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

async def get_hr_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> HRUser:
    """
    FastAPI dependency for HR authentication.
    - Reads Authorization: Bearer <token>.
    - Verifies token via Supabase Auth API.
    - Caches successful verification in memory for 30s.
    - Syncs contact_email to hr_profiles.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    raw_token = credentials.credentials.strip()
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = time.time()

    if token_hash in _auth_cache:
        cached_user, expires_at = _auth_cache[token_hash]
        if now < expires_at and isinstance(cached_user, HRUser):
            return cached_user
        else:
            _auth_cache.pop(token_hash, None)

    data = await _verify_token_with_supabase(raw_token)
    user_id = str(data["id"])
    email = data.get("email", "")

    # Sync contact_email in hr_profiles (Part G1 / F5 requirement)
    try:
        db = get_supabase_service_client()
        db.table("hr_profiles").upsert({
            "id": user_id,
            "contact_email": email,
        }, on_conflict="id").execute()
    except Exception:
        pass

    hr_user = HRUser(id=user_id, email=email, role="hr")
    _prune_auth_cache(now)
    _auth_cache[token_hash] = (hr_user, now + 30.0)
    return hr_user

async def get_admin_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AdminUser:
    """
    FastAPI dependency for Admin authentication.
    - Requires authenticated user with role = 'admin' in user_roles.
    - If must_change_password == True, blocks all /admin routes with 403
      except /me and /admin/change-password.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    raw_token = credentials.credentials.strip()
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    data = await _verify_token_with_supabase(raw_token)
    user_id = str(data["id"])
    email = data.get("email", "")

    # Query role from user_roles
    db = get_supabase_service_client()
    role_res = db.table("user_roles").select("*").eq("user_id", user_id).execute()
    role_data = role_res.data[0] if (role_res and role_res.data) else {}

    user_role = role_data.get("role", "")
    must_change = bool(role_data.get("must_change_password", False))

    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required",
        )

    # If must_change_password is true, allow ONLY change-password and me routes
    path = request.url.path.rstrip("/")
    allowed_unlocked_paths = {
        "/admin/change-password",
        "/api/admin/change-password",
        "/me",
        "/api/me",
    }
    if must_change and path not in allowed_unlocked_paths:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
        )

    return AdminUser(
        id=user_id,
        email=email,
        role="admin",
        must_change_password=must_change,
    )

async def get_current_user_profile(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Dict[str, Any]:
    """
    Returns user profile for GET /me.
    Works for both HR and Admin users, syncing hr_profiles if HR.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    raw_token = credentials.credentials.strip()
    data = await _verify_token_with_supabase(raw_token)
    user_id = str(data["id"])
    email = data.get("email", "")

    db = get_supabase_service_client()
    role_res = db.table("user_roles").select("*").eq("user_id", user_id).execute()
    role_row = role_res.data[0] if (role_res and role_res.data) else {}

    role = role_row.get("role", "hr")
    must_change = bool(role_row.get("must_change_password", False))

    # HR Profile lookup / sync
    hr_profile_data: Dict[str, Any] = {
        "contact_email": email,
        "organization": "",
        "full_name": "",
        "job_title": "",
        "reply_to_enabled": True,
        "status": "active",
    }
    try:
        p_res = db.table("hr_profiles").select("*").eq("id", user_id).execute()
        if p_res and p_res.data:
            existing = p_res.data[0]
            hr_profile_data.update(existing)
            # Sync contact_email if different
            if existing.get("contact_email") != email:
                db.table("hr_profiles").update({"contact_email": email}).eq("id", user_id).execute()
                hr_profile_data["contact_email"] = email
        else:
            db.table("hr_profiles").insert({
                "id": user_id,
                "contact_email": email,
                "status": "active",
            }).execute()
    except Exception:
        pass

    return {
        "id": user_id,
        "email": email,
        "role": role,
        "must_change_password": must_change,
        "hr_profile": hr_profile_data,
    }

async def assert_job_owner(job_id: str, user_id: str) -> dict:
    """
    Verifies that the given user owns the job.
    Returns 404 (not 403) if the job does not exist or user_id != owner_id.
    Returns the job record dict on success.
    """
    try:
        client = get_supabase_service_client()
        res = client.table("jobs").select("*").eq("id", job_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        job_row = res.data[0]
        job_owner = str(job_row.get("owner_id") or job_row.get("created_by") or "")
        if job_owner != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        return job_row
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking job ownership: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

async def assert_candidate_owner(candidate_id: str, user_id: str) -> bool:
    """
    Verifies that the candidate belongs to a job owned by user_id.
    Returns 404 (not 403) if not found or unauthorized.
    """
    try:
        client = get_supabase_service_client()
        cand_res = client.table("candidates").select("id, job_id").eq("id", candidate_id).execute()
        if not cand_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )
        job_id = cand_res.data[0].get("job_id")
        if not job_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )
        return await assert_job_owner(job_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking candidate ownership: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
