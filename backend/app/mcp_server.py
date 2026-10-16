"""
asanHire FastMCP Tool Server.
Exposes read-only inspection and audit tools adhering to least-privilege principles.
No tools have permission to mutate candidate status or send emails.
"""

import json
from typing import Dict, Any, List
from fastmcp import FastMCP

mcp = FastMCP("asanHire-MCP-Server")

# OWNER: M2 (AI/backend engineer)
# TODO M2: Wire MCP tools to query Supabase directly using service role client

@mcp.tool()
def list_active_jobs() -> str:
    """Lists all active job postings with titles, deadlines, and applicant quotas."""
    # Stub response
    mock_jobs = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "title": "Senior AI / Full-Stack Engineer",
            "department": "Product Engineering",
            "status": "active",
            "top_n": 3,
            "min_score": 70.0
        }
    ]
    return json.dumps(mock_jobs, indent=2)

@mcp.tool()
def get_candidate_dossier(candidate_id: str) -> str:
    """Returns candidate summary, match score, and status (Read-only)."""
    mock_candidate = {
        "candidate_id": candidate_id,
        "full_name": "Amina Malik",
        "status": "interviewed",
        "resume_score": 92.5,
        "trust_score": 97.0,
        "recommendation": "Hire"
    }
    return json.dumps(mock_candidate, indent=2)

@mcp.tool()
def get_audit_trail(entity_id: str) -> str:
    """Retrieves immutable audit logs for a given candidate or job."""
    mock_audit = [
        {
            "action": "status_override",
            "entity_id": entity_id,
            "actor": "hr@asanhire.dev",
            "reason": "Verified GitHub contributions manually."
        }
    ]
    return json.dumps(mock_audit, indent=2)

@mcp.tool()
def get_guardian_trust_score(interview_id: str) -> str:
    """Returns the proctoring breakdown and integrity trust score for an interview."""
    mock_trust = {
        "interview_id": interview_id,
        "trust_score": 97.0,
        "events": [
            {"type": "window_blur", "penalty": 3.0, "count": 1}
        ]
    }
    return json.dumps(mock_trust, indent=2)

if __name__ == "__main__":
    mcp.run()
