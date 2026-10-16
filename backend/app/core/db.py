import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("asanhire.db")

_supabase_client: Optional[Client] = None

def get_supabase_service_client() -> Client:
    """
    Returns a singleton Supabase client authenticated with the service role key.
    Used strictly in backend services; never exposed to clients.
    """
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.")
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_client
