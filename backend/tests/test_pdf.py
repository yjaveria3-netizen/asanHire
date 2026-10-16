import io
import os
import pytest
from starlette.datastructures import UploadFile, Headers
from app.services.pdf import (
    validate_pdf,
    extract_text,
    sanitize_text,
    redact_contact_info,
)
from app.core.errors import InvalidFileUploadError
from scripts.generate_fixtures import build_pdf_bytes, generate_all_fixtures, STRONG_RESUME_LINES


def _make_upload(filename: str, content_type: str, data: bytes) -> UploadFile:
    return UploadFile(
        file=io.BytesIO(data),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def test_rejects_non_pdf_extension():
    valid_bytes = build_pdf_bytes(STRONG_RESUME_LINES)
    upload = _make_upload("resume.docx", "application/pdf", valid_bytes)
    with pytest.raises(InvalidFileUploadError, match="Invalid file"):
        validate_pdf(upload)


def test_rejects_wrong_content_type():
    valid_bytes = build_pdf_bytes(STRONG_RESUME_LINES)
    upload = _make_upload("resume.pdf", "text/plain", valid_bytes)
    with pytest.raises(InvalidFileUploadError, match="Invalid file"):
        validate_pdf(upload)


def test_rejects_wrong_magic_bytes():
    fake_bytes = b"NOT_A_PDF_HEADER" + b"x" * 500
    upload = _make_upload("resume.pdf", "application/pdf", fake_bytes)
    with pytest.raises(InvalidFileUploadError, match="Invalid file"):
        validate_pdf(upload)


def test_rejects_oversized_file():
    oversized = b"%PDF-1.4\n" + (b"0" * (5 * 1024 * 1024 + 1024))
    upload = _make_upload("resume.pdf", "application/pdf", oversized)
    with pytest.raises(InvalidFileUploadError, match="Invalid file"):
        validate_pdf(upload)


def test_rejects_more_than_10_pages():
    eleven_page_pdf = build_pdf_bytes(STRONG_RESUME_LINES, num_pages=11)
    upload = _make_upload("resume.pdf", "application/pdf", eleven_page_pdf)
    with pytest.raises(InvalidFileUploadError, match="Invalid file"):
        validate_pdf(upload)


def test_rejects_empty_text_pdf():
    empty_pdf = build_pdf_bytes([""], num_pages=1)
    upload = _make_upload("empty.pdf", "application/pdf", empty_pdf)
    pdf_bytes = validate_pdf(upload)
    with pytest.raises(
        InvalidFileUploadError,
        match="We could not read this resume. Please upload a text-based PDF.",
    ):
        extract_text(pdf_bytes)


def test_accepts_valid_text_pdf():
    fixtures = generate_all_fixtures()
    with open(fixtures["strong"], "rb") as f:
        raw = f.read()
    upload = _make_upload("strong_resume.pdf", "application/pdf", raw)
    validated_bytes = validate_pdf(upload)
    assert validated_bytes.startswith(b"%PDF")
    extracted = extract_text(validated_bytes)
    assert len(extracted) >= 200
    assert "FastAPI" in extracted


def test_redact_contact_info_removes_emails_phones_and_links():
    raw = (
        "Contact me at jane.doe+hire@gmail.com or call +1-415-555-0199 / (212) 555-0143. "
        "Portfolio: https://github.com/janedoe and linkedin.com/in/janedoe-dev"
    )
    redacted = redact_contact_info(raw)
    assert "jane.doe+hire@gmail.com" not in redacted
    assert "415-555-0199" not in redacted
    assert "212) 555-0143" not in redacted
    assert "github.com/janedoe" not in redacted
    assert "linkedin.com/in/janedoe-dev" not in redacted
    assert "[EMAIL]" in redacted
    assert "[PHONE]" in redacted
    assert "[LINK]" in redacted


def test_sanitize_text_strips_control_characters_and_truncates():
    dirty = "Hello\x00World\x07\x1b!   Multiple   \n\t  spaces." + ("A" * 13000)
    cleaned = sanitize_text(dirty)
    assert "\x00" not in cleaned
    assert "\x07" not in cleaned
    assert "\x1b" not in cleaned
    assert cleaned.startswith("HelloWorld! Multiple spaces.")
    assert len(cleaned) == 12000
