import time
from collections import defaultdict
from fastapi import Request
from app.core.config import settings
from app.core.errors import RateLimitExceededError

# In-memory storage for sliding window timestamps: key -> list of float timestamps
_request_history = defaultdict(list)

def rate_limit_public(request: Request):
    """Rate limit for public candidate application routes (default: 20 req/min)."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    key = f"pub:{client_ip}"
    now = time.time()
    cutoff = now - 60.0

    # Prune expired timestamps
    _request_history[key] = [ts for ts in _request_history[key] if ts > cutoff]

    if len(_request_history[key]) >= settings.RATE_LIMIT_PUBLIC_PER_MINUTE:
        raise RateLimitExceededError(
            f"Rate limit exceeded: max {settings.RATE_LIMIT_PUBLIC_PER_MINUTE} requests per minute."
        )

    _request_history[key].append(now)

def rate_limit_interview(request: Request):
    """Rate limit for live interview interaction routes (default: 60 req/min)."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    key = f"int:{client_ip}"
    now = time.time()
    cutoff = now - 60.0

    _request_history[key] = [ts for ts in _request_history[key] if ts > cutoff]

    if len(_request_history[key]) >= settings.RATE_LIMIT_INTERVIEW_PER_MINUTE:
        raise RateLimitExceededError(
            f"Rate limit exceeded: max {settings.RATE_LIMIT_INTERVIEW_PER_MINUTE} requests per minute."
        )

    _request_history[key].append(now)
