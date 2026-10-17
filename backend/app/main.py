import logging
import sys
from contextlib import asynccontextmanager
from typing import Callable
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter, custom_rate_limit_exceeded_handler
from app.api import public, interview, hr, admin
from app.core.security import get_current_user_profile
from app.services.scheduler import start_scheduler, stop_scheduler

# Structured Logging Setup (never logs tokens, API keys, resume text, or emails)
logging.basicConfig(
    level=logging.INFO if not settings.is_production else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("asanhire.app")

MAX_BODY_SIZE_BYTES = 6 * 1024 * 1024  # 6 MB request body limit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Check all required environment variables
    missing_vars = settings.check_required_env()
    if missing_vars:
        msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.critical(msg)
        raise RuntimeError(msg)

    # Start background scheduler
    try:
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler failed to initialize: {type(e).__name__}")

    yield

    # Shutdown
    try:
        stop_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler shutdown error: {type(e).__name__}")

# Conditionally enable interactive API documentation
docs_url = "/docs" if (not settings.is_production or settings.SHOW_DOCS_IN_PROD) else None
redoc_url = "/redoc" if (not settings.is_production or settings.SHOW_DOCS_IN_PROD) else None
openapi_url = "/openapi.json" if (not settings.is_production or settings.SHOW_DOCS_IN_PROD) else None

app = FastAPI(
    title="asanHire API",
    description="Backend API and Agent Orchestration for asanHire AI recruitment platform.",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    lifespan=lifespan
)

# Connect slowapi limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Returns a short generic 422 error without echoing user input."""
    logger.warning(f"Validation error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Invalid request payload"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Standardized HTTP exception responses."""
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": detail}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches all unhandled exceptions, logs details server-side only, and returns generic 500."""
    logger.error(
        f"Unhandled server error on {request.method} {request.url.path}: {type(exc).__name__}",
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Something went wrong"}
    )

# Security Headers & Size Limit Middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next: Callable) -> Response:
    # 1. Enforce 6 MB request size limit
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_BODY_SIZE_BYTES:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"error": "Payload too large. Maximum allowed size is 6 MB."}
                )
        except ValueError:
            pass

    response = await call_next(request)

    # 2. Inject security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"

    return response

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include Routers (mounted at both /hr, /public, /interview and /api/*)
app.include_router(public.router, prefix="/public")
app.include_router(public.router, prefix="/api/public")
app.include_router(interview.router, prefix="/interview")
app.include_router(interview.router, prefix="/api/interview")
app.include_router(hr.router, prefix="/hr")
app.include_router(hr.router, prefix="/api/hr")
app.include_router(admin.router, prefix="/admin")
app.include_router(admin.router, prefix="/api/admin")

@app.get("/me", tags=["Auth & Identity"])
@app.get("/api/me", tags=["Auth & Identity"])
async def me_endpoint(profile: dict = Depends(get_current_user_profile)):
    """Current authenticated user profile, role, and password rotation status."""
    return profile

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint. Returns status ok with zero internal details or secrets."""
    return {"status": "ok"}
