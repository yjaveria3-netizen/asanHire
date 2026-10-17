import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limit import limiter
from app.core.security import get_hr_user, HRUser
from app.services.scheduler import scheduler, check_and_schedule_due_jobs

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

    def select(self, *args, **kwargs):
        return self

    def eq(self, col: str, val: Any):
        self._filters.append((col, val))
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
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

        return FakeSupabaseResponse([dict(r) for r in matched])


class FakeSupabaseClient:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]]):
        self.store = store

    def table(self, name: str) -> FakeTableQuery:
        return FakeTableQuery(self.store, name)


def _build_scheduling_store() -> Dict[str, List[Dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    past_deadline = (now - timedelta(hours=2)).isoformat()
    future_deadline = (now + timedelta(hours=24)).isoformat()

    return {
        "jobs": [
            {
                "id": "job-due",
                "owner_id": "hr-1",
                "title": "AI Platform Engineer",
                "status": "open",
                "auto_invite": True,
                "deadline": past_deadline,
                "top_n": 2,
                "min_score": 70,
                "scheduler_ran_at": None,
            },
            {
                "id": "job-future",
                "owner_id": "hr-1",
                "title": "Future Role",
                "status": "open",
                "auto_invite": True,
                "deadline": future_deadline,
                "top_n": 2,
                "min_score": 70,
                "scheduler_ran_at": None,
            },
            {
                "id": "job-manual-only",
                "owner_id": "hr-1",
                "title": "Manual Invite Role",
                "status": "open",
                "auto_invite": False,
                "deadline": past_deadline,
                "top_n": 2,
                "min_score": 70,
                "scheduler_ran_at": None,
            },
        ],
        "candidates": [
            # Candidate 1: ai_score=80, applied later -> tie-break loser against cand-2
            {
                "id": "cand-1",
                "job_id": "job-due",
                "name": "Later Tie Candidate",
                "email": "later@example.com",
                "status": "shortlisted",
                "ai_score": 80,
                "hr_score_override": None,
                "created_at": (now - timedelta(hours=3)).isoformat(),
            },
            # Candidate 2: ai_score=80, applied earlier -> tie-break winner
            {
                "id": "cand-2",
                "job_id": "job-due",
                "name": "Earlier Tie Candidate",
                "email": "earlier@example.com",
                "status": "applied",
                "ai_score": 80,
                "hr_score_override": None,
                "created_at": (now - timedelta(hours=5)).isoformat(),
            },
            # Candidate 3: ai_score=50, but hr_score_override=92 -> effective_score=92 (#1 rank)
            {
                "id": "cand-3",
                "job_id": "job-due",
                "name": "HR Overridden Star",
                "email": "star@example.com",
                "status": "applied",
                "ai_score": 50,
                "hr_score_override": 92,
                "created_at": (now - timedelta(hours=1)).isoformat(),
            },
            # Candidate 4: below min_score (65 < 70)
            {
                "id": "cand-4",
                "job_id": "job-due",
                "name": "Below Min Score",
                "email": "low@example.com",
                "status": "applied",
                "ai_score": 65,
                "hr_score_override": None,
                "created_at": (now - timedelta(hours=6)).isoformat(),
            },
            # Candidate 5: high score but status='rejected' (not in applied/shortlisted)
            {
                "id": "cand-5",
                "job_id": "job-due",
                "name": "Already Rejected",
                "email": "rejected@example.com",
                "status": "rejected",
                "ai_score": 99,
                "hr_score_override": None,
                "created_at": (now - timedelta(hours=8)).isoformat(),
            },
        ],
        "interviews": [],
        "email_log": [],
        "agent_runs": [],
        "audit_log": [],
    }


@pytest.mark.asyncio
async def test_periodic_scheduler_finds_due_jobs_and_invites_top_n_with_tie_break():
    store = _build_scheduling_store()
    fake_db = FakeSupabaseClient(store)
    captured_urls: List[str] = []

    orig_send = __import__("app.services.email", fromlist=["send_templated_email"]).send_templated_email

    async def spy_send_email(recipient_email, template_type, context, candidate_id=None, sent_by="system:scheduling_agent", **kwargs):
        captured_urls.append(context["interview_url"])
        return await orig_send(
            recipient_email=recipient_email,
            template_type=template_type,
            context=context,
            candidate_id=candidate_id,
            sent_by=sent_by,
            **kwargs,
        )

    with patch("app.services.scheduler.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.scheduling.get_supabase_service_client", return_value=fake_db), \
         patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
         patch("app.services.audit.get_supabase_service_client", return_value=fake_db), \
         patch("app.core.llm.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.scheduling.send_templated_email", side_effect=spy_send_email):
        results = await check_and_schedule_due_jobs()

    # Only job-due should have run
    assert len(results) == 1
    res = results[0]
    assert res["job_id"] == "job-due"
    assert res["invited_count"] == 2
    # Top 2 must be cand-3 (effective_score=92) and cand-2 (score=80, earlier application than cand-1)
    assert res["invited_candidate_ids"] == ["cand-3", "cand-2"]

    # Verify scheduler_ran_at is set on job-due
    job_due = next(j for j in store["jobs"] if j["id"] == "job-due")
    assert job_due["scheduler_ran_at"] is not None

    # Verify interview rows store ONLY SHA-256(token), never the raw token
    assert len(store["interviews"]) == 2
    assert len(captured_urls) == 2
    for idx, url in enumerate(captured_urls):
        assert "/interview/" in url
        raw_tok = url.rsplit("/interview/", 1)[1]
        expected_hash = hashlib.sha256(raw_tok.encode("utf-8")).hexdigest()
        assert store["interviews"][idx]["token_hash"] == expected_hash
        assert raw_tok not in str(store["interviews"][idx])

    # Verify email_log, agent_runs (scheduling + MCP tool calls), and audit_log (actor='system:scheduling_agent')
    assert len(store["email_log"]) == 2
    assert all(e["template"] == "invite" for e in store["email_log"])
    sched_runs = [a for a in store["agent_runs"] if a["agent"] == "scheduling"]
    mcp_runs = [a for a in store["agent_runs"] if str(a["agent"]).startswith("mcp:")]
    assert len(sched_runs) == 2
    assert len(mcp_runs) >= 4  # get_job_rubric + get_ranked_candidates + 2x send_invite_email
    invite_audits = [a for a in store["audit_log"] if a["action"] == "candidate_invited"]
    assert len(invite_audits) == 2
    assert all(a["actor"] == "system:scheduling_agent" for a in invite_audits)

    # Re-running check_and_schedule_due_jobs must skip job-due since scheduler_ran_at is now set
    with patch("app.services.scheduler.get_supabase_service_client", return_value=fake_db):
        second_run = await check_and_schedule_due_jobs()
        assert second_run == []


def test_hr_run_scheduler_invite_and_cancel_invite_endpoints():
    store = _build_scheduling_store()
    fake_db = FakeSupabaseClient(store)

    app.dependency_overrides[get_hr_user] = lambda: HRUser(id="hr-1", email="hr1@example.com")
    try:
        with patch("app.api.hr.get_supabase_service_client", return_value=fake_db), \
             patch("app.core.security.get_supabase_service_client", return_value=fake_db), \
             patch("app.agents.scheduling.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.audit.get_supabase_service_client", return_value=fake_db), \
             patch("app.core.llm.get_supabase_service_client", return_value=fake_db):

            # 1. Manual POST /hr/jobs/{id}/run-scheduler on job-manual-only
            r_sched = client.post("/hr/jobs/job-manual-only/run-scheduler")
            assert r_sched.status_code == 200
            assert r_sched.json()["job_id"] == "job-manual-only"

            # 2. Manual POST /hr/candidates/{id}/invite works for ANY candidate (even cand-5 'rejected')
            r_inv1 = client.post("/hr/candidates/cand-5/invite", json={"send_email": True})
            assert r_inv1.status_code == 200
            assert r_inv1.json()["status"] == "invited"
            cand5 = next(c for c in store["candidates"] if c["id"] == "cand-5")
            assert cand5["status"] == "invited"
            assert len(store["interviews"]) == 1
            first_token_hash = store["interviews"][0]["token_hash"]
            assert store["interviews"][0]["voided"] is False

            # 3. Resend invite via POST /hr/candidates/{id}/invite generates new token & voids old one
            r_inv2 = client.post("/hr/candidates/cand-5/invite", json={"send_email": True})
            assert r_inv2.status_code == 200
            assert len(store["interviews"]) == 2
            assert store["interviews"][0]["voided"] is True
            assert store["interviews"][1]["voided"] is False
            assert store["interviews"][1]["token_hash"] != first_token_hash

            # 4. Cancel invite via POST /hr/candidates/{id}/cancel-invite voids token and sets status='shortlisted'
            r_cancel = client.post(
                "/hr/candidates/cand-5/cancel-invite",
                json={"reason": "Scheduled in error"},
            )
            assert r_cancel.status_code == 200
            assert r_cancel.json() == {"candidate_id": "cand-5", "status": "shortlisted"}
            assert cand5["status"] == "shortlisted"
            assert all(i["voided"] is True for i in store["interviews"])

            # Verify another HR user (hr-2) gets 404 on all three endpoints
            app.dependency_overrides[get_hr_user] = lambda: HRUser(id="hr-2", email="hr2@example.com")
            assert client.post("/hr/jobs/job-due/run-scheduler").status_code == 404
            assert client.post("/hr/candidates/cand-5/invite").status_code == 404
            assert client.post("/hr/candidates/cand-5/cancel-invite").status_code == 404
    finally:
        app.dependency_overrides.clear()
