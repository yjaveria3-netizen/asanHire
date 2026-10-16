import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger("asanhire.scheduler")

scheduler = AsyncIOScheduler()

async def check_job_deadlines_job():
    """
    Periodic background job to evaluate active jobs whose deadlines have elapsed.
    Triggers Scheduling Agent to invite top N candidates.
    TODO: M2 (AI/backend engineer) will connect to Supabase DB to query:
    SELECT * FROM jobs WHERE status = 'active' AND deadline <= now()
    """
    logger.info("Executing periodic job deadline checker...")
    # In full build, imports and calls app.agents.scheduling.evaluate_job_deadline

def start_scheduler():
    """Initializes and starts the APScheduler background worker."""
    if not scheduler.running:
        scheduler.add_job(
            check_job_deadlines_job,
            trigger=IntervalTrigger(minutes=5),
            id="job_deadline_evaluator",
            name="Check expired job deadlines and auto-schedule interviews",
            replace_existing=True
        )
        scheduler.start()
        logger.info("APScheduler background worker started.")

def stop_scheduler():
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler background worker stopped.")
