import logging
from typing import List, Dict, Any
from collections import Counter

logger = logging.getLogger("asanhire.agents.guardian")

# Unit deduction table per infraction
PENALTY_RATES = {
    "tab_hidden": 8.0,
    "window_blur": 3.0,
    "fullscreen_exit": 10.0,
    "paste": 10.0,
    "copy": 3.0,
    "no_face": 5.0,
    "multiple_faces": 15.0
}

MAX_REPEATS_CAPPED = 5

# OWNER: M2 (AI/backend engineer)
# TODO M2: Implement live event stream persistence and real-time score update in Supabase
def calculate_trust_score(events: List[Dict[str, Any]]) -> float:
    """
    Guardian Agent: Computes candidate integrity trust score (0.0 - 100.0).
    Penalizes suspicious browser behavior.
    Capped at 5 repeated offenses per event type.
    """
    event_counts = Counter(event.get("event_type") for event in events)
    total_penalty = 0.0

    for event_type, count in event_counts.items():
        if event_type in PENALTY_RATES:
            effective_count = min(count, MAX_REPEATS_CAPPED)
            unit_rate = PENALTY_RATES[event_type]
            total_penalty += effective_count * unit_rate

    trust_score = max(0.0, 100.0 - total_penalty)
    return round(trust_score, 2)
