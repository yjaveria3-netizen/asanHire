import hmac
import hashlib
import secrets
from app.core.config import settings

def generate_token() -> str:
    """Generates a cryptographically secure 32-byte URL-safe string."""
    return secrets.token_urlsafe(32)

# Alias for backwards compatibility
generate_raw_token = generate_token

def hash_token(token: str) -> str:
    """Computes HMAC-SHA256 of token keyed with INTERVIEW_TOKEN_SALT as a hex digest."""
    key = settings.INTERVIEW_TOKEN_SALT.encode("utf-8")
    msg = token.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def verify_token_hash(token: str, stored_hash: str) -> bool:
    """Performs constant-time comparison of HMAC-SHA256 hashes to prevent timing attacks."""
    actual_hash = hash_token(token)
    return hmac.compare_digest(actual_hash, stored_hash)
