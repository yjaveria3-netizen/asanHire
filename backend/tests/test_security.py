import pytest
import jwt
from fastapi import HTTPException
from app.core.config import settings
from app.core.security import get_hr_user, HRUser, assert_job_owner
from app.services.pdf import validate_pdf_bytes
from app.core.errors import InvalidFileUploadError

@pytest.mark.asyncio
async def test_get_hr_user_dev_fallback():
    # In development mode with default secret, should return mock HR user if no credentials
    user = await get_hr_user(credentials=None)
    assert isinstance(user, HRUser)
    assert user.role == "authenticated"

def test_pdf_magic_bytes_valid():
    valid_pdf_stream = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj"
    assert validate_pdf_bytes(valid_pdf_stream) is True

def test_pdf_magic_bytes_invalid():
    invalid_stream = b"<html><body>Not a PDF</body></html>"
    with pytest.raises(InvalidFileUploadError):
        validate_pdf_bytes(invalid_stream)

def test_pdf_size_limit_exceeded():
    large_stream = b"%PDF-" + b"0" * (settings.MAX_UPLOAD_SIZE_BYTES + 10)
    with pytest.raises(InvalidFileUploadError):
        validate_pdf_bytes(large_stream)

@pytest.mark.asyncio
async def test_assert_job_owner_stub():
    is_owner = await assert_job_owner("00000000-0000-0000-0000-000000000001", "11111111-1111-1111-1111-111111111111")
    assert is_owner is True
