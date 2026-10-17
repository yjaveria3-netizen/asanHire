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


def delete_resume_files(file_paths: list[str]) -> tuple[list[str], list[str]]:
    """
    Deletes files from the private 'resumes' bucket in batches.
    Retries once on any failure. Never logs resume text, only paths.
    Returns (succeeded_paths, failed_paths).
    """
    clean_paths = [p.strip() for p in file_paths if p and isinstance(p, str) and p.strip()]
    if not clean_paths:
        return [], []

    client = get_supabase_service_client()
    succeeded: list[str] = []
    failed: list[str] = []

    # First attempt: batch delete
    try:
        client.storage.from_(RESUMES_BUCKET).remove(clean_paths)
        succeeded.extend(clean_paths)
        logger.info(f"Successfully deleted {len(clean_paths)} files from '{RESUMES_BUCKET}'")
        return succeeded, []
    except Exception as e:
        logger.warning(f"Batch storage deletion failed ({type(e).__name__}). Retrying file-by-file...")

    # Second attempt: file-by-file retry
    for p in clean_paths:
        try:
            client.storage.from_(RESUMES_BUCKET).remove([p])
            succeeded.append(p)
        except Exception as retry_err:
            logger.error(f"Permanent failure deleting storage file at path '{p}': {type(retry_err).__name__}")
            failed.append(p)

    return succeeded, failed


def list_all_resume_files() -> list[str]:
    """Lists all file names in the private 'resumes' bucket."""
    client = get_supabase_service_client()
    try:
        res = client.storage.from_(RESUMES_BUCKET).list()
        if isinstance(res, list):
            return [f.get("name") for f in res if isinstance(f, dict) and f.get("name")]
        return []
    except Exception as e:
        logger.error(f"Failed to list files in '{RESUMES_BUCKET}': {type(e).__name__}")
        return []
