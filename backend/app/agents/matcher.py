import json
import re
import logging
from typing import Dict, Any, List, Optional
from app.core.llm import call_json, clamp_scores, log_agent_run
from app.core.db import get_supabase_service_client
from app.prompts import MATCHER_SYSTEM_PROMPT, MATCHER_USER_TEMPLATE
from app.models.schemas import MatcherOutput, MatcherCriterionScore
from app.services.pdf import redact_contact_info

logger = logging.getLogger("asanhire.agents.matcher")

MUST_HAVE_PENALTY_POINTS: int = 10

_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"give\s+(?:this\s+candidate\s+)?a?\s*score\s+of", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\b", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all\s+)?(?:the\s+above|previous|prior)", re.IGNORECASE),
    re.compile(r"forget\s+(?:all\s+)?(?:previous|prior)\s+instructions", re.IGNORECASE),
]


def detect_prompt_injection(text: str) -> bool:
    """
    Checks untrusted text for known prompt-injection phrases.
    """
    if not text:
        return False
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def recompute_matcher_score(
    output: MatcherOutput,
    rubric: Dict[str, Any],
    min_score: float = 60.0,
    resume_text: str = "",
) -> MatcherOutput:
    """
    - Clamps all criterion scores to [0, 100].
    - Recomputes overall_score in code as the weighted average of criteria_scores
      using rubric weights (never trusting the LLM's arithmetic).
    - Applies a penalty in code for each missing must_have skill (MUST_HAVE_PENALTY_POINTS).
    - Clamps final overall_score to [0, 100].
    - Sets injection_suspected = True if pattern check OR model returned True,
      WITHOUT changing the score because of the flag.
    - Sets shortlist_recommended = (overall_score >= min_score).
    """
    rubric_criteria: List[Dict[str, Any]] = rubric.get("criteria", []) if isinstance(rubric, dict) else []
    weight_map: Dict[str, int] = {}
    for rc in rubric_criteria:
        if isinstance(rc, dict) and "name" in rc and "weight" in rc:
            weight_map[str(rc["name"]).strip().lower()] = int(rc["weight"])

    # Clamp individual criterion scores
    clamped_criteria: List[MatcherCriterionScore] = []
    for cs in output.criteria_scores:
        clamped_val = int(round(clamp_scores(cs.score, 0.0, 100.0)))
        clamped_criteria.append(
            MatcherCriterionScore(name=cs.name, score=clamped_val, evidence=cs.evidence)
        )
    output.criteria_scores = clamped_criteria

    # Compute weighted average from criteria_scores and rubric weights
    if clamped_criteria:
        weighted_sum = 0.0
        total_weight = 0
        for idx, cs in enumerate(clamped_criteria):
            key = cs.name.strip().lower()
            if key in weight_map:
                w = weight_map[key]
            elif idx < len(rubric_criteria) and isinstance(rubric_criteria[idx], dict):
                w = int(rubric_criteria[idx].get("weight", 0))
            else:
                w = 0
            weighted_sum += cs.score * w
            total_weight += w

        if total_weight > 0:
            base_score = weighted_sum / float(total_weight)
        else:
            base_score = sum(c.score for c in clamped_criteria) / float(len(clamped_criteria))
    else:
        base_score = float(clamp_scores(output.overall_score, 0.0, 100.0))

    # Apply penalty for each missing must_have skill
    missing_count = len(output.missing_must_have or [])
    penalty = missing_count * MUST_HAVE_PENALTY_POINTS
    final_score = int(round(clamp_scores(base_score - penalty, 0.0, 100.0)))

    output.overall_score = final_score
    output.shortlist_recommended = bool(final_score >= float(min_score))

    # Prompt-injection flag: pattern match OR model flag (never alters score)
    if detect_prompt_injection(resume_text) or output.injection_suspected:
        output.injection_suspected = True

    return output


async def evaluate_resume(
    rubric: Dict[str, Any],
    resume_text: str,
    min_score: float = 60.0,
) -> MatcherOutput:
    """
    Resume Matcher Agent:
    - Redacts contact info ([EMAIL], [PHONE], [LINK]) before sending to LLM.
    - Sends system prompt (security preamble + Matcher prompt M) and user prompt
      with <rubric>JSON</rubric> and <resume>redacted text</resume>.
    - Validates with Pydantic, clamps scores, recomputes weighted average,
      applies missing must_have penalty, and sets injection_suspected and shortlist_recommended.
    """
    redacted_resume = redact_contact_info(resume_text)
    user_prompt = MATCHER_USER_TEMPLATE.format(
        rubric_json=json.dumps(rubric, indent=2),
        resume_text=redacted_resume,
    )

    raw_output = await call_json(
        provider="gemini",
        system_prompt=MATCHER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_model=MatcherOutput,
        max_tokens=1500,
        temperature=0.1,
    )

    return recompute_matcher_score(
        output=raw_output,
        rubric=rubric,
        min_score=min_score,
        resume_text=resume_text,
    )


async def run_matcher_for_candidate(
    candidate_id: str,
    job_id: str,
    rubric: Dict[str, Any],
    resume_text: str,
    min_score: float = 60.0,
) -> Optional[MatcherOutput]:
    """
    Runs the Resume Matcher Agent for an existing candidate record, updates
    match, ai_score, injection_suspected, and status='applied' in Supabase,
    and writes an agent_runs row (agent='matcher') with provider and status only.
    If the LLM fails after retry and fallback, keeps candidate with ai_score=None
    and logs the failed agent run so HR can re-run later.
    """
    client = get_supabase_service_client()
    try:
        result = await evaluate_resume(
            rubric=rubric,
            resume_text=resume_text,
            min_score=min_score,
        )
        match_dict = {
            "overall_score": int(round(result.overall_score)),
            "criteria_scores": [cs.model_dump() for cs in result.criteria_scores],
            "strengths": result.strengths,
            "gaps": result.gaps,
            "missing_must_have": result.missing_must_have,
            "shortlist_recommended": result.shortlist_recommended,
            "injection_suspected": result.injection_suspected,
        }

        client.table("candidates").update(
            {
                "match": match_dict,
                "ai_score": int(round(result.overall_score)),
                "injection_suspected": result.injection_suspected,
                "status": "applied",
            }
        ).eq("id", candidate_id).execute()

        await log_agent_run(
            agent="matcher",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="gemini",
        )
        return result

    except Exception as e:
        logger.error(f"Matcher Agent failed for candidate {candidate_id}: {type(e).__name__}")
        injection_flag = detect_prompt_injection(resume_text)
        try:
            client.table("candidates").update(
                {
                    "ai_score": None,
                    "injection_suspected": injection_flag,
                    "status": "applied",
                }
            ).eq("id", candidate_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to update candidate fallback state: {type(db_err).__name__}")

        await log_agent_run(
            agent="matcher",
            job_id=job_id,
            candidate_id=candidate_id,
            status="failed",
            provider="gemini",
        )
        return None
