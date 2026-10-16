import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.pdf import validate_pdf_bytes
from app.core.errors import InvalidFileUploadError

client = TestClient(app, raise_server_exceptions=False)

def test_health_check_returns_200():
    """GET /health returns 200 and {'status': 'ok'} without leaking secrets."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_hr_routes_require_auth():
    """/hr routes return 401 when no Authorization header is provided."""
    response = client.get("/api/hr/jobs")
    assert response.status_code == 401
    assert response.json() == {"error": "Unauthorized"}

def test_hr_routes_reject_invalid_token():
    """/hr routes return 401 when an invalid or malformed Bearer token is provided."""
    response = client.get(
        "/api/hr/jobs",
        headers={"Authorization": "Bearer malformed.invalid.token"}
    )
    assert response.status_code == 401
    assert response.json() == {"error": "Unauthorized"}

def test_cors_rejects_unknown_origin():
    """CORS middleware rejects unapproved origins (no Access-Control-Allow-Origin header)."""
    headers = {
        "Origin": "http://malicious-attacker.com",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/hr/jobs", headers=headers)
    allowed_origin = response.headers.get("access-control-allow-origin")
    assert allowed_origin != "http://malicious-attacker.com"
    assert allowed_origin != "*"

def test_oversized_payload_rejected():
    """Payloads exceeding 6 MB are rejected with HTTP 413."""
    oversized_length = str(7 * 1024 * 1024)  # 7 MB
    response = client.post(
        "/api/public/jobs/test-id/apply",
        headers={"Content-Length": oversized_length, "Content-Type": "application/json"},
        content=b""
    )
    assert response.status_code == 413
    assert "Payload too large" in response.json().get("error", "")

def test_pdf_magic_bytes_valid():
    valid_pdf_stream = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj"
    assert validate_pdf_bytes(valid_pdf_stream) is True

def test_pdf_magic_bytes_invalid():
    invalid_stream = b"<html><body>Not a PDF</body></html>"
    with pytest.raises(InvalidFileUploadError):
        validate_pdf_bytes(invalid_stream)

def test_pdf_size_limit_exceeded():
    large_stream = b"%PDF-" + b"0" * (5 * 1024 * 1024 + 10)
    with pytest.raises(InvalidFileUploadError):
        validate_pdf_bytes(large_stream)
