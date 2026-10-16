import pytest
from unittest.mock import patch, MagicMock
from app.services.email import send_templated_email
from app.core.config import settings


@pytest.mark.asyncio
async def test_email_dynamically_uses_logged_in_hr_sender_and_reply_to():
    captured_payloads = []

    def mock_send(payload):
        captured_payloads.append(payload)
        return {"id": "resend_test_123"}

    mock_resend = MagicMock()
    mock_resend.Emails.send = mock_send

    fake_db = MagicMock()
    fake_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

    with patch.dict("sys.modules", {"resend": mock_resend}), \
         patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
         patch.object(settings, "RESEND_API_KEY", "re_test_real_key_123"), \
         patch.object(settings, "RESEND_FROM", "asanHire <onboarding@resend.dev>"), \
         patch.object(settings, "DEMO_EMAIL_OVERRIDE", None), \
         patch.object(settings, "APP_ENV", "development"):

        res = await send_templated_email(
            recipient_email="candidate.applicant@example.com",
            template_type="invite",
            context={
                "candidate_name": "Alice Candidate",
                "job_title": "AI Platform Engineer",
                "interview_url": "http://localhost:3000/interview/token123",
                "expires_at": "48 hours",
            },
            candidate_id="cand-1",
            sent_by="jane.recruiter@example.com",
            hr_sender_email="jane.recruiter@example.com",
        )

        assert res["status"] == "sent"
        assert len(captured_payloads) == 1
        p = captured_payloads[0]

        # In dev mode with DEMO_EMAIL_OVERRIDE=None, target automatically routes to logged-in HR
        assert p["to"] == ["jane.recruiter@example.com"]
        # Reply-To routes candidate replies directly to the logged-in HR user
        assert p["reply_to"] == "jane.recruiter@example.com"
        # From address dynamically includes the HR user's formatted name
        assert "Jane Recruiter via asanHire" in p["from"]
        assert "<onboarding@resend.dev>" in p["from"]


@pytest.mark.asyncio
async def test_email_uses_explicit_demo_override_when_provided():
    captured_payloads = []

    def mock_send(payload):
        captured_payloads.append(payload)
        return {"id": "resend_test_456"}

    mock_resend = MagicMock()
    mock_resend.Emails.send = mock_send

    fake_db = MagicMock()
    fake_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

    with patch.dict("sys.modules", {"resend": mock_resend}), \
         patch("app.services.email.get_supabase_service_client", return_value=fake_db), \
         patch.object(settings, "RESEND_API_KEY", "re_test_real_key_123"), \
         patch.object(settings, "RESEND_FROM", "asanHire <notifications@domain.com>"), \
         patch.object(settings, "DEMO_EMAIL_OVERRIDE", "dev.team@company.internal"), \
         patch.object(settings, "APP_ENV", "development"):

        res = await send_templated_email(
            recipient_email="candidate.applicant@example.com",
            template_type="hired",
            context={
                "candidate_name": "Bob Candidate",
                "job_title": "Full Stack Dev",
            },
            candidate_id="cand-2",
            sent_by="hr.admin@company.com",
            hr_sender_email="hr.admin@company.com",
        )

        assert res["status"] == "sent"
        assert len(captured_payloads) == 1
        p = captured_payloads[0]

        # Explicit override takes precedence if defined
        assert p["to"] == ["dev.team@company.internal"]
        assert p["reply_to"] == "hr.admin@company.com"
        assert "Hr Admin via asanHire" in p["from"]
