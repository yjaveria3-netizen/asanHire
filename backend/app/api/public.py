from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from app.core.rate_limit import rate_limit_public
from app.models.schemas import JobPublicResponse, ApplicationSubmitResponse

router = APIRouter(prefix="/api/public", tags=["Public Candidate Flow"])

# OWNER: M1 (frontend) & M2 (backend)
# TODO M2: Implement DB fetch from jobs table where status = 'active'
@router.get(
    "/jobs/{job_id}",
    response_model=JobPublicResponse,
    dependencies=[Depends(rate_limit_public)],
    summary="Get public job details"
)
async def get_public_job(job_id: str):
    """Returns job details for candidate view."""
    # Stub: Unbuilt logic returns 501 Not Implemented
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TODO M2: Connect to Supabase jobs table where status='active'"
    )

# OWNER: M1 (frontend) & M2 (backend)
# TODO M2: Validate PDF magic bytes (%PDF-), 5MB size limit, save to Supabase Storage, invoke Matcher Agent
@router.post(
    "/jobs/{job_id}/apply",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_public)],
    summary="Submit application and upload PDF resume"
)
async def submit_application(
    job_id: str,
    full_name: str = Form(..., min_length=2, max_length=100),
    email: str = Form(...),
    phone: str = Form(None),
    resume: UploadFile = File(...)
):
    """Receives resume PDF, parses text, triggers Matcher Agent, and saves candidate."""
    # Stub: Unbuilt logic returns 501 Not Implemented
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TODO M2: Validate PDF, store in private bucket, and trigger Resume Matcher"
    )
