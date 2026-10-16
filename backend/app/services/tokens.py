import hmac
import hashlib
import secrets
from app.core.config import settings

def generate_raw_token() -> str:
    """Generates a cryptographically secure 32-byte URL-safe string."""
    return secrets.token_urlsafe(32)

def hash_token(raw_token: str) -> str:
    """Computes SHA-256 hash of raw_token salted with INTERVIEW_TOKEN_SALT."""
    salted = f"{raw_token}{settings.INTERVIEW_TOKEN_SALT}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()

def verify_token_hash(raw_token: str, expected_hash: str) -> bool:
    """Performs constant-time comparison of token hashes to prevent timing attacks."""
    actual_hash = hash_token(raw_token)
    return hmac.compare_digest(actual_hash, expected_hash)
