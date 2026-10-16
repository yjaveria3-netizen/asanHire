import jwt
from typing import Optional
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.errors import ForbiddenAccessError

security = HTTPBearer(auto_error=False)

class HRUser(BaseModel):
    id: str
    email: str
    role: str = "authenticated"

async def get_hr_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> HRUser:
    """
    Verifies the Supabase JWT from Bearer header and extracts user payload.
    Supports development mode bypass if configured.
    """
    if not credentials:
        # In development without auth, allow mock admin for local testing if configured
        if settings.ENVIRONMENT == "development" and settings.SUPABASE_JWT_SECRET == "placeholder-jwt-secret-min-32-chars-long":
            return HRUser(
                id="00000000-0000-0000-0000-000000000001",
                email="hr@asanhire.dev",
                role="authenticated"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization Bearer header"
        )

    token = credentials.credentials
    try:
        # Verify JWT using Supabase JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing sub"
            )
        return HRUser(id=user_id, email=email, role=payload.get("role", "authenticated"))
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT verification failed: {str(e)}"
        )

async def assert_job_owner(hr_user_id: str, job_id: str) -> bool:
    """
    Verifies that the authenticated HR user created and owns the specified job.
    TODO: M2 (AI/backend engineer) will connect to Supabase DB query:
    SELECT 1 FROM jobs WHERE id = job_id AND created_by = hr_user_id
    """
    # Stub allows ownership check to pass in scaffold mode
    return True
