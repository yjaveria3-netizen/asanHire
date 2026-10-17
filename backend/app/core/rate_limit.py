import logging
from typing import List
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.wrappers import Limit
from limits import parse
from app.core.config import settings

logger = logging.getLogger("asanhire.ratelimit")

def get_client_ip(request: Request) -> str:
    """
    Resolves client IP.
    Honors X-Forwarded-For and X-Real-IP for cloud deployments (Render, Vercel, Railway).
    Defaults to request.client.host.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        if client_ip:
            return client_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    return request.client.host if request.client else "127.0.0.1"

# Initialize slowapi Limiter
limiter = Limiter(key_func=get_client_ip)

_public_limit_item = parse("120/minute")
_interview_limit_item = parse("60/minute")
_hr_limit_item = parse("120/minute")

_public_limit = Limit(_public_limit_item, key_func=lambda: "ip", scope="public", per_method=False, methods=None, error_message="Too many requests. Please try again later.", exempt_when=None, cost=1, override_defaults=True)
_interview_limit = Limit(_interview_limit_item, key_func=lambda: "ip", scope="interview", per_method=False, methods=None, error_message="Too many requests. Please try again later.", exempt_when=None, cost=1, override_defaults=True)
_hr_limit = Limit(_hr_limit_item, key_func=lambda: "ip", scope="hr", per_method=False, methods=None, error_message="Too many requests. Please try again later.", exempt_when=None, cost=1, override_defaults=True)

def rate_limit_public(request: Request) -> None:
    """Limits public endpoints to 10 requests per minute per IP."""
    ip = get_client_ip(request)
    if not limiter._limiter.hit(_public_limit_item, f"pub:{ip}"):
        raise RateLimitExceeded(_public_limit)

def rate_limit_interview(request: Request) -> None:
    """Limits candidate interview endpoints to 10 requests per minute per IP."""
    ip = get_client_ip(request)
    if not limiter._limiter.hit(_interview_limit_item, f"int:{ip}"):
        raise RateLimitExceeded(_interview_limit)

def rate_limit_hr(request: Request) -> None:
    """Limits authenticated HR endpoints to 60 requests per minute per IP."""
    ip = get_client_ip(request)
    if not limiter._limiter.hit(_hr_limit_item, f"hr:{ip}"):
        raise RateLimitExceeded(_hr_limit)

def custom_rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
    """Returns generic 429 response without leaking internal details."""
    return JSONResponse(
        status_code=429,
        content={"error": "Too many requests. Please try again later."}
    )
