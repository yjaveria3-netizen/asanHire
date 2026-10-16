import json
import logging
from typing import List, Dict, Any, Optional
from collections import Counter
from app.core.llm import call_json, clamp_scores, log_agent_run
from app.core.db import get_supabase_service_client
from app.prompts import SUPERVISOR_SYSTEM_PROMPT, SUPERVISOR_USER_TEMPLATE
from app.models.schemas import SupervisorReportOutput

logger = logging.getLogger("asanhire.agents.supervisor")


async def generate_evaluation_report(
    rubric: Dict[str, Any],
    match_data: Dict[str, Any],
    transcript: List[Dict[str, Any]],
    scores: List[Dict[str, Any]],
    proctor_summary: Dict[str, Any],
) -> SupervisorReportOutput:
    """
    Evaluation Supervisor Agent: Synthesizes rubric, resume match, interview
    transcript + per-answer scores, and proctoring telemetry into a decision-support
    report for HR using Gemini (Prompt S).
    """
    transcript_payload = {
        "turns": transcript,
        "per_answer_scores": scores,
    }
    user_prompt = SUPERVISOR_USER_TEMPLATE.format(
        rubric_json=json.dumps(rubric or {}, indent=2),
        match_json=json.dumps(match_data or {}, indent=2),
        transcript_json=json.dumps(transcript_payload, indent=2),
        proctor_json=json.dumps(proctor_summary or {}, indent=2),
    )

    report = await call_json(
        provider="gemini",
        system_prompt=SUPERVISOR_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_model=SupervisorReportOutput,
        max_tokens=1500,
        temperature=0.2,
    )

    # Recompute or clamp interview_score (0-100) from per-answer 0-10 scores if available
    if scores:
        numeric_scores = [
            clamp_scores(float(s.get("score", 0)), 0.0, 10.0)
            for s in scores
            if isinstance(s, dict) and s.get("score") is not None
        ]
        if numeric_scores:
            computed = int(round((sum(numeric_scores) / len(numeric_scores)) * 10.0))
            report.interview_score = int(clamp_scores(computed, 0.0, 100.0))
            report.overall_score = report.interview_score
    elif report.interview_score is not None:
        report.interview_score = int(round(clamp_scores(report.interview_score, 0.0, 100.0)))

    return report


async def run_supervisor_for_candidate(
    candidate_id: str,
    interview_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Background task that loads candidate, job rubric, interview transcript/scores,
    and proctor_events, runs the Supervisor Agent, saves to public.reports,
    and writes an agent_runs row (agent='supervisor').
    """
    client = get_supabase_service_client()
    job_id: Optional[str] = None

    try:
        cand_res = client.table("candidates").select("*").eq("id", candidate_id).execute()
        if not cand_res.data:
            return None
        cand_row = cand_res.data[0]
        job_id = str(cand_row.get("job_id")) if cand_row.get("job_id") else None

        rubric: Dict[str, Any] = {}
        if job_id:
            job_res = client.table("jobs").select("rubric").eq("id", job_id).execute()
            if job_res.data and isinstance(job_res.data[0].get("rubric"), dict):
                rubric = job_res.data[0]["rubric"]

        if interview_id:
            int_res = client.table("interviews").select("*").eq("id", interview_id).execute()
        else:
            int_res = (
                client.table("interviews")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

        int_row = int_res.data[0] if int_res.data else {}
        resolved_interview_id = str(int_row.get("id")) if int_row.get("id") else interview_id
        transcript = int_row.get("transcript") if isinstance(int_row.get("transcript"), list) else []
        scores = int_row.get("scores") if isinstance(int_row.get("scores"), list) else []
        trust_score = int(int_row.get("trust_score", 100))

        event_counts: Dict[str, int] = {}
        if resolved_interview_id:
            ev_res = (
                client.table("proctor_events")
                .select("type")
                .eq("interview_id", resolved_interview_id)
                .execute()
            )
            counts = Counter(e.get("type") for e in (ev_res.data or []) if e.get("type"))
            event_counts = dict(counts)

        proctor_summary = {
            "trust_score": trust_score,
            "event_counts": event_counts,
        }

        report_out = await generate_evaluation_report(
            rubric=rubric,
            match_data=cand_row.get("match") if isinstance(cand_row.get("match"), dict) else {},
            transcript=transcript,
            scores=scores,
            proctor_summary=proctor_summary,
        )

        # Determine next version number for candidate's reports
        existing_reports = (
            client.table("reports")
            .select("version")
            .eq("candidate_id", candidate_id)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        next_version = 1
        if existing_reports.data:
            next_version = int(existing_reports.data[0].get("version", 0)) + 1

        summary_payload = {
            "summary": report_out.summary,
            "interview_score": int(round(report_out.interview_score or 0)),
            "strengths": report_out.strengths,
            "weaknesses": report_out.weaknesses,
            "evidence": [e.model_dump() for e in report_out.evidence],
            "proctoring_note": report_out.proctoring_note,
            "recommendation": report_out.recommendation.lower(),
            "recommendation_reason": report_out.recommendation_reason,
            "hr_should_verify": report_out.hr_should_verify,
            "injection_suspected": report_out.injection_suspected,
        }

        rec = report_out.recommendation.lower()
        if rec not in {"advance", "hold", "reject"}:
            rec = {"hire": "advance", "reject": "reject", "hold": "hold"}.get(rec, "hold")

        report_row = {
            "candidate_id": candidate_id,
            "version": next_version,
            "summary": summary_payload,
            "interview_score": int(round(report_out.interview_score or 0)),
            "recommendation": rec,
        }
        saved = client.table("reports").insert(report_row).execute()

        if report_out.injection_suspected:
            client.table("candidates").update({"injection_suspected": True}).eq("id", candidate_id).execute()

        await log_agent_run(
            agent="supervisor",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="gemini",
        )
        return saved.data[0] if saved.data else report_row

    except Exception as e:
        logger.error(f"Supervisor Agent failed for candidate {candidate_id}: {type(e).__name__}")
        await log_agent_run(
            agent="supervisor",
            job_id=job_id,
            candidate_id=candidate_id,
            status="failed",
            provider="gemini",
        )
        return None
