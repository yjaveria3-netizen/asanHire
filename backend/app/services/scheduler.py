import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.db import get_supabase_service_client
from app.agents.scheduling import schedule_job

logger = logging.getLogger("asanhire.scheduler")

scheduler = BackgroundScheduler()


def _parse_deadline(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    raise ValueError("Invalid deadline")


async def check_and_schedule_due_jobs() -> List[Dict[str, Any]]:
    """
    Finds jobs where status='open', auto_invite=true, deadline <= now() and
    scheduler_ran_at is null, claims each atomically, and runs schedule_job(job_id).
    """
    client = get_supabase_service_client()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    res = (
        client.table("jobs")
        .select("*")
        .eq("status", "open")
        .eq("auto_invite", True)
        .execute()
    )
    rows = res.data if (res and res.data) else []

    results: List[Dict[str, Any]] = []
    for job in rows:
        if job.get("scheduler_ran_at") is not None:
            continue
        deadline_raw = job.get("deadline")
        if not deadline_raw:
            continue
        try:
            deadline_dt = _parse_deadline(deadline_raw)
        except Exception:
            continue

        if deadline_dt <= now_utc:
            job_id = str(job["id"])
            # Atomic update claim so two workers or ticks never run the same job twice
            claim_query = (
                client.table("jobs")
                .update({"scheduler_ran_at": now_iso})
                .eq("id", job_id)
            )
            if hasattr(claim_query, "is_"):
                claim_query = claim_query.is_("scheduler_ran_at", "null")
            claim_res = claim_query.eq("status", "open").execute()
            if not claim_res.data:
                # Job was claimed concurrently by another worker
                continue

            try:
                out = await schedule_job(job_id, is_auto_run=True)
                results.append(out)
            except Exception as e:
                logger.error(f"Failed to run schedule_job for job {job_id}: {type(e).__name__}")

    return results


def check_job_deadlines_job() -> List[Dict[str, Any]]:
    """
    Synchronous entrypoint invoked every 60 seconds by APScheduler BackgroundScheduler.
    """
    try:
        return asyncio.run(check_and_schedule_due_jobs())
    except Exception as e:
        logger.error(f"Periodic deadline check failed: {type(e).__name__}")
        return []


def run_catchup_pass() -> None:
    """Immediate catch-up pass on startup for deadlines that passed while offline."""
    try:
        check_job_deadlines_job()
        logger.info("Scheduler startup catch-up pass completed.")
    except Exception as e:
        logger.warning(f"Scheduler startup catch-up pass encountered error: {e}")


def start_scheduler() -> None:
    """Initializes, runs startup catch-up pass, and starts BackgroundScheduler (every 60s)."""
    # 1. Run catch-up pass immediately on startup
    run_catchup_pass()

    # 2. Start recurring 60s ticker
    if not scheduler.running:
        scheduler.add_job(
            check_job_deadlines_job,
            trigger=IntervalTrigger(seconds=60),
            id="job_deadline_evaluator",
            name="Check expired job deadlines and auto-schedule interviews every 60s",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler BackgroundScheduler started (interval=60s).")


def stop_scheduler() -> None:
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler BackgroundScheduler stopped.")
