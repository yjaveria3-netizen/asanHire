from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import public, interview, hr
from app.services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start periodic deadline scheduler
    start_scheduler()
    yield
    # Shutdown: Stop scheduler
    stop_scheduler()

app = FastAPI(
    title="asanHire API",
    description="Backend API and Agent Orchestration for asanHire AI recruitment platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(public.router)
app.include_router(interview.router)
app.include_router(hr.router)

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend operational status."""
    return {
        "status": "ok",
        "service": "asanHire Backend",
        "environment": settings.ENVIRONMENT,
        "agents": ["rubric", "matcher", "scheduling", "interview", "guardian", "supervisor"]
    }

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint redirecting developers to interactive Swagger docs."""
    return {
        "message": "Welcome to asanHire API. Access /docs for interactive OpenAPI specification.",
        "documentation": "/docs",
        "health": "/health"
    }
