from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limit import limiter
from app.core.security import get_hr_user, HRUser
from app.models.schemas import SupervisorReportOutput, EvidenceItem
from app.agents.supervisor import run_supervisor_for_candidate

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_limiter():
    limiter._storage.reset()
    yield
    limiter._storage.reset()


class FakeSupabaseResponse:
    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


class FakeTableQuery:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]], table_name: str):
        self.store = store
        self.table_name = table_name
        self._filters = []
        self._update_payload = None
        self._insert_payload = None
        self._order_col = None
        self._order_desc = False
        self._limit_n = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, col: str, val: Any):
        self._filters.append((col, val))
        return self

    def order(self, col: str, desc: bool = False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    def update(self, payload: Dict[str, Any]):
        self._update_payload = payload
        return self

    def insert(self, payload: Dict[str, Any]):
        self._insert_payload = payload
        return self

    def execute(self) -> FakeSupabaseResponse:
        rows = self.store.setdefault(self.table_name, [])
        if self._insert_payload is not None:
            row = dict(self._insert_payload)
            row.setdefault("id", f"{self.table_name}-{len(rows) + 1}")
            rows.append(row)
            return FakeSupabaseResponse([row])

        matched = [
            r for r in rows
            if all(str(r.get(k)) == str(v) for k, v in self._filters)
        ]

        if self._update_payload is not None:
            for r in matched:
                r.update(self._update_payload)
            return FakeSupabaseResponse(matched)

        result = [dict(r) for r in matched]
        if self._order_col:
            result.sort(key=lambda x: x.get(self._order_col) or 0, reverse=self._order_desc)
        if self._limit_n is not None:
            result = result[: self._limit_n]
        return FakeSupabaseResponse(result)


class FakeSupabaseClient:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]]):
        self.store = store

    def table(self, name: str) -> FakeTableQuery:
        return FakeTableQuery(self.store, name)


def _make_hr_store() -> Dict[str, List[Dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    return {
        "jobs": [
            {
                "id": "job-1",
                "owner_id": "hr-1",
                "title": "Lead AI Architect",
                "status": "open",
                "rubric": {
                    "criteria": [
                        {"name": "System Design", "weight": 60, "description": "Distributed systems"},
                        {"name": "LLM Security", "weight": 40, "description": "Prompt injection defense"},
                    ]
                },
            }
        ],
        "candidates": [
            {
                "id": "cand-1",
                "job_id": "job-1",
                "name": "Amina <script>alert(1)</script> Malik",
                "email": "amina@example.com",
                "status": "invited",
                "ai_score": 76,
                "hr_score_override": None,
                "hr_score_note": None,
                "match": {"overall_score": 76, "strengths": ["FastAPI", "Postgres"], "gaps": []},
                "injection_suspected": False,
                "created_at": now.isoformat(),
            }
        ],
        "interviews": [
            {
                "id": "int-1",
                "candidate_id": "cand-1",
                "token_hash": "hash-1",
                "expires_at": (now + timedelta(hours=24)).isoformat(),
                "used_at": now.isoformat(),
                "status": "interviewed",
                "voided": False,
                "retry_allowed": False,
                "trust_score": 92,
                "transcript": [
                    {"role": "interviewer", "text": "How do you prevent prompt injection?", "action": "ask_next"},
                    {"role": "candidate", "text": "Isolate untrusted input in XML tags and validate JSON output."},
                ],
                "scores": [
                    {"criterion": "LLM Security", "score": 9, "evidence": "Clear defense-in-depth explanation"}
                ],
            }
        ],
        "proctor_events": [
            {"id": "ev-1", "interview_id": "int-1", "type": "tab_hidden", "detail": "1.2s"}
        ],
        "reports": [],
        "audit_log": [],
        "email_log": [],
        "agent_runs": [],
    }


@pytest.mark.asyncio
async def test_supervisor_agent_wraps_transcript_tags_stores_report_and_sets_interviewed():
    store = _make_hr_store()
    fake_db = FakeSupabaseClient(store)
    captured_prompts: List[str] = []

    async def fake_call_json(*, provider, system_prompt, user_prompt, schema_model, **kwargs):
        assert provider == "gemini"
        captured_prompts.append(user_prompt)
        return SupervisorReportOutput(
            summary="Strong understanding of LLM security and distributed systems.",
            interview_score=85,
            strengths=["Defense-in-depth prompt isolation", "Production FastAPI"],
            weaknesses=["Minor tab switch during interview"],
            evidence=[EvidenceItem(claim="Used XML tags and strict JSON validation", source="answer_1")],
            proctoring_note="1 tab_hidden event (trust_score 92); advisory only.",
            recommendation="advance",
            recommendation_reason="Solid technical evidence across criteria.",
            hr_should_verify=["Verify Kubernetes experience in final round"],
            injection_suspected=False,
        )

    with patch("app.agents.supervisor.get_supabase_service_client", return_value=fake_db), \
         patch("app.core.llm.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.supervisor.call_json", side_effect=fake_call_json):
        report_row = await run_supervisor_for_candidate("cand-1", "int-1")

    assert report_row is not None
    assert "<transcript>" in captured_prompts[0] and "</transcript>" in captured_prompts[0]
    assert "<proctor>" in captured_prompts[0] and "</proctor>" in captured_prompts[0]

    # Score recomputed from per-answer score 9/10 -> 90/100
    assert report_row["interview_score"] == 90
    assert report_row["recommendation"] == "advance"
    assert len(store["reports"]) == 1
    assert store["candidates"][0]["status"] == "interviewed"
    assert any(a["agent"] == "supervisor" and a["status"] == "success" for a in store["agent_runs"])


def test_hr_status_score_regenerate_retry_email_preview_and_decision_endpoints():
    store = _make_hr_store()
    fake_db = FakeSupabaseClient(store)

    async def fake_supervisor_call(*, provider, system_prompt, user_prompt, schema_model, **kwargs):
        return SupervisorReportOutput(
            summary="Regenerated report summary.",
            interview_score=88,
            strengths=["Strong architecture"],
            weaknesses=[],
            evidence=[EvidenceItem(claim="Clear design", source="answer_1")],
            proctoring_note="Clean",
            recommendation="advance",
            recommendation_reason="Recommended to advance.",
            hr_should_verify=["Check references"],
            injection_suspected=False,
        )

    app.dependency_overrides[get_hr_user] = lambda: HRUser(id="hr-1", email="hr1@example.com")
    try:
        with patch("app.api.hr.get_supabase_service_client", return_value=fake_db), \
             patch("app.core.security.get_supabase_service_client", return_value=fake_db), \
             patch("app.agents.supervisor.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.audit.get_supabase_service_client", return_value=fake_db), \
             patch("app.core.llm.get_supabase_service_client", return_value=fake_db), \
             patch("app.agents.supervisor.call_json", side_effect=fake_supervisor_call):

            # 1. PATCH /hr/candidates/{id}/status (any status to any status, reason required)
            r_stat = client.patch(
                "/hr/candidates/cand-1/status",
                json={"status": "shortlisted", "reason": "Moving back to shortlisted for review"},
            )
            assert r_stat.status_code == 200
            assert r_stat.json()["status"] == "shortlisted"
            assert store["candidates"][0]["status"] == "shortlisted"

            # Missing reason rejected with 422
            r_bad_stat = client.patch("/hr/candidates/cand-1/status", json={"status": "applied", "reason": "   "})
            assert r_bad_stat.status_code == 422

            # 2. PATCH /hr/candidates/{id}/score (override + note, preserves ai_score)
            r_score = client.patch(
                "/hr/candidates/cand-1/score",
                json={"score": 94, "note": "Strong open-source FastAPI contributions"},
            )
            assert r_score.status_code == 200
            assert r_score.json()["ai_score"] == 76
            assert r_score.json()["hr_score_override"] == 94
            assert r_score.json()["effective_score"] == 94

            # 3. POST /hr/candidates/{id}/report/regenerate
            r_regen = client.post("/hr/candidates/cand-1/report/regenerate")
            assert r_regen.status_code == 200
            assert r_regen.json()["version"] == 1
            assert len(store["reports"]) == 1

            # 4. POST /hr/candidates/{id}/allow-retry
            r_retry = client.post(
                "/hr/candidates/cand-1/allow-retry",
                json={"reason": "Browser audio permission issue"},
            )
            assert r_retry.status_code == 200
            assert r_retry.json()["retry_allowed"] is True
            assert store["interviews"][0]["used_at"] is None
            assert store["interviews"][0]["voided"] is False
            assert store["candidates"][0]["status"] == "invited"

            # 5. GET /hr/candidates/{id}/email-preview?type=hired|rejected|on_hold
            # Verify HTML-escaping of candidate name (<script> -> &lt;script&gt;) and no email sent
            r_prev = client.get("/hr/candidates/cand-1/email-preview?type=hired")
            assert r_prev.status_code == 200
            prev_body = r_prev.json()
            assert "&lt;script&gt;alert(1)&lt;/script&gt;" in prev_body["html_body"]
            assert "<script>" not in prev_body["html_body"]
            assert len(store["email_log"]) == 0

            # 6. POST /hr/candidates/{id}/decision with send_email=False -> sets status, writes audit_log, NO email sent
            r_dec1 = client.post(
                "/hr/candidates/cand-1/decision",
                json={"decision": "rejected", "reason": "Role paused initially", "send_email": False},
            )
            assert r_dec1.status_code == 200
            assert r_dec1.json()["status"] == "rejected"
            assert r_dec1.json()["email_sent"] is False
            assert len(store["email_log"]) == 0

            # 7. Changing a decision later (rejected -> hired) with send_email=True -> uses 'corrected_decision' template & logs email_log
            r_dec2 = client.post(
                "/hr/candidates/cand-1/decision",
                json={"decision": "hired", "reason": "Headcount approved after review", "send_email": True},
            )
            assert r_dec2.status_code == 200
            dec2_body = r_dec2.json()
            assert dec2_body["from_status"] == "rejected"
            assert dec2_body["status"] == "hired"
            assert dec2_body["email_sent"] is True
            assert dec2_body["template_used"] == "corrected_decision"
            assert len(store["email_log"]) == 1
            assert store["email_log"][0]["template"] == "corrected_decision"
    finally:
        app.dependency_overrides.clear()
