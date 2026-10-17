"""
asanHire Orphan and Stuck Job Cleanup Utility
Usage:
    python backend/scripts/cleanup_orphans.py [--dry-run | --apply]

Default is --dry-run (safe report only).
With --apply, orphan storage files are removed and jobs stuck in 'deleting' >1 hour are purged.
Never logs candidate names, emails, or resume text.
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(script_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.db import get_supabase_service_client
from app.services.storage import list_all_resume_files, delete_resume_files
from app.services.audit import write_audit_log

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cleanup_orphans")


def cleanup(apply_changes: bool = False):
    mode_str = "APPLY (live changes)" if apply_changes else "DRY-RUN (read only)"
    logger.info(f"Starting orphan cleanup in {mode_str} mode...")

    client = get_supabase_service_client()

    # =========================================================================
    # 1. Identify Orphan Storage Files
    # =========================================================================
    storage_files = list_all_resume_files()
    logger.info(f"Total files found in 'resumes' bucket: {len(storage_files)}")

    # Fetch all candidate resume_paths
    cands_res = client.table("candidates").select("resume_path").execute()
    db_paths = set(
        str(c["resume_path"]).strip()
        for c in (cands_res.data or [])
        if c.get("resume_path")
    )

    orphan_files = [f for f in storage_files if f not in db_paths]
    logger.info(f"Orphan storage files identified: {len(orphan_files)}")
    for f in orphan_files:
        logger.info(f"  - Orphan file: {f}")

    if apply_changes and orphan_files:
        logger.info(f"Deleting {len(orphan_files)} orphan storage file(s)...")
        deleted, failed = delete_resume_files(orphan_files)
        logger.info(f"  Successfully deleted: {len(deleted)}, Failed: {len(failed)}")

    # =========================================================================
    # 2. Identify Jobs Stuck in 'deleting' > 1 hour
    # =========================================================================
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    jobs_res = client.table("jobs").select("id, title, status, updated_at, created_at").eq("status", "deleting").execute()
    stuck_jobs = []

    for j in (jobs_res.data or []):
        ts_raw = j.get("updated_at") or j.get("created_at")
        if ts_raw:
            try:
                dt = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt < one_hour_ago:
                    stuck_jobs.append(j)
            except Exception:
                stuck_jobs.append(j)
        else:
            stuck_jobs.append(j)

    logger.info(f"Jobs stuck in 'deleting' > 1 hour: {len(stuck_jobs)}")
    for j in stuck_jobs:
        logger.info(f"  - Stuck job ID: {j['id']} (status: {j['status']})")

    if apply_changes and stuck_jobs:
        for j in stuck_jobs:
            job_id = str(j["id"])
            logger.info(f"Purging stuck job {job_id}...")

            # 1. Collect and delete candidates' resumes
            c_res = client.table("candidates").select("id, resume_path").eq("job_id", job_id).execute()
            cands = c_res.data or []
            cand_ids = [str(c["id"]) for c in cands]
            res_paths = [str(c["resume_path"]) for c in cands if c.get("resume_path")]
            if res_paths:
                delete_resume_files(res_paths)

            # 2. Cascade delete
            if cand_ids:
                i_res = client.table("interviews").select("id").in_("candidate_id", cand_ids).execute()
                i_ids = [str(i["id"]) for i in (i_res.data or [])]
                if i_ids:
                    client.table("proctor_events").delete().in_("interview_id", i_ids).execute()
                client.table("reports").delete().in_("candidate_id", cand_ids).execute()
                client.table("interviews").delete().in_("candidate_id", cand_ids).execute()

            try:
                client.table("emails").delete().eq("job_id", job_id).execute()
            except Exception:
                pass
            try:
                client.table("agent_runs").delete().eq("job_id", job_id).execute()
            except Exception:
                pass
            try:
                client.table("audit_log").delete().eq("job_id", job_id).execute()
                if cand_ids:
                    client.table("audit_log").delete().in_("candidate_id", cand_ids).execute()
            except Exception:
                pass

            client.table("candidates").delete().eq("job_id", job_id).execute()
            client.table("jobs").delete().eq("id", job_id).execute()

            write_audit_log(
                owner_id="system",
                actor="system",
                action="job_deleted",
                job_id=job_id,
                reason=f"Stuck job purged by cleanup_orphans maintenance script",
            )
            logger.info(f"Finished purging stuck job {job_id}.")

    logger.info("Cleanup run finished.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="asanHire Orphan Files and Stuck Jobs Cleanup")
    parser.add_argument("--apply", action="store_true", help="Apply deletions (default is dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry-run only (default)")
    args = parser.parse_args()

    apply_mode = args.apply and not args.dry_run
    cleanup(apply_changes=apply_mode)
