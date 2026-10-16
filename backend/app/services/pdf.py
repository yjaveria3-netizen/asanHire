import io
from app.core.config import settings
from app.core.errors import InvalidFileUploadError

def validate_pdf_bytes(file_bytes: bytes) -> bool:
    """
    Validates uploaded file:
    1. Checks file size against MAX_UPLOAD_SIZE_BYTES (5 MB).
    2. Validates PDF magic bytes (%PDF-).
    """
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise InvalidFileUploadError("File size exceeds 5 MB limit.")

    if not file_bytes.startswith(b"%PDF-"):
        raise InvalidFileUploadError("File signature mismatch. Uploaded file is not a valid PDF.")

    return True

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from PDF bytes using pypdf.
    Falls back gracefully if encrypted or poorly formatted.
    """
    validate_pdf_bytes(file_bytes)
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text.append(text)
        full_text = "\n".join(extracted_text).strip()
        return full_text if full_text else "Resume text extraction yielded empty content."
    except Exception as e:
        # Fallback for plain text or damaged streams
        return f"Warning: PDF parsing encountered error: {str(e)}"
