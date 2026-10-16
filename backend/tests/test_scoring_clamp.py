from app.models.schemas import MatcherOutput, SupervisorReportOutput
from app.agents.guardian import calculate_trust_score

def test_matcher_score_clamping_upper():
    # Value over 100 clamped to 100.0
    payload = {
        "overall_score": 150.0,
        "summary": "Overqualified candidate claim",
        "strengths": [],
        "gaps": []
    }
    output = MatcherOutput.model_validate(payload)
    assert output.overall_score == 100.0

def test_matcher_score_clamping_lower():
    # Negative score clamped to 0.0
    payload = {
        "overall_score": -25.0,
        "summary": "Poor qualification",
        "strengths": [],
        "gaps": []
    }
    output = MatcherOutput.model_validate(payload)
    assert output.overall_score == 0.0

def test_supervisor_report_clamping():
    payload = {
        "overall_score": 105.0,
        "recommendation": "Hire",
        "summary": "Great match",
        "technical_rating": 120.0,
        "communication_rating": -10.0,
        "cultural_rating": 85.0
    }
    report = SupervisorReportOutput.model_validate(payload)
    assert report.overall_score == 100.0
    assert report.technical_rating == 100.0
    assert report.communication_rating == 0.0
    assert report.cultural_rating == 85.0

def test_guardian_trust_score_clean_run():
    # Clean run with no events has 100% trust
    assert calculate_trust_score([]) == 100.0

def test_guardian_trust_score_deductions():
    # tab_hidden (-8) + paste (-10) = -18 -> 82.0
    events = [
        {"event_type": "tab_hidden"},
        {"event_type": "paste"}
    ]
    assert calculate_trust_score(events) == 82.0

def test_guardian_trust_score_capping():
    # 10 paste events should be capped at 5 occurrences = 5 * 10 = 50 pt deduction
    events = [{"event_type": "paste"} for _ in range(10)]
    score = calculate_trust_score(events)
    assert score == 50.0  # 100 - (5 * 10) = 50.0

def test_guardian_trust_score_floor_zero():
    # Overwhelming infractions should floor at 0.0, not negative
    events = [
        {"event_type": "multiple_faces"}, # 5 * 15 = 75
        {"event_type": "fullscreen_exit"}, # 5 * 10 = 50 -> total 125 > 100
    ] * 6
    score = calculate_trust_score(events)
    assert score == 0.0
