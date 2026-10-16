import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.db import get_supabase_service_client
from app.core.llm import log_agent_run
from app.services.email import send_templated_email
from app.services.audit import write_audit_log

logger = logging.getLogger("asanhire.agents.scheduling")


def _parse_created_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(text)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.max.replace(tzinfo=timezone.utc)


def compute_effective_score(candidate: Dict[str, Any]) -> Optional[float]:
    """effective_score = hr_score_override if set else ai_score."""
    hr_override = candidate.get("hr_score_override")
    if hr_override is not None:
        return float(hr_override)
    ai_score = candidate.get("ai_score")
    if ai_score is not None:
        return float(ai_score)
    return None


async def invite_candidate_with_token(
    candidate: Dict[str, Any],
    job: Dict[str, Any],
    actor: str = "system:scheduling_agent",
    reason: str = "Auto-invited by Scheduling Agent",
    send_email: bool = True,
) -> Dict[str, Any]:
    """
    Creates an interview row with a fresh random token (secrets.token_urlsafe(32)),
    stores ONLY its SHA-256 hash, sets expires_at = now + 48h, sets candidate
    status = 'invited', sends the invite email via Resend with link
    FRONTEND_URL/interview/{token}, and writes email_log + audit_log.
    """
    client = get_supabase_service_client()
    candidate_id = str(candidate["id"])
    job_id = str(job["id"])
    owner_id = str(job.get("owner_id") or job.get("created_by") or actor)
    previous_status = str(candidate.get("status") or "applied")

    # Void any prior active/pending interview rows for this candidate (supports resend)
    try:
        client.table("interviews").update({"voided": True}).eq("candidate_id", candidate_id).execute()
    except Exception:
        pass

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(hours=48)
    expires_iso = expires_at.isoformat()

    interview_payload: Dict[str, Any] = {
        "candidate_id": candidate_id,
        "token_hash": token_hash,
        "expires_at": expires_iso,
        "status": "pending",
        "voided": False,
        "retry_allowed": False,
        "trust_score": 100,
    }
    int_res = client.table("interviews").insert(interview_payload).execute()
    interview_row = int_res.data[0] if (int_res and int_res.data) else interview_payload
    interview_id = str(interview_row.get("id") or "")

    # Update candidate status to 'invited'
    client.table("candidates").update({"status": "invited"}).eq("id", candidate_id).execute()

    # Send fixed-template invite email via Resend & write email_log
    frontend_base = (settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    interview_url = f"{frontend_base}/interview/{raw_token}"

    if send_email:
        await send_templated_email(
            recipient_email=str(candidate.get("email") or ""),
            template_type="invite",
            context={
                "candidate_name": str(candidate.get("name") or "Candidate"),
                "job_title": str(job.get("title") or "Open Position"),
                "interview_url": interview_url,
                "expires_at": expires_at.strftime("%Y-%m-%d %H:%M UTC"),
            },
            candidate_id=candidate_id,
            sent_by=actor,
        )

    # Write audit_log
    write_audit_log(
        owner_id=owner_id,
        actor=actor,
        action="candidate_invited",
        job_id=job_id,
        candidate_id=candidate_id,
        from_status=previous_status,
        to_status="invited",
        reason=reason,
    )

    return {
        "candidate_id": candidate_id,
        "interview_id": interview_id,
        "status": "invited",
        "expires_at": expires_iso,
    }


async def schedule_job(job_id: str) -> Dict[str, Any]:
    """
    Deterministic Scheduling Agent (no LLM):
    - Picks top N candidates with status in ('applied', 'shortlisted') and
      effective_score >= min_score (effective_score = hr_score_override if set else ai_score).
    - Breaks ties by earliest application (created_at ascending).
    - For each: creates an interview row with secrets.token_urlsafe(32) (storing only SHA-256 hash,
      expires_at = now + 48h), sets candidate status 'invited', sends invite email via Resend
      with link FRONTEND_URL/interview/{token}, writes email_log, agent_runs (agent='scheduling'),
      and audit_log (actor='system:scheduling_agent').
    - Sets jobs.scheduler_ran_at = now().
    """
    client = get_supabase_service_client()
    job_res = client.table("jobs").select("*").eq("id", job_id).execute()
    if not job_res or not job_res.data:
        raise ValueError(f"Job {job_id} not found")

    job = job_res.data[0]
    top_n = int(job.get("top_n", 5))
    min_score = float(job.get("min_score", 60))

    cand_res = client.table("candidates").select("*").eq("job_id", job_id).execute()
    all_candidates = cand_res.data if (cand_res and cand_res.data) else []

    qualifying: List[Dict[str, Any]] = []
    for c in all_candidates:
        c_status = str(c.get("status") or "").lower()
        if c_status not in {"applied", "shortlisted"}:
            continue
        eff_score = compute_effective_score(c)
        if eff_score is None or eff_score < min_score:
            continue
        qualifying.append(c)

    # Sort by highest effective_score first, then earliest created_at ascending for tie-breaking
    qualifying.sort(
        key=lambda c: (
            -(compute_effective_score(c) or 0.0),
            _parse_created_at(c.get("created_at")),
            str(c.get("id") or ""),
        )
    )

    selected = qualifying[:top_n]
    invited_ids: List[str] = []

    for cand in selected:
        await invite_candidate_with_token(
            candidate=cand,
            job=job,
            actor="system:scheduling_agent",
            reason="Auto-invited by Scheduling Agent",
            send_email=True,
        )
        cid = str(cand["id"])
        invited_ids.append(cid)
        await log_agent_run(
            agent="scheduling",
            job_id=job_id,
            candidate_id=cid,
            status="success",
            provider="deterministic",
        )

    if not selected:
        await log_agent_run(
            agent="scheduling",
            job_id=job_id,
            candidate_id=None,
            status="success",
            provider="deterministic",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    client.table("jobs").update({"scheduler_ran_at": now_iso}).eq("id", job_id).execute()

    return {
        "job_id": job_id,
        "invited_count": len(invited_ids),
        "invited_candidate_ids": invited_ids,
        "scheduler_ran_at": now_iso,
    }


async def evaluate_and_invite_top_candidates(job_id: str, top_n: int = 5, min_score: float = 60.0) -> List[Dict[str, Any]]:
    """Backwards-compatible wrapper around schedule_job."""
    res = await schedule_job(job_id)
    return [{"candidate_id": cid} for cid in res.get("invited_candidate_ids", [])]
