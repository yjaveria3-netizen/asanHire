import logging
from collections import Counter
from typing import List, Dict, Any, Optional

from app.core.db import get_supabase_service_client
from app.core.llm import log_agent_run

logger = logging.getLogger("asanhire.agents.guardian")

# Unit deduction table per infraction
PENALTY_RATES: Dict[str, int] = {
    "tab_hidden": 8,
    "window_blur": 3,
    "fullscreen_exit": 10,
    "paste": 10,
    "copy": 3,
    "no_face": 5,
    "multiple_faces": 15,
}

ALLOWED_EVENT_TYPES = frozenset(PENALTY_RATES.keys())
MAX_REPEATS_CAPPED = 5


def calculate_trust_score(events: List[Dict[str, Any]]) -> int:
    """
    Guardian Agent: Computes candidate integrity trust_score = max(0, 100 - sum of penalties).
    Caps repeats of the same type at 5 counted events.
    Supports event dicts keyed by either 'type' (live DB column) or 'event_type'.
    """
    event_counts: Counter = Counter()
    for event in events:
        if not isinstance(event, dict):
            continue
        ev_type = event.get("type") or event.get("event_type")
        if ev_type in PENALTY_RATES:
            event_counts[ev_type] += 1

    total_penalty = 0
    for ev_type, count in event_counts.items():
        effective_count = min(count, MAX_REPEATS_CAPPED)
        total_penalty += effective_count * PENALTY_RATES[ev_type]

    return max(0, 100 - total_penalty)


async def record_proctor_event(
    interview_id: str,
    candidate_id: str,
    job_id: Optional[str],
    event_type: str,
    detail: Optional[str] = None,
) -> int:
    """
    Stores a validated proctoring event in proctor_events, recomputes trust_score
    on the interview row, and writes agent_runs (agent='guardian') ONLY for the
    first event of each type for this interview.
    Never modifies candidate status.
    """
    if event_type not in ALLOWED_EVENT_TYPES:
        raise ValueError(f"Unsupported proctor event type: {event_type}")

    client = get_supabase_service_client()

    # Insert new event into proctor_events
    insert_row: Dict[str, Any] = {
        "interview_id": interview_id,
        "type": event_type,
    }
    if detail is not None:
        insert_row["detail"] = detail[:200]

    client.table("proctor_events").insert(insert_row).execute()

    # Load all proctor_events for this interview to recompute trust_score and check count of this type
    ev_res = (
        client.table("proctor_events")
        .select("type")
        .eq("interview_id", interview_id)
        .execute()
    )
    all_events = ev_res.data if (ev_res and ev_res.data) else [insert_row]

    new_trust_score = calculate_trust_score(all_events)

    # Persist updated trust_score on interviews
    client.table("interviews").update({"trust_score": new_trust_score}).eq("id", interview_id).execute()

    # Count how many times this specific event_type has occurred in this interview
    type_occurrences = sum(
        1 for e in all_events if (e.get("type") or e.get("event_type")) == event_type
    )

    # Write agent_runs (agent='guardian') ONLY for the first event of each type
    if type_occurrences == 1:
        await log_agent_run(
            agent="guardian",
            job_id=job_id,
            candidate_id=candidate_id,
            status="success",
            provider="deterministic",
        )

    return new_trust_score
