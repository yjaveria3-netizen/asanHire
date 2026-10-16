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
    Honors X-Forwarded-For ONLY when the direct client is a configured trusted proxy.
    Otherwise defaults to request.client.host.
    """
    trusted_proxies: List[str] = [
        p.strip() for p in (settings.TRUSTED_PROXIES or "").split(",") if p.strip()
    ]
    direct_ip = request.client.host if request.client else "127.0.0.1"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and trusted_proxies and direct_ip in trusted_proxies:
        client_ip = forwarded.split(",")[0].strip()
        return client_ip

    return direct_ip

# Initialize slowapi Limiter
limiter = Limiter(key_func=get_client_ip)

_public_limit_item = parse("10/minute")
_interview_limit_item = parse("10/minute")
_hr_limit_item = parse("60/minute")

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
