from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "asanHire Backend"
    ENVIRONMENT: str = "development"
    PORT: int = 8000

    # Supabase Configuration
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret-min-32-chars-long"

    # AI Configuration
    GEMINI_API_KEY: str = "placeholder-gemini-key"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GROQ_API_KEY: str = "placeholder-groq-key"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Email Configuration
    RESEND_API_KEY: str = "placeholder-resend-key"
    RESEND_FROM_EMAIL: str = "asanHire <hiring@notifications.asanhire.dev>"

    # Security & Tokens
    INTERVIEW_TOKEN_SALT: str = "asanHire_secure_default_salt_2026_xyz"
    PUBLIC_APP_URL: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Rate Limiting
    RATE_LIMIT_PUBLIC_PER_MINUTE: int = 20
    RATE_LIMIT_INTERVIEW_PER_MINUTE: int = 60
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
