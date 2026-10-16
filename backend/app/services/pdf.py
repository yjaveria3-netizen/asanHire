import io
import re
from typing import Any
from pypdf import PdfReader
from app.core.config import settings
from app.core.errors import InvalidFileUploadError

MAX_PDF_BYTES: int = 5 * 1024 * 1024  # 5 MB
MAX_PDF_PAGES: int = 10
MIN_USABLE_TEXT_CHARS: int = 200
MAX_SANITIZED_CHARS: int = 12000
CHUNK_SIZE: int = 64 * 1024  # 64 KB chunks

# Regex patterns for redacting contact info before LLM submission
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_URL_RE = re.compile(
    r"(?:https?://|www\.)[^\s,;()<>\"']+"
    r"|\b(?:linkedin\.com/in|github\.com|gitlab\.com|twitter\.com|x\.com|behance\.net|dribbble\.com)/[A-Za-z0-9_./-]+",
    re.IGNORECASE,
)
_PHONE_RE = re.compile(
    r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\b\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b"
)
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def validate_pdf_bytes(file_bytes: bytes) -> bool:
    """
    Validates raw PDF bytes:
    1. Checks file size against 5 MB limit.
    2. Validates PDF magic bytes (%PDF).
    """
    if not file_bytes or len(file_bytes) > MAX_PDF_BYTES:
        raise InvalidFileUploadError("Invalid file")

    if not file_bytes.startswith(b"%PDF"):
        raise InvalidFileUploadError("Invalid file")

    return True


def validate_pdf(upload: Any) -> bytes:
    """
    Validates an uploaded PDF file object (e.g. FastAPI UploadFile):
    - Filename ends with .pdf
    - Content type is application/pdf
    - Starts with %PDF magic bytes
    - Size is <= 5 MB (read in chunks, stops early if exceeded)
    - Page count is <= 10 (and >= 1)
    Returns raw PDF bytes on success, or raises InvalidFileUploadError("Invalid file").
    """
    if upload is None:
        raise InvalidFileUploadError("Invalid file")

    filename: str = getattr(upload, "filename", "") or ""
    content_type: str = getattr(upload, "content_type", "") or ""

    if not filename.lower().endswith(".pdf"):
        raise InvalidFileUploadError("Invalid file")

    if content_type.lower() != "application/pdf":
        raise InvalidFileUploadError("Invalid file")

    # Obtain underlying synchronous binary stream if UploadFile, else read from object directly
    stream = getattr(upload, "file", upload)
    if hasattr(stream, "seek"):
        try:
            stream.seek(0)
        except Exception:
            pass

    chunks: list[bytes] = []
    total_size: int = 0
    checked_magic: bool = False

    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        if isinstance(chunk, str):
            chunk = chunk.encode("latin-1")

        if not checked_magic:
            if not chunk.startswith(b"%PDF"):
                raise InvalidFileUploadError("Invalid file")
            checked_magic = True

        total_size += len(chunk)
        if total_size > MAX_PDF_BYTES:
            raise InvalidFileUploadError("Invalid file")

        chunks.append(chunk)

    pdf_bytes = b"".join(chunks)
    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        raise InvalidFileUploadError("Invalid file")

    # Verify valid PDF structure and page count <= 10
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=False)
        if reader.is_encrypted:
            raise InvalidFileUploadError("Invalid file")
        num_pages = len(reader.pages)
        if num_pages < 1 or num_pages > MAX_PDF_PAGES:
            raise InvalidFileUploadError("Invalid file")
    except InvalidFileUploadError:
        raise
    except Exception:
        raise InvalidFileUploadError("Invalid file")

    return pdf_bytes


def extract_text(pdf_bytes: bytes) -> str:
    """
    Extracts text from PDF bytes using pypdf.
    Handles encrypted, corrupted, and image-only PDFs gracefully.
    Rejects if usable text is fewer than 200 characters.
    Never executes or renders embedded content.
    """
    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        raise InvalidFileUploadError(
            "We could not read this resume. Please upload a text-based PDF."
        )

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=False)
        if reader.is_encrypted:
            try:
                decrypt_result = reader.decrypt("")
                if decrypt_result == 0:
                    raise InvalidFileUploadError(
                        "We could not read this resume. Please upload a text-based PDF."
                    )
            except Exception:
                raise InvalidFileUploadError(
                    "We could not read this resume. Please upload a text-based PDF."
                )

        if len(reader.pages) > MAX_PDF_PAGES or len(reader.pages) < 1:
            raise InvalidFileUploadError("Invalid file")

        page_texts: list[str] = []
        for page in reader.pages:
            page_str = page.extract_text() or ""
            if page_str:
                page_texts.append(page_str)

        full_text = "\n".join(page_texts).strip()
    except InvalidFileUploadError:
        raise
    except Exception:
        raise InvalidFileUploadError(
            "We could not read this resume. Please upload a text-based PDF."
        )

    # Check usable character count (non-whitespace / total trimmed length >= 200)
    usable_text = re.sub(r"\s+", " ", full_text).strip()
    if len(usable_text) < MIN_USABLE_TEXT_CHARS:
        raise InvalidFileUploadError(
            "We could not read this resume. Please upload a text-based PDF."
        )

    return full_text


def sanitize_text(text: str) -> str:
    """
    Removes null bytes and control characters, collapses whitespace,
    and truncates to 12000 characters.
    """
    if not text:
        return ""
    no_nulls = text.replace("\x00", "")
    no_ctrl = _CONTROL_CHARS_RE.sub("", no_nulls)
    collapsed = re.sub(r"\s+", " ", no_ctrl).strip()
    return collapsed[:MAX_SANITIZED_CHARS]


def redact_contact_info(text: str) -> str:
    """
    Replaces email addresses, phone numbers, and URLs with personal handles
    with placeholders ([EMAIL], [PHONE], [LINK]) before sending to any LLM.
    """
    if not text:
        return ""
    redacted = _EMAIL_RE.sub("[EMAIL]", text)
    redacted = _URL_RE.sub("[LINK]", redacted)
    redacted = _PHONE_RE.sub("[PHONE]", redacted)
    return redacted


# Backward-compatible helper alias
def extract_text_from_pdf(file_bytes: bytes) -> str:
    validate_pdf_bytes(file_bytes)
    return extract_text(file_bytes)
