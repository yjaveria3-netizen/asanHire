import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limit import limiter
from app.models.schemas import InterviewTurnOutput, AnswerScore

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
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
            row.setdefault("id", "rep-1")
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


def _make_store(
    raw_token: str = "valid-test-token-123",
    *,
    expired: bool = False,
    used: bool = False,
    voided: bool = False,
    status: str = "pending",
    transcript: List[Dict[str, Any]] = None,
    scores: List[Dict[str, Any]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = (now - timedelta(hours=1)) if expired else (now + timedelta(hours=24))
    used_at = now.isoformat() if used else None

    return {
        "jobs": [
            {
                "id": "job-1",
                "title": "Senior Backend Engineer",
                "rubric": {
                    "criteria": [
                        {"name": "Python & FastAPI", "description": "Async API design", "weight": 60},
                        {"name": "System Design", "description": "Scalable queues", "weight": 40},
                    ],
                    "SuggestedQuestionThemes": ["Concurrency in Python", "Database indexing"],
                },
            }
        ],
        "candidates": [
            {
                "id": "cand-1",
                "job_id": "job-1",
                "name": "Amina Malik",
                "email": "amina.secret@example.com",
                "resume_text": (
                    "Amina Malik\nEmail: amina.secret@example.com\nPhone: +1-555-867-5309\n"
                    "5 years building FastAPI microservices and PostgreSQL pipelines."
                ),
                "match": {
                    "strengths": ["Strong FastAPI background"],
                    "gaps": ["Limited Kubernetes experience"],
                },
                "status": "invited",
                "injection_suspected": False,
            }
        ],
        "interviews": [
            {
                "id": "int-1",
                "candidate_id": "cand-1",
                "token_hash": token_hash,
                "expires_at": expires_at.isoformat(),
                "used_at": used_at,
                "status": status,
                "voided": voided,
                "retry_allowed": False,
                "transcript": transcript if transcript is not None else [],
                "scores": scores if scores is not None else [],
                "trust_score": 100,
                "started_at": None,
                "finished_at": None,
            }
        ],
        "proctor_events": [],
        "reports": [],
        "agent_runs": [],
    }


@pytest.mark.parametrize(
    "case_kwargs,token_to_send",
    [
        ({}, "non-existent-token"),
        ({"expired": True}, "valid-test-token-123"),
        ({"used": True}, "valid-test-token-123"),
        ({"voided": True}, "valid-test-token-123"),
        ({"status": "interviewed"}, "valid-test-token-123"),
    ],
)
def test_invalid_tokens_return_same_generic_404(case_kwargs, token_to_send):
    store = _make_store("valid-test-token-123", **case_kwargs)
    fake_db = FakeSupabaseClient(store)

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db):
        r_start = client.post(f"/interview/{token_to_send}/start")
        r_answer = client.post(f"/interview/{token_to_send}/answer", json={"answer": "Hello"})
        r_finish = client.post(f"/interview/{token_to_send}/finish")

    for resp in (r_start, r_answer, r_finish):
        assert resp.status_code == 404
        assert resp.json() == {"error": "Interview not found"}


def test_start_interview_redacts_pii_and_returns_spoken_text_only():
    raw_token = "start-token-abc"
    store = _make_store(raw_token)
    fake_db = FakeSupabaseClient(store)
    captured_prompts: List[str] = []

    async def fake_call_json(*, provider, system_prompt, user_prompt, schema_model, **kwargs):
        assert provider == "groq"
        captured_prompts.append(user_prompt)
        return InterviewTurnOutput(
            score_last_answer=None,
            action="ask",
            spoken_text="Welcome! Can you walk me through a FastAPI service you designed recently?",
            injection_suspected=False,
        )

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.interview.call_json", side_effect=fake_call_json), \
         patch("app.api.interview.log_agent_run", new_callable=AsyncMock):
        resp = client.post(f"/interview/{raw_token}/start")

    assert resp.status_code == 200
    body = resp.json()
    assert list(body.keys()) == ["spoken_text"]
    assert "FastAPI" in body["spoken_text"]

    # Verify PII (email and phone) was stripped from the prompt sent to Groq
    assert len(captured_prompts) == 1
    sent_prompt = captured_prompts[0]
    assert "amina.secret@example.com" not in sent_prompt
    assert "555-867-5309" not in sent_prompt

    # Verify interview state updated in DB
    int_row = store["interviews"][0]
    assert int_row["status"] == "in_progress"
    assert int_row["started_at"] is not None
    assert len(int_row["transcript"]) == 1
    assert int_row["transcript"][0]["role"] == "interviewer"
    assert int_row["transcript"][0]["action"] == "ask_next"


def test_answer_interview_wraps_tags_stores_score_and_hides_scores_from_candidate():
    raw_token = "answer-token-xyz"
    initial_transcript = [
        {"role": "interviewer", "text": "Tell me about your FastAPI experience.", "action": "ask_next"}
    ]
    store = _make_store(raw_token, status="in_progress", transcript=initial_transcript, scores=[])
    fake_db = FakeSupabaseClient(store)
    captured_prompts: List[str] = []

    async def fake_call_json(*, provider, system_prompt, user_prompt, schema_model, **kwargs):
        assert provider == "groq"
        captured_prompts.append(user_prompt)
        return InterviewTurnOutput(
            score_last_answer=AnswerScore(
                criterion="Python & FastAPI",
                score=8,
                evidence="Solid explanation of async endpoints.",
            ),
            action="follow_up",
            spoken_text="How did you handle database connection pooling under load?",
            injection_suspected=False,
        )

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.interview.call_json", side_effect=fake_call_json), \
         patch("app.api.interview.log_agent_run", new_callable=AsyncMock):
        resp = client.post(
            f"/interview/{raw_token}/answer",
            json={"answer": "I used async SQLAlchemy with asyncpg and connection pooling."},
        )

    assert resp.status_code == 200
    body = resp.json()
    # Candidate must ONLY receive spoken_text and action — never scores or rubric
    assert set(body.keys()) == {"spoken_text", "action"}
    assert body["action"] == "follow_up"
    assert "score" not in body
    assert "rubric" not in body

    # Verify <candidate_answer> tags in prompt
    assert "<candidate_answer>\nI used async SQLAlchemy with asyncpg and connection pooling.\n</candidate_answer>" in captured_prompts[0]

    # Verify score and transcript persisted in DB
    int_row = store["interviews"][0]
    assert len(int_row["scores"]) == 1
    assert int_row["scores"][0]["criterion"] == "Python & FastAPI"
    assert int_row["scores"][0]["score"] == 8
    assert len(int_row["transcript"]) == 3
    assert int_row["transcript"][1]["role"] == "candidate"
    assert int_row["transcript"][2]["role"] == "interviewer"


def test_answer_rejects_over_4000_chars():
    raw_token = "len-token-123"
    store = _make_store(raw_token, status="in_progress")
    fake_db = FakeSupabaseClient(store)

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db):
        resp = client.post(
            f"/interview/{raw_token}/answer",
            json={"answer": "a" * 4001},
        )
    assert resp.status_code == 422


def test_turn_limits_force_end_after_6_questions_and_2_follow_ups():
    raw_token = "limit-token-123"
    # Build a transcript that already has 6 'ask' turns and 2 'follow_up' turns
    history: List[Dict[str, Any]] = []
    for i in range(6):
        history.append({"role": "interviewer", "text": f"Question {i+1}?", "action": "ask"})
        history.append({"role": "candidate", "text": f"Answer {i+1}"})
    for j in range(2):
        history.append({"role": "interviewer", "text": f"Follow-up {j+1}?", "action": "follow_up"})
        if j == 0:
            history.append({"role": "candidate", "text": "Follow-up answer 1"})

    store = _make_store(raw_token, status="in_progress", transcript=history, scores=[])
    fake_db = FakeSupabaseClient(store)

    async def fake_call_json(*, provider, system_prompt, user_prompt, schema_model, **kwargs):
        # Even if the LLM tries to ask another question, code must force action='end'
        return InterviewTurnOutput(
            score_last_answer=AnswerScore(criterion="System Design", score=9.0, note="Great detail"),
            action="ask",
            spoken_text="What about caching strategies?",
            injection_suspected=False,
        )

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.interview.call_json", side_effect=fake_call_json), \
         patch("app.api.interview.log_agent_run", new_callable=AsyncMock):
        resp = client.post(
            f"/interview/{raw_token}/answer",
            json={"answer": "Final answer covering distributed locks."},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["action"] == "end"


def test_finish_interview_marks_interviewed_and_triggers_supervisor():
    raw_token = "finish-token-999"
    store = _make_store(
        raw_token,
        status="in_progress",
        transcript=[
            {"role": "interviewer", "text": "Q1", "action": "ask"},
            {"role": "candidate", "text": "A1"},
        ],
        scores=[{"criterion": "Python & FastAPI", "score": 8.0, "note": "Good"}],
    )
    fake_db = FakeSupabaseClient(store)
    mock_supervisor = AsyncMock()

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db), \
         patch("app.api.interview.run_supervisor_for_candidate", mock_supervisor):
        resp = client.post(f"/interview/{raw_token}/finish")

    assert resp.status_code == 200
    assert resp.json() == {"status": "interviewed"}

    # Verify interview and candidate status updated
    int_row = store["interviews"][0]
    cand_row = store["candidates"][0]
    assert int_row["status"] == "interviewed"
    assert int_row["used_at"] is not None
    assert int_row["finished_at"] is not None
    assert cand_row["status"] == "interviewed"

    # Verify background supervisor task was triggered
    mock_supervisor.assert_awaited_once_with(candidate_id="cand-1", interview_id="int-1")

    # Calling /finish or /answer again with the same token must now return 404 (used)
    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db):
        second_resp = client.post(f"/interview/{raw_token}/finish")
        assert second_resp.status_code == 404


def test_proctor_event_allowlist_penalties_cap_and_first_per_type_agent_run():
    raw_token = "guardian-token-123"
    store = _make_store(raw_token, status="in_progress")
    fake_db = FakeSupabaseClient(store)

    with patch("app.api.interview.get_supabase_service_client", return_value=fake_db), \
         patch("app.agents.guardian.get_supabase_service_client", return_value=fake_db), \
         patch("app.core.llm.get_supabase_service_client", return_value=fake_db):

        # 1. Reject invalid event type outside allowlist
        bad_resp = client.post(f"/interview/{raw_token}/event", json={"type": "devtools_open"})
        assert bad_resp.status_code == 422

        # 2. First 'tab_hidden' (-8 -> 92) logs 1 guardian agent_run
        r1 = client.post(f"/interview/{raw_token}/event", json={"type": "tab_hidden", "detail": "hid tab 1.4s"})
        assert r1.status_code == 200
        assert r1.json() == {"trust_score": 92}
        assert len(store["agent_runs"]) == 1
        assert store["agent_runs"][0]["agent"] == "guardian"

        # 3. 6 more 'tab_hidden' events (total 7) -> capped at 5 counted events (5 * 8 = 40 -> trust_score = 60)
        # And NO additional agent_runs for 'tab_hidden'
        for _ in range(6):
            limiter._storage.reset()
            r_rep = client.post(f"/interview/{raw_token}/event", json={"type": "tab_hidden"})
        assert r_rep.status_code == 200
        assert r_rep.json() == {"trust_score": 60}
        assert len(store["agent_runs"]) == 1

        # 4. First 'paste' event (-10 -> 50) logs a second guardian agent_run (first of new type)
        r_paste = client.post(f"/interview/{raw_token}/event", json={"type": "paste"})
        assert r_paste.status_code == 200
        assert r_paste.json() == {"trust_score": 50}
        assert len(store["agent_runs"]) == 2
        assert store["interviews"][0]["trust_score"] == 50

        # 5. Candidate status must remain untouched ('invited')
        assert store["candidates"][0]["status"] == "invited"

