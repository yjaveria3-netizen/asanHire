import uuid
import logging
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.storage")

RESUMES_BUCKET = "resumes"


def upload_resume(pdf_bytes: bytes) -> str:
    """
    Uploads PDF bytes to the private 'resumes' bucket under a random UUID filename
    (uuid4 + '.pdf'), never using the user's filename.
    Uses the service role client and returns only the storage path.
    """
    storage_path = f"{uuid.uuid4()}.pdf"
    client = get_supabase_service_client()
    client.storage.from_(RESUMES_BUCKET).upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )
    logger.info(f"Uploaded resume to private bucket '{RESUMES_BUCKET}' at path '{storage_path}'")
    return storage_path


async def upload_resume_file(file_bytes: bytes, original_filename: str = "") -> str:
    """Async compatibility wrapper around upload_resume (ignores original_filename)."""
    return upload_resume(file_bytes)


async def get_signed_resume_url(file_path: str, expiry_seconds: int = 3600) -> str:
    """Generates a short-lived signed URL for HR preview using the service role client."""
    client = get_supabase_service_client()
    res = client.storage.from_(RESUMES_BUCKET).create_signed_url(file_path, expiry_seconds)
    if isinstance(res, dict):
        return res.get("signedURL") or res.get("signedUrl") or ""
    return ""
