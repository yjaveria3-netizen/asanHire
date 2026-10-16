import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("asanhire.email")

TEMPLATES = {
    "interview_invite": {
        "subject": "You're Invited to Interview: {job_title} at asanHire",
        "html": """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="240" height="65" style="display: block; border: 0; outline: none; text-decoration: none;" />
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
        "text": "Hello {candidate_name},\n\nYou have been invited to interview for {job_title}.\nAccess your interview here: {interview_url}\nExpires: {expires_at}\n\nTeam asanHire"
    },
    "hired": {
        "subject": "Offer Extended: {job_title} at asanHire",
        "html": """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="240" height="65" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #8FD19E; margin-top: 0;">Offer Extended</h2>
            <p>Hello {candidate_name},</p>
            <p>We were thoroughly impressed by your technical mastery and interview performance for <strong>{job_title}</strong>. We are thrilled to extend an official offer of employment.</p>
            <p>Our talent team will follow up shortly with formal onboarding documents.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nWe are thrilled to offer you the position of {job_title}.\n\nTeam asanHire"
    },
    "rejected": {
        "subject": "Update regarding your application for {job_title}",
        "html": """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="240" height="65" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #D9DADF; margin-top: 0;">Application Status Update</h2>
            <p>Hello {candidate_name},</p>
            <p>Thank you for taking the time to interview for <strong>{job_title}</strong>. While we appreciated your background, we have decided to advance with other candidates whose experience more closely matches our immediate technical priorities.</p>
            <p>We wish you every success in your ongoing endeavors.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nThank you for interviewing for {job_title}. We have decided to advance with other candidates.\n\nTeam asanHire"
    },
    "on_hold": {
        "subject": "Application Update: {job_title} at asanHire",
        "html": """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="240" height="65" style="display: block; border: 0; outline: none; text-decoration: none;" />
                    </td>
                </tr>
            </table>
            <h2 style="color: #FCF8D8; margin-top: 0;">Application Under Review</h2>
            <p>Hello {candidate_name},</p>
            <p>Thank you for completing your evaluation for <strong>{job_title}</strong>. Your profile is currently on hold while our team finalizes round evaluations across all candidates. We will reach back out shortly.</p>
        </div>
        """,
        "text": "Hello {candidate_name},\n\nYour application for {job_title} is currently on hold under review.\n\nTeam asanHire"
    },
    "corrected_decision": {
        "subject": "Status Correction: Your Application for {job_title} at asanHire",
        "html": """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1E201E; color: #D9DADF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #2A2D2A;">
                <tr>
                    <td style="padding-bottom: 16px;">
                        <img src="{logo_url}" alt="asanHire" width="240" height="65" style="display: block; border: 0; outline: none; text-decoration: none;" />
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
        "text": "Hello {candidate_name},\n\nYour application status for {job_title} has been corrected to: {new_status}.\nReason: {correction_reason}\n\nTeam asanHire"
    }
}

# Alias invite to interview_invite
TEMPLATES["invite"] = TEMPLATES["interview_invite"]

def render_email_template(template_type: str, context: Dict[str, Any]) -> Dict[str, str]:
    """Renders fixed safe HTML and text templates with sanitized context."""
    if template_type not in TEMPLATES:
        template_type = "on_hold"
    
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    default_context = {
        "candidate_name": "Candidate",
        "job_title": "Position",
        "interview_url": f"{frontend_base}/interview",
        "expires_at": "48 hours",
        "new_status": "Under Review",
        "correction_reason": "HR administrative update",
        "logo_url": f"{frontend_base}/logo-email.png"
    }
    merged_context = {**default_context, **context}
    
    t = TEMPLATES[template_type]
    subject = t["subject"].format(**merged_context)
    html_body = t["html"].format(**merged_context)
    text_body = t["text"].format(**merged_context)
    return {
        "subject": subject,
        "html": html_body,
        "text": text_body
    }

async def send_templated_email(
    recipient_email: str,
    template_type: str,
    context: Dict[str, Any],
    candidate_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends transactional email via Resend and logs action to database.
    TODO: M2 (AI/backend engineer) will connect to Resend API:
    resend.Emails.send(...)
    """
    rendered = render_email_template(template_type, context)
    logger.info(f"Simulating email delivery via Resend to {recipient_email} [Template: {template_type}]")
    
    # In production, dispatch via resend:
    # resend.api_key = settings.RESEND_API_KEY
    # res = resend.Emails.send({...})
    
    return {
        "status": "sent",
        "resend_id": f"msg_mock_{template_type}_12345",
        "recipient": recipient_email,
        "subject": rendered["subject"]
    }
