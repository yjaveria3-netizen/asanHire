import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.core.llm import call_json, log_agent_run
from app.core.db import get_supabase_service_client
from app.prompts import RUBRIC_SYSTEM_PROMPT, RUBRIC_USER_TEMPLATE
from app.models.schemas import RubricOutput, RubricCriterion, normalize_criteria_weights

logger = logging.getLogger("asanhire.agents.rubric")


def normalize_weights(criteria: List[Any]) -> List[Any]:
    """
    Normalizes criterion weights (on RubricCriterion objects or dicts) in code
    so they are integers that sum to 100.
    """
    if not criteria:
        return criteria
    if isinstance(criteria[0], RubricCriterion):
        return normalize_criteria_weights(criteria)

    # Support list of dicts as well
    models = [RubricCriterion.model_validate(c) for c in criteria]
    normalized = normalize_criteria_weights(models)
    return [m.model_dump() for m in normalized]


async def generate_job_rubric(
    title: str,
    description: str,
    skills: List[str],
    experience_level: str = "mid",
) -> RubricOutput:
    """
    Rubric Agent: Calls Gemini via call_json with security preamble + Rubric prompt R.
    Wraps title, description, skills, and experience_level inside <job></job> tags.
    Validates 4-7 criteria, normalizes weights to 100, and checks seniority.
    """
    skills_str = ", ".join(skills) if isinstance(skills, list) else str(skills)
    user_prompt = RUBRIC_USER_TEMPLATE.format(
        title=title,
        description=description,
        skills=skills_str,
        experience_level=experience_level,
    )

    rubric = await call_json(
        provider="gemini",
        system_prompt=RUBRIC_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_model=RubricOutput,
        max_tokens=1500,
        temperature=0.2,
    )
    # Ensure weights are normalized to 100 in code
    rubric.criteria = normalize_criteria_weights(rubric.criteria)
    return rubric


async def run_rubric_for_job(
    job_id: Optional[str],
    title: str,
    description: str,
    skills: List[str],
    experience_level: str = "mid",
) -> Tuple[Optional[Dict[str, Any]], str, Optional[str]]:
    """
    Executes the Rubric Agent for a job, updates jobs.rubric and writes an agent_runs row.
    If the LLM fails after retry and fallback, sets rubric=None and status='draft'
    with a clear message so HR can retry without losing the job.
    """
    start_ts = time.time()
    try:
        rubric_out = await generate_job_rubric(
            title=title,
            description=description,
            skills=skills,
            experience_level=experience_level,
        )
        rubric_dict = rubric_out.model_dump()
        latency_ms = int((time.time() - start_ts) * 1000)

        if job_id:
            try:
                client = get_supabase_service_client()
                client.table("jobs").update(
                    {"rubric": rubric_dict, "status": "open"}
                ).eq("id", job_id).execute()
            except Exception as db_err:
                logger.error(f"Failed to update job rubric in DB: {type(db_err).__name__}")

            await log_agent_run(
                agent="rubric",
                job_id=job_id,
                status="success",
                provider="gemini",
                latency_ms=latency_ms,
            )

        return rubric_dict, "open", None

    except Exception as e:
        latency_ms = int((time.time() - start_ts) * 1000)
        logger.error(f"Rubric Agent failed after retry and fallback: {type(e).__name__}")

        if job_id:
            try:
                client = get_supabase_service_client()
                client.table("jobs").update(
                    {"rubric": None, "status": "draft"}
                ).eq("id", job_id).execute()
            except Exception as db_err:
                logger.error(f"Failed to mark job as draft in DB: {type(db_err).__name__}")

            await log_agent_run(
                agent="rubric",
                job_id=job_id,
                status="failed",
                provider="gemini",
                latency_ms=latency_ms,
            )

        return (
            None,
            "draft",
            "Job saved as draft because rubric generation failed. You can retry rubric generation.",
        )
