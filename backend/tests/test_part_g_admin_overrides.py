import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limit import limiter
from app.core.security import get_admin_user, get_hr_user, AdminUser, HRUser, get_current_user_profile
from app.api.admin import _change_pwd_attempts, _lockouts

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_admin_state():
    limiter._storage.reset()
    _change_pwd_attempts.clear()
    _lockouts.clear()
    yield
    limiter._storage.reset()
    _change_pwd_attempts.clear()
    _lockouts.clear()


class FakeSupabaseResponse:
    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


class FakeTableQuery:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]], table_name: str):
        self.store = store
        self.table_name = table_name
        self._filters = []
        self._in_filters = []
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

    def in_(self, col: str, vals: List[Any]):
        self._in_filters.append((col, [str(v) for v in vals]))
        return self

    def or_(self, cond: str):
        # simple or_ mock for user_id matching
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

    def upsert(self, payload: Dict[str, Any], on_conflict: str = ""):
        self._insert_payload = payload
        return self

    def execute(self) -> FakeSupabaseResponse:
        rows = self.store.setdefault(self.table_name, [])
        if self._insert_payload is not None:
            row = dict(self._insert_payload)
            row.setdefault("id", f"{self.table_name}-{len(rows) + 1}")
            row.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            rows.append(row)
            return FakeSupabaseResponse([row])

        matched = [
            r for r in rows
            if all(str(r.get(k)) == str(v) for k, v in self._filters)
            and all(str(r.get(col)) in vals for col, vals in self._in_filters)
        ]

        if self._update_payload is not None:
            for r in matched:
                r.update(self._update_payload)
            return FakeSupabaseResponse(matched)

        result = [dict(r) for r in matched]
        if self._order_col:
            result.sort(key=lambda x: str(x.get(self._order_col) or ""), reverse=self._order_desc)
        if self._limit_n is not None:
            result = result[: self._limit_n]
        return FakeSupabaseResponse(result)


class FakeSupabaseClient:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]]):
        self.store = store

    def table(self, name: str) -> FakeTableQuery:
        return FakeTableQuery(self.store, name)


def _make_part_g_store() -> Dict[str, List[Dict[str, Any]]]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "user_roles": [
            {"user_id": "admin-1", "role": "admin", "must_change_password": False},
            {"user_id": "hr-1", "role": "hr", "must_change_password": False},
        ],
        "hr_profiles": [
            {
                "id": "hr-1",
                "full_name": "Jane HR",
                "organization": "Acme Talent",
                "contact_email": "jane@acme.com",
                "reply_to_enabled": True,
                "status": "active",
                "created_at": now_iso,
                "last_active_at": now_iso,
            }
        ],
        "jobs": [
            {
                "id": "job-1",
                "title": "Senior AI Architect",
                "department": "Engineering",
                "created_by": "hr-1",
                "owner_id": "hr-1",
                "min_score": 70.0,
                "status": "active",
                "created_at": now_iso,
            }
        ],
        "candidates": [
            {
                "id": "cand-1",
                "job_id": "job-1",
                "name": "David Candidate",
                "email": "david@example.com",
                "status": "interviewed",
                "ai_score": 65,
                "hr_score_override": None,
                "created_at": now_iso,
            }
        ],
        "interviews": [
            {
                "id": "int-1",
                "candidate_id": "cand-1",
                "job_id": "job-1",
                "status": "completed",
                "created_at": now_iso,
            }
        ],
        "reports": [
            {
                "id": "rep-1",
                "candidate_id": "cand-1",
                "version": 1,
                "recommendation": "Hire",
                "created_at": now_iso,
            }
        ],
        "hr_override_events": [],
        "hr_override_questions": [],
        "admin_audit_log": [],
        "audit_log": [],
        "email_log": [],
        "blocked_emails": [],
        "candidate_portal_profiles": [],
        "hr_access_requests": [],
    }


def test_g0_password_enforcement_and_change():
    """Tests G0: must_change_password gate and POST /admin/change-password endpoint."""
    store = _make_part_g_store()
    fake_db = FakeSupabaseClient(store)

    # 1. Admin with must_change_password = True
    locked_admin = AdminUser(id="admin-locked", email="locked@admin.com", role="admin", must_change_password=True)
    app.dependency_overrides[get_admin_user] = lambda: locked_admin
    try:
        with patch("app.api.admin.get_supabase_service_client", return_value=fake_db):
            # Overview returns 403 when password change is required
            r_locked = client.get("/admin/overview")
            assert r_locked.status_code == 403
            err_msg = str(r_locked.json().get("error") or r_locked.json().get("detail") or "")
            assert "Password change required" in err_msg

            # Password change validations: new password < 12 chars
            r_short = client.post(
                "/admin/change-password",
                json={"current_password": "OldPassword123!", "new_password": "short"},
            )
            assert r_short.status_code == 422

            # New password same as email rejected
            r_email = client.post(
                "/admin/change-password",
                json={"current_password": "OldPassword123!", "new_password": "locked@admin.com"},
            )
            assert r_email.status_code == 422

            # Successful password change mock
            mock_auth_resp = MagicMock(status_code=200)
            mock_admin_up = MagicMock(status_code=200)

            async def mock_post(url, *args, **kwargs):
                return mock_auth_resp

            async def mock_put(url, *args, **kwargs):
                return mock_admin_up

            with patch("httpx.AsyncClient.post", side_effect=mock_post), \
                 patch("httpx.AsyncClient.put", side_effect=mock_put):
                r_success = client.post(
                    "/admin/change-password",
                    json={"current_password": "OldPassword123!", "new_password": "BrandNewSecurePassword123!"},
                )
                assert r_success.status_code == 200
                assert r_success.json()["success"] is True
                assert len(store["admin_audit_log"]) == 1
                assert store["admin_audit_log"][0]["action"] == "admin_password_changed"
    finally:
        app.dependency_overrides.clear()


def test_g2_override_accountability_and_admin_questions():
    """Tests G2: Override accountability, reason categories, normal vs override decisions, and admin QA."""
    store = _make_part_g_store()
    fake_db = FakeSupabaseClient(store)

    hr_user = HRUser(id="hr-1", email="jane@acme.com", role="hr")
    admin_user = AdminUser(id="admin-1", email="super@admin.com", role="admin")

    app.dependency_overrides[get_hr_user] = lambda: hr_user
    app.dependency_overrides[get_admin_user] = lambda: admin_user
    try:
        with patch("app.api.hr.get_supabase_service_client", return_value=fake_db), \
             patch("app.api.admin.get_supabase_service_client", return_value=fake_db), \
             patch("app.core.security.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.audit.get_supabase_service_client", return_value=fake_db), \
             patch("app.services.email.get_supabase_service_client", return_value=fake_db):

            # 1. Status override requires valid category and >= 10 chars reason
            r_bad = client.patch(
                "/hr/candidates/cand-1/status",
                json={"status": "shortlisted", "reason": "too short", "reason_category": "other"},
            )
            assert r_bad.status_code == 422

            r_status = client.patch(
                "/hr/candidates/cand-1/status",
                json={
                    "status": "shortlisted",
                    "reason": "Re-evaluating past leadership contributions",
                    "reason_category": "prior_experience_not_in_resume",
                },
            )
            assert r_status.status_code == 200
            assert len(store["hr_override_events"]) == 1
            assert store["hr_override_events"][0]["override_type"] == "status_change"
            assert store["hr_override_events"][0]["reason_category"] == "prior_experience_not_in_resume"

            # 2. Decision matching AI recommendation ("Hire" -> "hired") is NORMAL decision (NOT an override)
            r_normal_dec = client.post(
                "/hr/candidates/cand-1/decision",
                json={"decision": "hired", "reason": "Consistent high scores across evaluation"},
            )
            assert r_normal_dec.status_code == 200
            # hr_override_events count should STILL be 1 (normal decision is not an override!)
            assert len(store["hr_override_events"]) == 1

            # 3. Decision differing from AI recommendation ("Hire" vs "rejected") IS an override!
            # Reset candidate status back to interviewed
            store["candidates"][0]["status"] = "interviewed"
            r_diff_dec = client.post(
                "/hr/candidates/cand-1/decision",
                json={
                    "decision": "rejected",
                    "reason": "Cultural misalignment observed in communication answers",
                    "reason_category": "disagrees_with_ai_scoring",
                },
            )
            assert r_diff_dec.status_code == 200
            # hr_override_events count should now be 2
            assert len(store["hr_override_events"]) == 2
            assert store["hr_override_events"][1]["override_type"] == "recommendation_override"

            # 4. HR views their overrides and questions: GET /hr/overrides
            r_hr_ov = client.get("/hr/overrides")
            assert r_hr_ov.status_code == 200
            ov_list = r_hr_ov.json()
            assert len(ov_list["overrides"]) == 2
            assert ov_list["unanswered_questions_count"] == 0

            # 5. Admin asks a question on override #1: POST /admin/overrides/{id}/question
            ov1_id = store["hr_override_events"][0]["id"]
            r_q = client.post(
                f"/admin/overrides/{ov1_id}/question",
                json={"question": "Could you provide details on what prior experience was verified?"},
            )
            assert r_q.status_code == 200
            assert r_q.json()["admin_status"] == "question_asked"
            assert store["hr_override_events"][0]["admin_status"] == "question_asked"

            # 6. HR now sees 1 unanswered question badge: GET /hr/overrides
            r_hr_ov2 = client.get("/hr/overrides")
            assert r_hr_ov2.json()["unanswered_questions_count"] == 1

            # 7. HR answers Admin's question: POST /hr/overrides/{id}/questions/{qid}/answer
            qid = store["hr_override_questions"][0]["id"]
            r_ans = client.post(
                f"/hr/overrides/{ov1_id}/questions/{qid}/answer",
                json={"answer": "Verified github portfolio and confirmed open source maintainer status."},
            )
            assert r_ans.status_code == 200
            assert store["hr_override_events"][0]["admin_status"] == "answered"

            # 8. Admin reviews override: POST /admin/overrides/{id}/review
            r_rev = client.post(
                f"/admin/overrides/{ov1_id}/review",
                json={"admin_note": "Satisfactory justification provided."},
            )
            assert r_rev.status_code == 200
            assert store["hr_override_events"][0]["admin_status"] == "reviewed"
    finally:
        app.dependency_overrides.clear()


def test_g3_admin_data_views():
    """Tests G3: GET /admin/overview, /admin/hr-users, /admin/hr-users/{id}, and /admin/candidates/{email_key}."""
    store = _make_part_g_store()
    fake_db = FakeSupabaseClient(store)

    admin_user = AdminUser(id="admin-1", email="super@admin.com", role="admin")
    app.dependency_overrides[get_admin_user] = lambda: admin_user
    try:
        with patch("app.api.admin.get_supabase_service_client", return_value=fake_db):
            # 1. Overview
            r_over = client.get("/admin/overview")
            assert r_over.status_code == 200
            ov = r_over.json()
            assert ov["hr_users_count"] == 1
            assert ov["jobs_active_count"] == 1
            assert ov["candidates_count"] == 1
            assert len(ov["trends_applications_14d"]) == 14
            assert len(ov["trends_jobs_14d"]) == 14

            # 2. HR users list
            r_users = client.get("/admin/hr-users?sort_by=jobs&order=desc")
            assert r_users.status_code == 200
            u_list = r_users.json()
            assert len(u_list) == 1
            assert u_list[0]["email"] == "jane@acme.com"
            assert u_list[0]["organization"] == "Acme Talent"
            assert u_list[0]["jobs_count"] == 1

            # 3. HR user detail (no candidate PII)
            r_detail = client.get("/admin/hr-users/hr-1")
            assert r_detail.status_code == 200
            det = r_detail.json()
            assert det["full_name"] == "Jane HR"
            assert len(det["jobs"]) == 1
            assert "resume_text" not in det
            assert "David Candidate" not in json.dumps(det)

            # 4. Candidate platform history across jobs (no resume text or transcripts)
            r_cand = client.get("/admin/candidates/david@example.com")
            assert r_cand.status_code == 200
            c_sum = r_cand.json()
            assert c_sum["email_key"] == "david@example.com"
            assert c_sum["applications_count"] == 1
            assert len(c_sum["applications"]) == 1
            assert c_sum["applications"][0]["job_title"] == "Senior AI Architect"
            assert "resume_text" not in c_sum
            assert "transcript" not in c_sum
    finally:
        app.dependency_overrides.clear()
