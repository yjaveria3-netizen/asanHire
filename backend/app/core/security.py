import time
import hashlib
import logging
from typing import Optional, Dict, Tuple
import httpx
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.security")

# HTTP Bearer scheme without auto error so we can return generic 401
security_scheme = HTTPBearer(auto_error=False)

class HRUser(BaseModel):
    id: str
    email: str
    role: str = "authenticated"

# In-memory auth cache: sha256(token) -> (HRUser, expires_at_timestamp)
_auth_cache: Dict[str, Tuple[HRUser, float]] = {}
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

async def get_hr_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> HRUser:
    """
    FastAPI dependency for HR authentication.
    - Reads Authorization: Bearer <token>.
    - Verifies token via GET {SUPABASE_URL}/auth/v1/user with apikey header.
    - Caches successful verification in memory for 30s keyed by SHA-256 of token.
    - Returns generic 401 on missing, malformed, or failed verification.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    raw_token = credentials.credentials.strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    # Keyed by SHA-256 hash (never raw token)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = time.time()

    # Check in-memory cache
    if token_hash in _auth_cache:
        user, expires_at = _auth_cache[token_hash]
        if now < expires_at:
            return user
        else:
            _auth_cache.pop(token_hash, None)

    # Verify against Supabase Auth API
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
            user_id = data.get("id")
            email = data.get("email", "")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unauthorized"
                )
            
            hr_user = HRUser(id=str(user_id), email=email)
            
            # Cache for 30 seconds
            _prune_auth_cache(now)
            _auth_cache[token_hash] = (hr_user, now + 30.0)
            return hr_user

    except httpx.HTTPError as e:
        logger.error(f"Supabase auth verification failed with network error: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

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
