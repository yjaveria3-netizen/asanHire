import hmac
import hashlib
from app.services.tokens import generate_token, hash_token, verify_token_hash

def test_token_uniqueness():
    """Generates 100 tokens and verifies all 100 are unique."""
    tokens = [generate_token() for _ in range(100)]
    assert len(set(tokens)) == 100

def test_hash_stability():
    """Same token hashed multiple times produces the exact same hash."""
    token = generate_token()
    hash1 = hash_token(token)
    hash2 = hash_token(token)
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex digest length

def test_different_salt_gives_different_hash():
    """Different HMAC keys (salts) result in different hash digests."""
    token = generate_token()
    salt1 = "salt_alpha_12345"
    salt2 = "salt_beta_67890"

    hash1 = hmac.new(salt1.encode(), token.encode(), hashlib.sha256).hexdigest()
    hash2 = hmac.new(salt2.encode(), token.encode(), hashlib.sha256).hexdigest()
    assert hash1 != hash2

def test_wrong_token_fails_verification():
    """Verifying an incorrect or modified token returns False."""
    real_token = generate_token()
    stored_hash = hash_token(real_token)

    assert verify_token_hash(real_token, stored_hash) is True
    assert verify_token_hash("wrong_token_xyz", stored_hash) is False
    assert verify_token_hash(real_token + "a", stored_hash) is False
