import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_admin_user, AdminUser

client = TestClient(app)

def test_register_role_hr_and_candidate():
    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

    with patch("app.api.public.get_supabase_service_client", return_value=mock_db):
        # Register as HR
        res = client.post("/public/register-role", json={
            "user_id": "hr-user-uuid-1",
            "email": "recruiter@example.com",
            "full_name": "Jane Recruiter",
            "role": "hr",
            "organization": "Acme Corp",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "hr"
        assert data["status"] == "pending"
        assert ("yjaveria3@gmail.com" in data["message"] or "admin" in data["message"])

        # Register as Candidate
        res_cand = client.post("/public/register-role", json={
            "user_id": "cand-user-uuid-1",
            "email": "cand@example.com",
            "full_name": "Bob Candidate",
            "role": "candidate",
        })
        assert res_cand.status_code == 200
        cand_data = res_cand.json()
        assert cand_data["role"] == "candidate"
        assert cand_data["status"] == "active"


def test_admin_hr_requests_list_approve_reject():
    mock_db = MagicMock()
    fake_requests = [
        {
            "id": "req-1",
            "user_id": "u-1",
            "email": "recruiter@example.com",
            "full_name": "Jane Recruiter",
            "organization": "Acme Corp",
            "reason": "HR Recruiter Portal Registration",
            "status": "pending",
            "created_at": "2026-10-16T12:00:00Z",
            "reviewed_at": None,
            "reviewed_by": None,
        }
    ]
    mock_db.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=fake_requests)
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=fake_requests)
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

    async def mock_admin_dep():
        return AdminUser(id="admin-1", email="admin@asanhire.dev", role="admin", must_change_password=False)

    app.dependency_overrides[get_admin_user] = mock_admin_dep
    try:
        with patch("app.api.admin.get_supabase_service_client", return_value=mock_db):
            # 1. List requests
            res = client.get("/admin/hr-requests")
            assert res.status_code == 200
            items = res.json()
            assert len(items) == 1
            assert items[0]["email"] == "recruiter@example.com"
            assert items[0]["status"] == "pending"

            # 2. Approve request
            approve_res = client.post("/admin/hr-requests/req-1/approve")
            assert approve_res.status_code == 200
            assert approve_res.json()["success"] is True

            # 3. Reject request
            reject_res = client.post("/admin/hr-requests/req-1/reject")
            assert reject_res.status_code == 200
            assert reject_res.json()["success"] is True
    finally:
        app.dependency_overrides.pop(get_admin_user, None)
