from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_hr_user, HRUser
from scripts.generate_fixtures import generate_all_fixtures

client = TestClient(app, raise_server_exceptions=False)


def _future_iso(days: int = 7) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _sample_open_job(job_id: str = "11111111-1111-1111-1111-111111111111", owner_id: str = "hr-owner-1") -> dict:
    return {
        "id": job_id,
        "owner_id": owner_id,
        "title": "Senior AI Engineer",
        "description": "Design and build multi-agent hiring workflows with FastAPI and Gemini.",
        "skills": ["Python", "FastAPI", "PostgreSQL"],
        "experience_level": "senior",
        "rubric": {
            "criteria": [
                {"name": "Python", "weight": 50, "description": "FastAPI", "question_themes": ["q1", "q2"]},
                {"name": "Databases", "weight": 20, "description": "SQL", "question_themes": ["q1", "q2"]},
                {"name": "Architecture", "weight": 15, "description": "Design", "question_themes": ["q1", "q2"]},
                {"name": "Testing", "weight": 15, "description": "Pytest", "question_themes": ["q1", "q2"]},
            ],
            "must_have": ["Python"],
            "seniority": "senior",
            "injection_suspected": False,
        },
        "top_n": 5,
        "min_score": 60,
        "auto_invite": True,
        "deadline": _future_iso(7),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def test_public_job_endpoint_never_exposes_rubric_or_owner_id():
    job_row = _sample_open_job()
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[job_row]
    )

    with patch("app.api.public.get_supabase_service_client", return_value=mock_db):
        resp = client.get(f"/public/jobs/{job_row['id']}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Senior AI Engineer"
    assert body["status"] == "open"
    assert "rubric" not in body
    assert "owner_id" not in body
    assert "top_n" not in body
    assert "min_score" not in body


def test_closed_job_rejected_on_public_get_and_apply():
    closed_job = _sample_open_job()
    closed_job["status"] = "closed"

    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[closed_job]
    )

    fixtures = generate_all_fixtures()
    with open(fixtures["strong"], "rb") as f:
        pdf_bytes = f.read()

    with patch("app.api.public.get_supabase_service_client", return_value=mock_db):
        get_resp = client.get(f"/public/jobs/{closed_job['id']}")
        assert get_resp.status_code == 404

        apply_resp = client.post(
            "/public/apply",
            data={
                "job_id": closed_job["id"],
                "name": "Alex Chen",
                "email": "alex@example.com",
                "consent": "true",
            },
            files={"resume": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        assert apply_resp.status_code == 400
        assert "not accepting applications" in apply_resp.json()["error"].lower()


def test_missing_consent_rejected():
    fixtures = generate_all_fixtures()
    with open(fixtures["strong"], "rb") as f:
        pdf_bytes = f.read()

    resp = client.post(
        "/public/apply",
        data={
            "job_id": "11111111-1111-1111-1111-111111111111",
            "name": "Alex Chen",
            "email": "alex@example.com",
            "consent": "false",
        },
        files={"resume": ("resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 400
    assert "consent" in resp.json()["error"].lower()


def test_duplicate_application_rejected():
    job_row = _sample_open_job()
    fixtures = generate_all_fixtures()
    with open(fixtures["strong"], "rb") as f:
        pdf_bytes = f.read()

    mock_db = MagicMock()

    def table_router(table_name: str):
        tbl = MagicMock()
        if table_name == "jobs":
            tbl.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[job_row])
        elif table_name == "candidates":
            # Existing candidate with same job_id + email
            tbl.select.return_value.eq.return_value.ilike.return_value.execute.return_value = MagicMock(
                data=[{"id": "existing-cand-1"}]
            )
        return tbl

    mock_db.table.side_effect = table_router

    with patch("app.api.public.get_supabase_service_client", return_value=mock_db):
        resp = client.post(
            "/public/apply",
            data={
                "job_id": job_row["id"],
                "name": "Alex Chen",
                "email": "ALEX@EXAMPLE.COM",
                "consent": "true",
            },
            files={"resume": ("resume.pdf", pdf_bytes, "application/pdf")},
        )

    assert resp.status_code == 400
    # Generic message that does not reveal whether the email exists
    err = resp.json()["error"].lower()
    assert "already" not in err
    assert "exists" not in err


def test_public_apply_response_contains_only_candidate_id_and_status():
    job_row = _sample_open_job()
    fixtures = generate_all_fixtures()
    with open(fixtures["strong"], "rb") as f:
        pdf_bytes = f.read()

    mock_db = MagicMock()

    def table_router(table_name: str):
        tbl = MagicMock()
        if table_name == "jobs":
            tbl.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[job_row])
        elif table_name == "candidates":
            tbl.select.return_value.eq.return_value.ilike.return_value.execute.return_value = MagicMock(data=[])
            tbl.insert.return_value.execute.return_value = MagicMock(
                data=[{"id": "cand-uuid-999", "status": "applied"}]
            )
        return tbl

    mock_db.table.side_effect = table_router

    with patch("app.api.public.get_supabase_service_client", return_value=mock_db), \
         patch("app.api.public.upload_resume", return_value="random-uuid.pdf"), \
         patch("app.api.public.run_matcher_for_candidate", new_callable=AsyncMock) as mock_matcher:
        mock_matcher.return_value = None
        resp = client.post(
            "/public/apply",
            data={
                "job_id": job_row["id"],
                "name": "Alex Chen",
                "email": "alex.new@example.com",
                "consent": "true",
            },
            files={"resume": ("resume.pdf", pdf_bytes, "application/pdf")},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert set(data.keys()) == {"candidate_id", "status"}
    assert data["candidate_id"] == "cand-uuid-999"
    assert data["status"] == "received"


def test_hr_cannot_read_another_hr_users_job_returns_404():
    other_owner_job = _sample_open_job(owner_id="owner-user-A")
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[other_owner_job]
    )

    # Authenticate as a different HR user (user-B)
    app.dependency_overrides[get_hr_user] = lambda: HRUser(id="other-user-B", email="hr_b@example.com")
    try:
        with patch("app.core.security.get_supabase_service_client", return_value=mock_db):
            resp = client.get(f"/hr/jobs/{other_owner_job['id']}")
            cand_resp = client.get(f"/hr/jobs/{other_owner_job['id']}/candidates")
        assert resp.status_code == 404
        assert cand_resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_hr_user, None)
