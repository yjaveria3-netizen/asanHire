import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("asanhire.audit")

async def log_audit_event(
    user_id: Optional[str],
    entity_type: str,
    entity_id: str,
    action: str,
    previous_state: Dict[str, Any],
    new_state: Dict[str, Any],
    reason: str
) -> Dict[str, Any]:
    """
    Records an immutable audit event for every human or automated state mutation.
    TODO: M2 (AI/backend engineer) will insert into public.audit_logs table.
    """
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "previous_state": previous_state,
        "new_state": new_state,
        "reason": reason,
        "created_at": datetime.utcnow().isoformat()
    }
    logger.info(f"AUDIT LOG: [{action.upper()}] on {entity_type} {entity_id} by {user_id or 'SYSTEM'}. Reason: {reason}")
    return log_entry
