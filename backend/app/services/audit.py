import logging
from typing import Dict, Any, Optional
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.audit")


def write_audit_log(
    owner_id: str,
    actor: str,
    action: str,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    reason: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Inserts an immutable audit row into public.audit_log.
    """
    row: Dict[str, Any] = {
        "owner_id": owner_id,
        "actor": actor,
        "action": action,
    }
    if job_id is not None:
        row["job_id"] = job_id
    if candidate_id is not None:
        row["candidate_id"] = candidate_id
    if from_status is not None:
        row["from_status"] = from_status
    if to_status is not None:
        row["to_status"] = to_status
    if reason is not None:
        row["reason"] = reason

    try:
        client = get_supabase_service_client()
        res = client.table("audit_log").insert(row).execute()
        logger.info(f"Audit log recorded: action={action} job_id={job_id} candidate_id={candidate_id}")
        return res.data[0] if res.data else row
    except Exception as e:
        logger.error(f"Failed to write audit_log: {type(e).__name__}")
        return None


async def log_audit_event(
    user_id: Optional[str],
    entity_type: str,
    entity_id: str,
    action: str,
    previous_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    reason: Optional[str] = None,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Async helper compatible with both entity-style and direct audit_log calls."""
    resolved_job_id = job_id or (entity_id if entity_type == "job" else None)
    resolved_cand_id = candidate_id or (entity_id if entity_type == "candidate" else None)
    from_status = (previous_state or {}).get("status")
    to_status = (new_state or {}).get("status")
    return write_audit_log(
        owner_id=user_id or "",
        actor=user_id or "system",
        action=action,
        job_id=resolved_job_id,
        candidate_id=resolved_cand_id,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
    )
