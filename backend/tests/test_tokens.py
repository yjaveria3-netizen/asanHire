from app.services.tokens import generate_raw_token, hash_token, verify_token_hash

def test_token_generation_length():
    token = generate_raw_token()
    assert isinstance(token, str)
    assert len(token) >= 32

def test_token_hashing_and_verification():
    token = generate_raw_token()
    token_hash = hash_token(token)
    
    assert isinstance(token_hash, str)
    assert len(token_hash) == 64  # SHA-256 output hex length
    
    # Verify positive match
    assert verify_token_hash(token, token_hash) is True
    
    # Verify negative match with tampered token
    tampered_token = token + "_tampered"
    assert verify_token_hash(tampered_token, token_hash) is False

def test_token_hash_uniqueness():
    token1 = generate_raw_token()
    token2 = generate_raw_token()
    assert hash_token(token1) != hash_token(token2)
