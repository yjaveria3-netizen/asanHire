import pytest
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from unittest.mock import patch
from fastmcp import Client

from app.mcp_server import mcp, call_mcp_tool


class FakeQuery:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]], table_name: str):
        self.store = store
        self.table_name = table_name
        self._filters: List[Any] = []
        self._op = "select"
        self._payload: Any = None
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._limit_val: int | None = None

    def select(self, *_args, **_kwargs):
        self._op = "select"
        return self

    def insert(self, payload: Any):
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: Dict[str, Any]):
        self._op = "update"
        self._payload = payload
        return self

    def eq(self, col: str, val: Any):
        self._filters.append(lambda r: str(r.get(col)) == str(val))
        return self

    def order(self, col: str, desc: bool = False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def execute(self):
        rows = self.store.setdefault(self.table_name, [])
        if self._op == "insert":
            items = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for item in items:
                row = dict(item)
                row.setdefault("id", f"{self.table_name}-{len(rows) + 1}")
                row.setdefault("created_at", datetime.now(timezone.utc).isoformat())
                rows.append(row)
                inserted.append(row)
            return type("Resp", (), {"data": inserted})()

        matched = [r for r in rows if all(f(r) for f in self._filters)]

        if self._op == "update":
            updated = []
            for r in matched:
                r.update(self._payload)
                updated.append(dict(r))
            return type("Resp", (), {"data": updated})()

        result = [dict(r) for r in matched]
        if self._order_col:
            result.sort(key=lambda r: r.get(self._order_col) or "", reverse=self._order_desc)
        if self._limit_val is not None:
            result = result[: self._limit_val]
        return type("Resp", (), {"data": result})()


class FakeSupabaseClient:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]]):
        self.store = store

    def table(self, name: str):
        return FakeQuery(self.store, name)


def _build_mcp_store() -> Dict[str, List[Dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    return {
        "jobs": [
            {
                "id": "job-mcp-1",
                "owner_id": "hr-1",
                "title": "Staff AI Engineer",
                "status": "open",
                "top_n": 2,
                "min_score": 70,
                "rubric": {
                    "criteria": [
                        {"name": "Python & FastMCP", "weight": 60, "description": "MCP architecture"},
                        {"name": "Security", "weight": 40, "description": "Prompt injection defenses"},
                    ],
                    "must_have": ["Python"],
                    "nice_to_have": ["Docker"],
                    "red_flags": [],
                    "Suggested_questions_seed": ["How do you isolate agent tools?"],
                },
            }
        ],
        "candidates": [
            {
                "id": "cand-mcp-1",
                "job_id": "job-mcp-1",
                "name": "Alice Security",
                "email": "alice.secret@example.com",
                "resume_text": (
                    "Alice Security\nEmail: alice.secret@example.com\nPhone: +1-555-867-5309\n"
                    "GitHub: https://github.com/alicesec\n"
                    "8 years building Python microservices, FastMCP servers, and LLM guardrails."
                ),
                "status": "applied",
                "ai_score": 88,
                "hr_score_override": None,
                "match": {
                    "overall_score": 88,
                    "strengths": ["Python", "FastMCP"],
                    "gaps": ["Kubernetes"],
                },
                "injection_suspected": False,
                "created_at": (now - timedelta(hours=3)).isoformat(),
            },
            {
                "id": "cand-mcp-2",
                "job_id": "job-mcp-1",
                "name": "Bob Override",
                "email": "bob.secret@example.com",
                "resume_text": "Bob Override\nbob.secret@example.com\nDistributed systems engineer.",
                "status": "applied",
                "ai_score": 60,
                "hr_score_override": 95,
                "match": {"overall_score": 60, "strengths": ["Go"], "gaps": []},
                "injection_suspected": False,
                "created_at": (now - timedelta(hours=1)).isoformat(),
            },
        ],
        "interviews": [
            {
                "id": "int-mcp-1",
                "candidate_id": "cand-mcp-1",
                "token_hash": "hash-123",
                "status": "in_progress",
                "trust_score": 100,
                "transcript": [],
                "scores": [],
                "voided": False,
            }
        ],
        "proctor_events": [],
        "reports": [],
        "email_log": [],
        "agent_runs": [],
        "audit_log": [],
    }


@pytest.mark.asyncio
async def test_mcp_exposed_tools_allowlist_and_no_decision_tools():
    """
    Verifies that mcp_server exposes ONLY the 8 permitted tools and NEVER exposes
    tools that change status to hired/rejected or send decision emails.
    """
    async with Client(mcp) as client:
        tools = await client.list_tools()
        tool_names = {t.name for t in tools}

    expected_tools = {
        "get_job_rubric",
        "get_candidate",
        "get_ranked_candidates",
        "save_score",
        "log_proctor_event",
        "get_trust_score",
        "save_report",
        "send_invite_email",
    }
    assert tool_names == expected_tools

    # Explicitly verify forbidden decision/status tools do not exist
    forbidden_substrings = ("hire", "reject", "decision", "override_status", "set_status")
    for name in tool_names:
        for forbidden in forbidden_substrings:
            assert forbidden not in name.lower()


@pytest.mark.asyncio
async def test_all_eight_mcp_tools_pii_redaction_and_agent_runs():
    """
    Exercises all 8 FastMCP tools through the FastMCP client, verifying:
    - get_candidate strips email, phone, and links from resume_summary and response dict
    - get_ranked_candidates orders by effective_score (respecting hr_score_override)
    - save_score, log_proctor_event, get_trust_score, save_report, send_invite_email
      validate with Pydantic and write agent_runs rows.
    """
    store = _build_mcp_store()
    fake_db = FakeSupabaseClient(store)

    with patch("app.mcp_server.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.scheduling.get_supabase_service_client", return_value=fake_db), \
         patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
         patch("app.services.audit.get_supabase_service_client", return_value=fake_db), \
         patch("app.core.llm.get_supabase_service_client", return_value=fake_db):

        # 1. get_job_rubric
        rubric_res = await call_mcp_tool("get_job_rubric", {"job_id": "job-mcp-1"})
        assert rubric_res["job_id"] == "job-mcp-1"
        assert rubric_res["top_n"] == 2
        assert "criteria" in rubric_res["rubric"]

        # 2. get_candidate (MUST NEVER expose email or phone)
        cand_res = await call_mcp_tool("get_candidate", {"candidate_id": "cand-mcp-1"})
        assert cand_res["candidate_id"] == "cand-mcp-1"
        assert "email" not in cand_res
        assert "phone" not in cand_res
        serialized = str(cand_res)
        assert "alice.secret@example.com" not in serialized
        assert "555-867-5309" not in serialized
        assert "github.com/alicesec" not in serialized
        assert "Python" in cand_res["resume_summary"]

        # 3. get_ranked_candidates (Bob has hr_score_override=95 > Alice ai_score=88)
        ranked_res = await call_mcp_tool("get_ranked_candidates", {"job_id": "job-mcp-1"})
        assert [c["candidate_id"] for c in ranked_res] == ["cand-mcp-2", "cand-mcp-1"]
        assert ranked_res[0]["effective_score"] == 95.0
        assert "email" not in ranked_res[0]

        # 4. save_score
        score_payload = {
            "overall_score": 91,
            "criteria_scores": [{"name": "Python & FastMCP", "score": 92, "evidence": "Built FastMCP tools"}],
            "strengths": ["FastMCP"],
            "gaps": [],
            "missing_must_have": [],
            "shortlist_recommended": True,
            "injection_suspected": False,
        }
        save_score_res = await call_mcp_tool(
            "save_score",
            {"candidate_id": "cand-mcp-1", "score_json": score_payload},
        )
        assert save_score_res["ai_score"] == 91
        cand1_row = next(c for c in store["candidates"] if c["id"] == "cand-mcp-1")
        assert cand1_row["ai_score"] == 91

        # 5. log_proctor_event (tab_hidden = -8, paste = -10 -> trust_score = 82)
        ev1 = await call_mcp_tool(
            "log_proctor_event",
            {"interview_id": "int-mcp-1", "event": {"type": "tab_hidden", "detail": "Hidden 2s"}},
        )
        assert ev1["trust_score"] == 92
        ev2 = await call_mcp_tool(
            "log_proctor_event",
            {"interview_id": "int-mcp-1", "event": {"type": "paste", "detail": "Pasted 80 chars"}},
        )
        assert ev2["trust_score"] == 82

        # 6. get_trust_score
        trust_res = await call_mcp_tool("get_trust_score", {"interview_id": "int-mcp-1"})
        assert trust_res["trust_score"] == 82
        assert trust_res["event_counts"] == {"tab_hidden": 1, "paste": 1}

        # 7. save_report
        report_payload = {
            "summary": "Strong technical performance on MCP security.",
            "interview_score": 89,
            "strengths": ["Deep FastMCP expertise"],
            "weaknesses": ["Minor paste event"],
            "evidence": [{"claim": "Strong MCP security architecture", "source": "transcript Q1"}],
            "proctoring_note": "Trust score 82 (1 tab_hidden, 1 paste).",
            "recommendation": "advance",
            "recommendation_reason": "Exceeds bar on all core criteria.",
            "hr_should_verify": ["Discuss paste event"],
            "injection_suspected": False,
        }
        rep_res = await call_mcp_tool(
            "save_report",
            {"candidate_id": "cand-mcp-1", "report_json": report_payload},
        )
        assert rep_res["version"] == 1
        assert rep_res["recommendation"] == "advance"
        assert cand1_row["status"] == "interviewed"

        # 8. send_invite_email (invite only)
        inv_res = await call_mcp_tool("send_invite_email", {"candidate_id": "cand-mcp-2"})
        assert inv_res["candidate_id"] == "cand-mcp-2"
        assert inv_res["status"] == "invited"
        assert len(store["email_log"]) == 1
        assert store["email_log"][0]["template"] == "invite"

        # Verify every MCP tool invocation logged an agent_runs entry
        mcp_agent_names = [r["agent"] for r in store["agent_runs"]]
        for expected_agent in (
            "mcp:get_job_rubric",
            "mcp:get_candidate",
            "mcp:get_ranked_candidates",
            "mcp:save_score",
            "mcp:log_proctor_event",
            "mcp:get_trust_score",
            "mcp:save_report",
            "mcp:send_invite_email",
        ):
            assert expected_agent in mcp_agent_names


@pytest.mark.asyncio
async def test_mcp_pydantic_validation_rejects_invalid_inputs():
    """
    Verifies that Pydantic input validation rejects invalid event types,
    empty IDs, or malformed score/report payloads.
    """
    store = _build_mcp_store()
    fake_db = FakeSupabaseClient(store)

    with patch("app.mcp_server.get_supabase_service_client", return_value=fake_db):
        # Disallowed proctor event type
        with pytest.raises(Exception):
            await call_mcp_tool(
                "log_proctor_event",
                {"interview_id": "int-mcp-1", "event": {"type": "screen_share_hack"}},
            )

        # Empty job_id
        with pytest.raises(Exception):
            await call_mcp_tool("get_job_rubric", {"job_id": ""})
