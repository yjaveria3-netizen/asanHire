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
    Background task that loads candidate (via MCP get_candidate), job rubric
    (via MCP get_job_rubric), interview transcript/scores, and proctor trust_score
    (via MCP get_trust_score), runs the Supervisor Agent, saves to public.reports
    (via MCP save_report), and writes an agent_runs row (agent='supervisor').
    """
    from app.mcp_server import call_mcp_tool

    client = get_supabase_service_client()
    job_id: Optional[str] = None

    try:
        try:
            cand_info = await call_mcp_tool("get_candidate", {"candidate_id": candidate_id})
        except Exception:
            return None
        if not cand_info:
            return None

        job_id = str(cand_info.get("job_id")) if cand_info.get("job_id") else None

        rubric: Dict[str, Any] = {}
        if job_id:
            try:
                job_info = await call_mcp_tool("get_job_rubric", {"job_id": job_id})
                if isinstance(job_info, dict) and isinstance(job_info.get("rubric"), dict):
                    rubric = job_info["rubric"]
            except Exception:
                pass

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

        proctor_summary: Dict[str, Any] = {
            "trust_score": int(int_row.get("trust_score", 100)),
            "event_counts": {},
        }
        if resolved_interview_id:
            trust_info = await call_mcp_tool("get_trust_score", {"interview_id": resolved_interview_id})
            if isinstance(trust_info, dict):
                proctor_summary = {
                    "trust_score": int(trust_info.get("trust_score", 100)),
                    "event_counts": trust_info.get("event_counts") or {},
                }

        report_out = await generate_evaluation_report(
            rubric=rubric,
            match_data=cand_info.get("match") if isinstance(cand_info.get("match"), dict) else {},
            transcript=transcript,
            scores=scores,
            proctor_summary=proctor_summary,
        )

        saved_report = await call_mcp_tool(
            "save_report",
            {
                "candidate_id": candidate_id,
                "report_json": report_out.model_dump(),
            },
        )

        await log_agent_run(
            agent="supervisor",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="gemini",
        )
        return saved_report

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
