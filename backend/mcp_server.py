from app.mcp_server import (
    mcp,
    call_mcp_tool,
    get_job_rubric,
    get_candidate,
    get_ranked_candidates,
    save_score,
    log_proctor_event,
    get_trust_score,
    save_report,
    send_invite_email,
)

__all__ = [
    "mcp",
    "call_mcp_tool",
    "get_job_rubric",
    "get_candidate",
    "get_ranked_candidates",
    "save_score",
    "log_proctor_event",
    "get_trust_score",
    "save_report",
    "send_invite_email",
]

if __name__ == "__main__":
    mcp.run()
