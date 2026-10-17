import html
import logging
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.db import get_supabase_service_client

logger = logging.getLogger("asanhire.email")

TEMPLATES = {
    "interview_invite": {
        "subject": "You're Invited to Interview: {job_title} at asanHire",
        "html": """
        <div style="font-family: 'Paquito', Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="280" height="76" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #DD700B; margin-top: 0;">asanHire Interview Invitation</h2>
            <p>Hello {candidate_name},</p>
            <p>Congratulations! Based on your qualifications, you have been invited to participate in an automated voice screening interview for the <strong>{job_title}</strong> role.</p>
            <p style="margin: 28px 0;">
                <a href="{interview_url}" style="background: #DD700B; color: #1E201E; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Enter Interview Room
                </a>
            </p>
            <p style="color: #8A8B82; font-size: 14px;">This link is confidential, single-use, and expires on {expires_at}.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nYou have been invited to interview for {job_title}.\nAccess your interview here: {interview_url}\nExpires: {expires_at}\n\nTeam asanHire",
    },
    "hired": {
        "subject": "Offer Extended: {job_title} at asanHire",
        "html": """
        <div style="font-family: 'Paquito', Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="280" height="76" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #8FD19E; margin-top: 0;">Offer Extended</h2>
            <p>Hello {candidate_name},</p>
            <p>We were thoroughly impressed by your technical mastery and interview performance for <strong>{job_title}</strong>. We are thrilled to extend an official offer of employment.</p>
            <p>Our talent team will follow up shortly with formal onboarding documents.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nWe are thrilled to offer you the position of {job_title}.\n\nTeam asanHire",
    },
    "rejected": {
        "subject": "Update regarding your application for {job_title}",
        "html": """
        <div style="font-family: 'Paquito', Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="280" height="76" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #D9DADF; margin-top: 0;">Application Status Update</h2>
            <p>Hello {candidate_name},</p>
            <p>Thank you for taking the time to interview for <strong>{job_title}</strong>. While we appreciated your background, we have decided to advance with other candidates whose experience more closely matches our immediate technical priorities.</p>
            <p>We wish you every success in your ongoing endeavors.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nThank you for interviewing for {job_title}. We have decided to advance with other candidates.\n\nTeam asanHire",
    },
    "on_hold": {
        "subject": "Application Update: {job_title} at asanHire",
        "html": """
        <div style="font-family: 'Paquito', Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="280" height="76" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #FCF8D8; margin-top: 0;">Application Under Review</h2>
            <p>Hello {candidate_name},</p>
            <p>Thank you for completing your evaluation for <strong>{job_title}</strong>. Your profile is currently on hold while our team finalizes round evaluations across all candidates. We will reach back out shortly.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nYour application for {job_title} is currently on hold under review.\n\nTeam asanHire",
    },
    "corrected_decision": {
        "subject": "Status Correction: Your Application for {job_title} at asanHire",
        "html": """
        <div style="font-family: 'Paquito', Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="280" height="76" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #FCF8D8; margin-top: 0;">Application Status Correction</h2>
            <p>Hello {candidate_name},</p>
            <p>We are reaching out to clarify an update regarding your application for <strong>{job_title}</strong>. A hiring manager reviewed your profile and corrected a prior status assessment.</p>
            <p>Your current status is now: <strong style="color: #DD700B;">{new_status}</strong>.</p>
            <p style="color: #8A8B82; font-size: 14px;">Reason for adjustment: {correction_reason}</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nYour application status for {job_title} has been corrected to: {new_status}.\nReason: {correction_reason}\n\nTeam asanHire",
    },
}

TEMPLATES["invite"] = TEMPLATES["interview_invite"]
TEMPLATES["hold"] = TEMPLATES["on_hold"]
TEMPLATES["reject"] = TEMPLATES["rejected"]
TEMPLATES["hire"] = TEMPLATES["hired"]


def render_email_template(template_type: str, context: Dict[str, Any]) -> Dict[str, str]:
    """Renders fixed safe HTML and text templates with HTML-escaped user variables."""
    if template_type not in TEMPLATES:
        template_type = "on_hold"

    raw_frontend = getattr(settings, "FRONTEND_URL", "https://asan-hire.vercel.app")
    frontend_base = (
        raw_frontend
        if raw_frontend and "localhost" not in raw_frontend
        else "https://asan-hire.vercel.app"
    ).rstrip("/")
    default_context = {
        "candidate_name": "Candidate",
        "job_title": "Position",
        "interview_url": f"{frontend_base}/interview",
        "expires_at": "48 hours",
        "new_status": "Under Review",
        "correction_reason": "HR administrative update",
        "logo_url": f"{frontend_base}/logo-email.png",
    }

    safe_context: Dict[str, Any] = dict(default_context)
    for k, v in (context or {}).items():
        if v is None:
            continue
        if k in {"interview_url", "logo_url"}:
            safe_context[k] = str(v)
        else:
            safe_context[k] = html.escape(str(v))

    t = TEMPLATES[template_type]
    subject = t["subject"].format(**safe_context)
    html_body = t["html"].format(**safe_context)
    text_body = t["text"].format(**safe_context)
    return {
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }


def write_email_log(
    candidate_id: Optional[str],
    template: str,
    to_email: str,
    sent_by: str,
    status: str,
    provider_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Persists an entry to public.email_log."""
    db_template = {
        "interview_invite": "invite",
        "invited": "invite",
        "hired": "hire",
        "rejected": "reject",
        "on_hold": "hold",
    }.get(template, template)

    row: Dict[str, Any] = {
        "candidate_id": candidate_id,
        "template": db_template,
        "to_email": to_email,
        "sent_by": sent_by,
        "status": status,
        "provider_id": provider_id,
    }
    try:
        client = get_supabase_service_client()
        res = client.table("email_log").insert(row).execute()
        return res.data[0] if res and res.data else row
    except Exception as e:
        logger.error(f"Failed to write email_log: {type(e).__name__}")
        return None


async def send_templated_email(
    recipient_email: str,
    template_type: str,
    context: Dict[str, Any],
    candidate_id: Optional[str] = None,
    sent_by: str = "system:scheduling_agent",
    hr_sender_email: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends transactional email via Resend using a fixed template and writes email_log.
    Dynamically uses the logged-in HR user's email for reply_to and sender attribution,
    and routes testing emails to the HR user's inbox in non-production environments
    when DEMO_EMAIL_OVERRIDE is not set.
    Never logs raw interview tokens.
    """
    rendered = render_email_template(template_type, context)

    # 1. Target Recipient Resolution
    # If DEMO_EMAIL_OVERRIDE is set, use it. Otherwise, if in non-production and
    # hr_sender_email is provided, route directly to the logged-in HR's inbox.
    target_email = recipient_email
    if settings.DEMO_EMAIL_OVERRIDE and settings.DEMO_EMAIL_OVERRIDE.strip():
        target_email = settings.DEMO_EMAIL_OVERRIDE.strip()
    elif hr_sender_email and hr_sender_email.strip() and not settings.is_production:
        target_email = hr_sender_email.strip()

    # 2. Sender and Reply-To Resolution
    base_from = (settings.RESEND_FROM or "asanHire <onboarding@resend.dev>").strip()
    from_address = base_from
    reply_to: Optional[str] = None

    if hr_sender_email and "@" in hr_sender_email:
        hr_clean = hr_sender_email.strip()
        reply_to = hr_clean
        user_name = hr_clean.split("@")[0].replace(".", " ").title()

        try:
            client_db = get_supabase_service_client()
            prof_res = (
                client_db.table("hr_profiles")
                .select("contact_email, full_name, organization, reply_to_enabled")
                .eq("contact_email", hr_clean)
                .execute()
            )
            if prof_res and isinstance(prof_res.data, list) and prof_res.data:
                prof = prof_res.data[0]
                if isinstance(prof, dict):
                    if prof.get("reply_to_enabled") is False:
                        reply_to = None
                    org = prof.get("organization")
                    fn = prof.get("full_name")
                    display_title = (
                        org if isinstance(org, str) and org.strip()
                        else (fn if isinstance(fn, str) and fn.strip() else None)
                    )
                    if display_title:
                        user_name = display_title.strip()
        except Exception:
            pass

        # Strip CR/LF to prevent email header injection
        user_name = user_name.replace("\r", "").replace("\n", "").strip()

        if "<" in base_from and ">" in base_from:
            addr = base_from.split("<")[1].split(">")[0]
            from_address = f"{user_name} via asanHire <{addr}>"
        else:
            from_address = f"{user_name} via asanHire <{base_from}>"

    provider_id: Optional[str] = None
    delivery_status = "sent"

    api_key = (settings.RESEND_API_KEY or "").strip()
    if api_key and not api_key.startswith("re_mock") and api_key != "your-resend-api-key":
        try:
            import resend

            resend.api_key = api_key
            email_payload: Dict[str, Any] = {
                "from": from_address,
                "to": [target_email],
                "subject": rendered["subject"],
                "html": rendered["html"],
                "text": rendered["text"],
            }
            if reply_to:
                email_payload["reply_to"] = reply_to

            send_res = resend.Emails.send(email_payload)
            if isinstance(send_res, dict):
                provider_id = send_res.get("id")
            else:
                provider_id = getattr(send_res, "id", None)
        except Exception as e:
            logger.warning(f"Resend delivery failed ({type(e).__name__}): {e}; recording in email_log.")
            delivery_status = "failed"
    else:
        provider_id = f"sim_{template_type}"

    write_email_log(
        candidate_id=candidate_id,
        template=template_type,
        to_email=recipient_email,
        sent_by=sent_by,
        status=delivery_status,
        provider_id=provider_id,
    )

    return {
        "status": delivery_status,
        "provider_id": provider_id,
        "recipient": recipient_email,
        "subject": rendered["subject"],
    }
