import uuid
import logging
from app.core.config import settings

logger = logging.getLogger("asanhire.storage")

async def upload_resume_file(file_bytes: bytes, original_filename: str) -> str:
    """
    Uploads resume to private Supabase Storage bucket 'resumes'.
    Returns public/internal storage URL.
    TODO: M2 (AI/backend engineer) will connect to supabase.storage.from_('resumes').upload(...)
    """
    file_id = str(uuid.uuid4())
    simulated_url = f"https://storage.asanhire.dev/resumes/{file_id}_{original_filename}"
    logger.info(f"Uploaded resume to storage: {simulated_url}")
    return simulated_url

async def get_signed_resume_url(file_path: str, expiry_seconds: int = 3600) -> str:
    """
    Generates a secure, expiring signed URL for HR preview.
    TODO: M2 (AI/backend engineer) will call supabase.storage.from_('resumes').create_signed_url(...)
    """
    return f"{file_path}?token=signed_preview_token_sample"
