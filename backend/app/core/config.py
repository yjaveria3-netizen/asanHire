from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
import os

class Settings(BaseSettings):
    # Application & Environment
    APP_ENV: str = "dev"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_CORS_ORIGINS: Optional[str] = None
    TRUSTED_PROXIES: Optional[str] = None
    SHOW_DOCS_IN_PROD: bool = False

    # Supabase Credentials
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: Optional[str] = None

    # AI Model Providers
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Transactional Email (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "asanHire <hiring@notifications.asanhire.dev>"
    DEMO_EMAIL_OVERRIDE: Optional[str] = None

    # Security & Tokens
    INTERVIEW_TOKEN_SALT: str = ""
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB upload limit

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        extra="ignore",
        env_ignore_empty=False
    )

    @model_validator(mode="before")
    @classmethod
    def handle_environment_aliases(cls, values: dict) -> dict:
        # Alias support for legacy or alternative environment names
        if not values.get("APP_ENV"):
            values["APP_ENV"] = values.get("ENVIRONMENT", os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "dev")))
        
        if not values.get("RESEND_FROM") and values.get("RESEND_FROM_EMAIL"):
            values["RESEND_FROM"] = values.get("RESEND_FROM_EMAIL")
            
        if not values.get("SUPABASE_PUBLISHABLE_KEY") and values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY"):
            values["SUPABASE_PUBLISHABLE_KEY"] = values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            
        if not values.get("FRONTEND_URL") and values.get("NEXT_PUBLIC_APP_URL"):
            values["FRONTEND_URL"] = values.get("NEXT_PUBLIC_APP_URL")

        return values

    @property
    def cors_origins_list(self) -> List[str]:
        origins = {"http://localhost:3000"}
        if self.FRONTEND_URL and self.FRONTEND_URL.strip() and self.FRONTEND_URL != "*":
            origins.add(self.FRONTEND_URL.strip().rstrip("/"))
        if self.BACKEND_CORS_ORIGINS:
            for o in self.BACKEND_CORS_ORIGINS.split(","):
                clean = o.strip().rstrip("/")
                if clean and clean != "*":
                    origins.add(clean)
        return list(origins)

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in ("prod", "production")

    def check_required_env(self) -> List[str]:
        """
        Validates presence of all required environment variables.
        Returns a list of missing variable NAMES only (no values).
        """
        required_vars = [
            ("SUPABASE_URL", self.SUPABASE_URL),
            ("SUPABASE_PUBLISHABLE_KEY", self.SUPABASE_PUBLISHABLE_KEY),
            ("SUPABASE_SERVICE_ROLE_KEY", self.SUPABASE_SERVICE_ROLE_KEY),
            ("GROQ_API_KEY", self.GROQ_API_KEY),
            ("GROQ_MODEL", self.GROQ_MODEL),
            ("GEMINI_API_KEY", self.GEMINI_API_KEY),
            ("GEMINI_MODEL", self.GEMINI_MODEL),
            ("RESEND_API_KEY", self.RESEND_API_KEY),
            ("RESEND_FROM", self.RESEND_FROM),
            ("FRONTEND_URL", self.FRONTEND_URL),
            ("INTERVIEW_TOKEN_SALT", self.INTERVIEW_TOKEN_SALT),
        ]
        missing = [name for name, val in required_vars if not val or not str(val).strip()]
        return missing

settings = Settings()
