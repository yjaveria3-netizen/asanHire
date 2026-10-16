import json
import logging
import sys
from collections import Counter
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field, field_validator
from fastmcp import FastMCP, Client

from app.core.db import get_supabase_service_client
from app.core.llm import log_agent_run, clamp_scores
from app.models.schemas import (
    MatcherOutput,
    SupervisorReportOutput,
    GuardianEventRequest,
)
from app.agents.interview import build_resume_summary
from app.agents.guardian import calculate_trust_score
from app.agents.scheduling import (
    compute_effective_score,
    _parse_created_at,
    invite_candidate_with_token,
)

logger = logging.getLogger("asanhire.mcp")

# Initialize FastMCP Server
# SECURITY RULE: Never expose tools that change status to hired/rejected/on_hold
# or send final decision emails.
mcp = FastMCP("asanHire-Agent-Tools")


def _get_db() -> Any:
    """
    Returns the Supabase service client, honoring unit-test mocks patched onto
    mcp_server or any agent module.
    """
    for mod_name in (
        "app.mcp_server",
        "app.agents.scheduling",
        "app.agents.supervisor",
        "app.agents.matcher",
        "app.agents.guardian",
    ):
        mod = sys.modules.get(mod_name)
        fn = getattr(mod, "get_supabase_service_client", None) if mod else None
        if fn is not None and fn is not get_supabase_service_client:
            return fn()
    return get_supabase_service_client()


# ============================================================================
# Pydantic Input Validation Models for MCP Tools
# ============================================================================

class GetJobRubricInput(BaseModel):
    job_id: str = Field(..., min_length=1, max_length=128)


class GetCandidateInput(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=128)


class GetRankedCandidatesInput(BaseModel):
    job_id: str = Field(..., min_length=1, max_length=128)


class SaveScoreInput(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=128)
    score_json: Union[Dict[str, Any], str]

    @field_validator("score_json", mode="before")
    @classmethod
    def parse_score_json(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, str):
            v = json.loads(v)
        if not isinstance(v, dict):
            raise ValueError("score_json must be a JSON object")
        return v


class LogProctorEventInput(BaseModel):
    interview_id: str = Field(..., min_length=1, max_length=128)
    event: Union[Dict[str, Any], str]

    @field_validator("event", mode="before")
    @classmethod
    def parse_event(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, str):
            v = json.loads(v)
        if not isinstance(v, dict):
            raise ValueError("event must be a JSON object")
        return v


class GetTrustScoreInput(BaseModel):
    interview_id: str = Field(..., min_length=1, max_length=128)


class SaveReportInput(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=128)
    report_json: Union[Dict[str, Any], str]

    @field_validator("report_json", mode="before")
    @classmethod
    def parse_report_json(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, str):
            v = json.loads(v)
        if not isinstance(v, dict):
            raise ValueError("report_json must be a JSON object")
        return v


class SendInviteEmailInput(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=128)


# ============================================================================
# FastMCP Tool Definitions (Strictly Scoped: No Hire/Reject/Decision Tools)
# ============================================================================

@mcp.tool()
async def get_job_rubric(job_id: str) -> Dict[str, Any]:
    """
    Fetches the job title, rubric, top_n, and min_score for a given job_id.
    Validates input with Pydantic and writes an agent_runs entry.
    """
    validated = GetJobRubricInput(job_id=job_id)
    client = _get_db()
    res = client.table("jobs").select("*").eq("id", validated.job_id).execute()
    if not res or not res.data:
        await log_agent_run(
            agent="mcp:get_job_rubric",
            job_id=validated.job_id,
            status="failed",
            provider="fastmcp",
        )
        raise ValueError(f"Job {validated.job_id} not found")

    job = res.data[0]
    await log_agent_run(
        agent="mcp:get_job_rubric",
        job_id=validated.job_id,
        status="success",
        provider="fastmcp",
    )
    return {
        "job_id": str(job["id"]),
        "title": job.get("title", ""),
        "rubric": job.get("rubric") or {},
        "top_n": int(job.get("top_n", 5)),
        "min_score": float(job.get("min_score", 60)),
        "status": job.get("status", "open"),
    }


@mcp.tool()
async def get_candidate(candidate_id: str) -> Dict[str, Any]:
    """
    Returns candidate evaluation data and a redacted resume summary.
    NEVER returns email, phone number, or personal links.
    """
    validated = GetCandidateInput(candidate_id=candidate_id)
    client = _get_db()
    res = client.table("candidates").select("*").eq("id", validated.candidate_id).execute()
    if not res or not res.data:
        await log_agent_run(
            agent="mcp:get_candidate",
            candidate_id=validated.candidate_id,
            status="failed",
            provider="fastmcp",
        )
        raise ValueError(f"Candidate {validated.candidate_id} not found")

    cand = res.data[0]
    job_id = str(cand.get("job_id")) if cand.get("job_id") else None
    match_data = cand.get("match") if isinstance(cand.get("match"), dict) else {}
    resume_summary = build_resume_summary(
        resume_text=str(cand.get("resume_text") or ""),
        match_data=match_data,
    )

    await log_agent_run(
        agent="mcp:get_candidate",
        job_id=job_id,
        candidate_id=validated.candidate_id,
        status="success",
        provider="fastmcp",
    )
    return {
        "candidate_id": str(cand["id"]),
        "job_id": job_id,
        "status": cand.get("status", "applied"),
        "ai_score": cand.get("ai_score"),
        "hr_score_override": cand.get("hr_score_override"),
        "effective_score": compute_effective_score(cand),
        "match": match_data,
        "resume_summary": resume_summary,
        "injection_suspected": bool(cand.get("injection_suspected", False)),
    }


@mcp.tool()
async def get_ranked_candidates(job_id: str) -> List[Dict[str, Any]]:
    """
    Returns candidates for job_id ranked by effective_score descending,
    breaking ties by earliest created_at ascending. Never exposes email or phone.
    """
    validated = GetRankedCandidatesInput(job_id=job_id)
    client = _get_db()
    res = client.table("candidates").select("*").eq("job_id", validated.job_id).execute()
    rows = res.data if (res and res.data) else []

    ranked = sorted(
        rows,
        key=lambda c: (
            compute_effective_score(c) is None,
            -(compute_effective_score(c) or -1.0),
            _parse_created_at(c.get("created_at")),
            str(c.get("id") or ""),
        ),
    )

    await log_agent_run(
        agent="mcp:get_ranked_candidates",
        job_id=validated.job_id,
        status="success",
        provider="fastmcp",
    )

    return [
        {
            "candidate_id": str(c["id"]),
            "job_id": str(c.get("job_id") or validated.job_id),
            "status": c.get("status", "applied"),
            "ai_score": c.get("ai_score"),
            "hr_score_override": c.get("hr_score_override"),
            "effective_score": compute_effective_score(c),
            "created_at": c.get("created_at"),
        }
        for c in ranked
    ]


@mcp.tool()
async def save_score(candidate_id: str, score_json: Union[Dict[str, Any], str]) -> Dict[str, Any]:
    """
    Validates score_json with Pydantic (MatcherOutput), updates the candidate's
    match, ai_score, and injection_suspected in Supabase, and writes agent_runs.
    """
    validated_in = SaveScoreInput(candidate_id=candidate_id, score_json=score_json)
    matcher_out = MatcherOutput.model_validate(validated_in.score_json)

    client = _get_db()
    cand_res = client.table("candidates").select("id, job_id").eq("id", validated_in.candidate_id).execute()
    job_id = str(cand_res.data[0].get("job_id")) if (cand_res and cand_res.data and cand_res.data[0].get("job_id")) else None

    match_dict = {
        "overall_score": int(round(matcher_out.overall_score)),
        "criteria_scores": [cs.model_dump() for cs in matcher_out.criteria_scores],
        "strengths": matcher_out.strengths,
        "gaps": matcher_out.gaps,
        "missing_must_have": matcher_out.missing_must_have,
        "shortlist_recommended": matcher_out.shortlist_recommended,
        "injection_suspected": matcher_out.injection_suspected,
    }

    client.table("candidates").update(
        {
            "match": match_dict,
            "ai_score": int(round(matcher_out.overall_score)),
            "injection_suspected": matcher_out.injection_suspected,
            "status": "applied",
        }
    ).eq("id", validated_in.candidate_id).execute()

    await log_agent_run(
        agent="mcp:save_score",
        job_id=job_id,
        candidate_id=validated_in.candidate_id,
        status="success",
        provider="fastmcp",
    )

    return {
        "candidate_id": validated_in.candidate_id,
        "ai_score": int(round(matcher_out.overall_score)),
        "shortlist_recommended": matcher_out.shortlist_recommended,
    }


@mcp.tool()
async def log_proctor_event(interview_id: str, event: Union[Dict[str, Any], str]) -> Dict[str, Any]:
    """
    Validates a proctor event against the allowlist with Pydantic, stores it in
    proctor_events, recomputes trust_score, and writes agent_runs.
    """
    validated_in = LogProctorEventInput(interview_id=interview_id, event=event)
    ev_req = GuardianEventRequest.model_validate(validated_in.event)
    clean_type, clean_detail = ev_req.get_validated_event()

    client = _get_db()
    int_res = client.table("interviews").select("id, candidate_id").eq("id", validated_in.interview_id).execute()
    candidate_id = str(int_res.data[0]["candidate_id"]) if (int_res and int_res.data) else None
    job_id: Optional[str] = None
    if candidate_id:
        c_res = client.table("candidates").select("job_id").eq("id", candidate_id).execute()
        if c_res and c_res.data and c_res.data[0].get("job_id"):
            job_id = str(c_res.data[0]["job_id"])

    insert_row: Dict[str, Any] = {
        "interview_id": validated_in.interview_id,
        "type": clean_type,
    }
    if clean_detail is not None:
        insert_row["detail"] = clean_detail

    client.table("proctor_events").insert(insert_row).execute()

    ev_res = client.table("proctor_events").select("type").eq("interview_id", validated_in.interview_id).execute()
    all_events = ev_res.data if (ev_res and ev_res.data) else [insert_row]
    new_trust = calculate_trust_score(all_events)

    client.table("interviews").update({"trust_score": new_trust}).eq("id", validated_in.interview_id).execute()

    await log_agent_run(
        agent="mcp:log_proctor_event",
        job_id=job_id,
        candidate_id=candidate_id,
        status="success",
        provider="fastmcp",
    )

    return {"interview_id": validated_in.interview_id, "trust_score": new_trust}


@mcp.tool()
async def get_trust_score(interview_id: str) -> Dict[str, Any]:
    """
    Computes and returns the current proctoring trust_score and event_counts
    for an interview_id, and logs agent_runs.
    """
    validated = GetTrustScoreInput(interview_id=interview_id)
    client = _get_db()

    int_res = client.table("interviews").select("id, candidate_id, trust_score").eq("id", validated.interview_id).execute()
    int_row = int_res.data[0] if (int_res and int_res.data) else {}
    candidate_id = str(int_row.get("candidate_id")) if int_row.get("candidate_id") else None
    job_id: Optional[str] = None
    if candidate_id:
        c_res = client.table("candidates").select("job_id").eq("id", candidate_id).execute()
        if c_res and c_res.data and c_res.data[0].get("job_id"):
            job_id = str(c_res.data[0]["job_id"])

    ev_res = client.table("proctor_events").select("type").eq("interview_id", validated.interview_id).execute()
    events = ev_res.data if (ev_res and ev_res.data) else []
    counts = dict(Counter(e.get("type") for e in events if e.get("type")))
    trust_score = calculate_trust_score(events) if events else int(int_row.get("trust_score", 100))

    await log_agent_run(
        agent="mcp:get_trust_score",
        job_id=job_id,
        candidate_id=candidate_id,
        status="success",
        provider="fastmcp",
    )

    return {
        "interview_id": validated.interview_id,
        "trust_score": trust_score,
        "event_counts": counts,
    }


@mcp.tool()
async def save_report(candidate_id: str, report_json: Union[Dict[str, Any], str]) -> Dict[str, Any]:
    """
    Validates report_json with Pydantic (SupervisorReportOutput), saves a new
    versioned report row in public.reports, sets candidate status to 'interviewed'
    (if not already a final decision), and writes agent_runs.
    """
    validated_in = SaveReportInput(candidate_id=candidate_id, report_json=report_json)
    report_out = SupervisorReportOutput.model_validate(validated_in.report_json)

    client = _get_db()
    cand_res = client.table("candidates").select("*").eq("id", validated_in.candidate_id).execute()
    cand_row = cand_res.data[0] if (cand_res and cand_res.data) else {}
    job_id = str(cand_row.get("job_id")) if cand_row.get("job_id") else None

    existing_reports = (
        client.table("reports")
        .select("version")
        .eq("candidate_id", validated_in.candidate_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    next_version = 1
    if existing_reports and existing_reports.data:
        next_version = int(existing_reports.data[0].get("version", 0)) + 1

    interview_score = int(round(clamp_scores(report_out.interview_score or report_out.overall_score or 0, 0.0, 100.0)))
    rec = (report_out.recommendation or "hold").strip().lower()
    if rec not in {"advance", "hold", "reject"}:
        rec = {"hire": "advance", "hired": "advance", "reject": "reject", "rejected": "reject", "hold": "hold"}.get(rec, "hold")

    summary_payload = {
        "summary": report_out.summary,
        "interview_score": interview_score,
        "strengths": report_out.strengths,
        "weaknesses": report_out.weaknesses,
        "evidence": [e.model_dump() for e in report_out.evidence],
        "proctoring_note": report_out.proctoring_note,
        "recommendation": rec,
        "recommendation_reason": report_out.recommendation_reason,
        "hr_should_verify": report_out.hr_should_verify,
        "injection_suspected": report_out.injection_suspected,
    }

    report_row = {
        "candidate_id": validated_in.candidate_id,
        "version": next_version,
        "summary": summary_payload,
        "interview_score": interview_score,
        "recommendation": rec,
    }
    saved = client.table("reports").insert(report_row).execute()

    cand_update: Dict[str, Any] = {}
    current_cand_status = str(cand_row.get("status") or "").lower()
    if current_cand_status not in {"interviewed", "hired", "rejected", "on_hold"}:
        cand_update["status"] = "interviewed"
    if report_out.injection_suspected:
        cand_update["injection_suspected"] = True
    if cand_update:
        client.table("candidates").update(cand_update).eq("id", validated_in.candidate_id).execute()

    await log_agent_run(
        agent="mcp:save_report",
        job_id=job_id,
        candidate_id=validated_in.candidate_id,
        status="success",
        provider="fastmcp",
    )

    return saved.data[0] if (saved and saved.data) else report_row


@mcp.tool()
async def send_invite_email(candidate_id: str) -> Dict[str, Any]:
    """
    Invite-only MCP tool: Generates a single-use interview token (storing only its
    SHA-256 hash), sets candidate status to 'invited', sends the fixed interview
    invitation email via Resend, and logs email_log + audit_log + agent_runs.
    Cannot send hire/reject/hold decision emails.
    """
    validated = SendInviteEmailInput(candidate_id=candidate_id)
    client = _get_db()

    cand_res = client.table("candidates").select("*").eq("id", validated.candidate_id).execute()
    if not cand_res or not cand_res.data:
        await log_agent_run(
            agent="mcp:send_invite_email",
            candidate_id=validated.candidate_id,
            status="failed",
            provider="fastmcp",
        )
        raise ValueError(f"Candidate {validated.candidate_id} not found")

    cand = cand_res.data[0]
    job_id = str(cand.get("job_id") or "")
    job_res = client.table("jobs").select("*").eq("id", job_id).execute()
    job = job_res.data[0] if (job_res and job_res.data) else {"id": job_id, "title": "Open Position"}

    owner_email: Optional[str] = None
    owner_id = job.get("owner_id") or job.get("created_by")
    if owner_id:
        try:
            admin_user = getattr(client, "auth", None)
            if admin_user and hasattr(admin_user, "admin"):
                user_res = admin_user.admin.get_user_by_id(str(owner_id))
                if user_res and getattr(user_res, "user", None) and getattr(user_res.user, "email", None):
                    owner_email = user_res.user.email
        except Exception:
            pass

    invite_result = await invite_candidate_with_token(
        candidate=cand,
        job=job,
        actor=owner_email or "system:scheduling_agent",
        reason="Auto-invited by Scheduling Agent",
        send_email=True,
        hr_sender_email=owner_email,
    )

    await log_agent_run(
        agent="mcp:send_invite_email",
        job_id=job_id,
        candidate_id=validated.candidate_id,
        status="success",
        provider="fastmcp",
    )

    return invite_result


# ============================================================================
# In-Process FastMCP Client Helper for Agents
# ============================================================================

async def call_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> Any:
    """
    Calls a tool registered on the FastMCP server through the FastMCP Client
    and returns the parsed JSON/dict payload.
    """
    async with Client(mcp) as client:
        res = await client.call_tool(tool_name, arguments)
        if hasattr(res, "data") and res.data is not None:
            return res.data
        if hasattr(res, "structured_content") and res.structured_content is not None:
            sc = res.structured_content
            if isinstance(sc, dict) and "result" in sc and len(sc) == 1:
                return sc["result"]
            return sc
        if hasattr(res, "content") and res.content:
            first = res.content[0]
            text = getattr(first, "text", None)
            if isinstance(text, str):
                try:
                    return json.loads(text)
                except Exception:
                    return text
        return res


if __name__ == "__main__":
    mcp.run()
