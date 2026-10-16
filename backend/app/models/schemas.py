import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator

_CTRL_SINGLE_LINE_RE = re.compile(r"[\x00-\x1f\x7f-\x9f]")
_CTRL_MULTI_LINE_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def normalize_criteria_weights(criteria: List["RubricCriterion"]) -> List["RubricCriterion"]:
    """Normalizes criterion weights in-place so they are integers summing to 100."""
    if not criteria:
        return criteria
    n = len(criteria)
    total = sum(max(0, int(c.weight)) for c in criteria)
    if total == 100 and all(c.weight >= 1 for c in criteria):
        return criteria

    if total <= 0:
        base = 100 // n
        rem = 100 - (base * n)
        for idx, c in enumerate(criteria):
            c.weight = base + (1 if idx < rem else 0)
        return criteria

    exact = [(max(0, int(c.weight)) * 100.0) / total for c in criteria]
    floored = [max(1, int(w)) for w in exact]
    diff = 100 - sum(floored)

    if diff > 0:
        order = sorted(
            range(n),
            key=lambda i: (exact[i] - int(exact[i]), criteria[i].weight),
            reverse=True,
        )
        for i in range(diff):
            floored[order[i % n]] += 1
    elif diff < 0:
        order = sorted(range(n), key=lambda i: floored[i], reverse=True)
        to_sub = -diff
        for idx in order:
            while to_sub > 0 and floored[idx] > 1:
                floored[idx] -= 1
                to_sub -= 1

    for i, c in enumerate(criteria):
        c.weight = floored[i]
    return criteria


# ============================================================================
# 1. LLM Structured Output Schemas
# ============================================================================

class RubricCriterion(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the evaluation criterion")
    weight: int = Field(..., description="Integer percentage weight")
    description: str = Field(..., min_length=1, description="Evaluation guide and rubric standard")
    question_themes: List[str] = Field(..., min_length=1, description="Interview question themes")

    @field_validator("weight", mode="before")
    @classmethod
    def coerce_int_weight(cls, v: Any) -> int:
        return int(round(float(v)))


class RubricOutput(BaseModel):
    criteria: List[RubricCriterion]
    must_have: List[str] = Field(default_factory=list, description="Must have skills extracted separately")
    seniority: str = Field("mid", description="junior | mid | senior")
    injection_suspected: bool = False

    @field_validator("criteria")
    @classmethod
    def validate_and_normalize_criteria(cls, criteria: List[RubricCriterion]) -> List[RubricCriterion]:
        if len(criteria) < 4 or len(criteria) > 7:
            raise ValueError(f"Rubric must contain 4 to 7 criteria (got {len(criteria)})")
        for c in criteria:
            if not c.question_themes:
                raise ValueError(f"Criterion '{c.name}' must include question_themes")
        return normalize_criteria_weights(criteria)

    @field_validator("seniority", mode="before")
    @classmethod
    def validate_seniority(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("seniority must be a string")
        cleaned = v.strip().lower()
        if cleaned not in {"junior", "mid", "senior"}:
            raise ValueError(f"seniority must be one of junior, mid, senior (got '{v}')")
        return cleaned


class MatcherCriterionDetail(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)
    feedback: str


class MatcherCriterionScore(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=100)
    evidence: str

    @field_validator("score", mode="before")
    @classmethod
    def clamp_criterion_score(cls, v: Any) -> int:
        try:
            val = int(round(float(v)))
            return max(0, min(100, val))
        except (ValueError, TypeError):
            return 0


class MatcherOutput(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    criteria_scores: List[MatcherCriterionScore] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    missing_must_have: List[str] = Field(default_factory=list)
    shortlist_recommended: bool = False
    injection_suspected: bool = False
    summary: Optional[str] = ""
    criteria_breakdown: Optional[Dict[str, MatcherCriterionDetail]] = Field(default_factory=dict)

    @field_validator("overall_score", mode="before")
    @classmethod
    def clamp_score(cls, v: Any) -> float:
        try:
            val = float(v)
            return max(0.0, min(100.0, val))
        except (ValueError, TypeError):
            return 0.0


class AnswerScore(BaseModel):
    criterion: str
    score: int = Field(..., ge=0, le=10)
    evidence: str


class InterviewTurnOutput(BaseModel):
    score_last_answer: Optional[AnswerScore] = None
    action: str = Field("ask_next", description="follow_up | ask_next | end")
    spoken_text: Optional[str] = None
    injection_suspected: bool = False
    next_question: Optional[str] = None
    question_index: Optional[int] = None
    is_complete: Optional[bool] = None
    interviewer_notes: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.spoken_text and self.next_question:
            self.spoken_text = self.next_question
        elif not self.next_question and self.spoken_text:
            self.next_question = self.spoken_text
        if self.is_complete is None:
            self.is_complete = (self.action == "end")


class EvidenceItem(BaseModel):
    claim: str
    source: str = Field(..., description="'resume' or 'answer_N'")


class SupervisorReportOutput(BaseModel):
    summary: str
    interview_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    overall_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    proctoring_note: str = ""
    recommendation: str = Field(..., description="advance | hold | reject | Hire | Reject | Hold")
    recommendation_reason: str = ""
    hr_should_verify: List[str] = Field(default_factory=list)
    injection_suspected: bool = False
    technical_rating: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    communication_rating: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    cultural_rating: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    key_strengths: Optional[List[str]] = None
    red_flags: Optional[List[str]] = None
    rubric_scores: Optional[Dict[str, float]] = None

    @field_validator(
        "overall_score",
        "interview_score",
        "technical_rating",
        "communication_rating",
        "cultural_rating",
        mode="before",
    )
    @classmethod
    def clamp_ratings(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        try:
            val = float(v)
            return max(0.0, min(100.0, val))
        except (ValueError, TypeError):
            return 0.0

    def model_post_init(self, __context: Any) -> None:
        if self.overall_score is None and self.interview_score is not None:
            self.overall_score = self.interview_score
        elif self.interview_score is None and self.overall_score is not None:
            self.interview_score = self.overall_score
        if self.key_strengths is None:
            self.key_strengths = self.strengths
        if self.red_flags is None:
            self.red_flags = self.weaknesses


# ============================================================================
# 2. Public API Schemas
# ============================================================================

class JobPublicResponse(BaseModel):
    id: str
    title: str
    description: str
    skills: List[str] = Field(default_factory=list)
    deadline: datetime
    status: str


class ApplicationSubmitResponse(BaseModel):
    candidate_id: str
    status: str = "received"


# ============================================================================
# 3. Interview Room Schemas
# ============================================================================

class InterviewVerifyResponse(BaseModel):
    valid: bool
    interview_id: str
    candidate_name: str
    job_title: str
    status: str
    expires_at: datetime


class InterviewStartResponse(BaseModel):
    interview_id: str
    status: str
    initial_question: str


class InterviewTurnRequest(BaseModel):
    transcript_text: str = Field(..., min_length=1, max_length=4000)
    audio_duration_seconds: Optional[float] = None


class InterviewTurnResponse(BaseModel):
    next_question: str
    question_index: int
    is_complete: bool


class GuardianEventRequest(BaseModel):
    event_type: str = Field(..., pattern="^(tab_hidden|window_blur|fullscreen_exit|paste|copy|no_face|multiple_faces)$")
    payload: Dict[str, Any] = Field(default_factory=dict)
    client_timestamp: datetime


class GuardianEventResponse(BaseModel):
    recorded: bool
    trust_score: float
    infraction_count: int


class InterviewCompleteResponse(BaseModel):
    status: str
    message: str


# ============================================================================
# 4. HR Admin Schemas
# ============================================================================

class JobCreateRequest(BaseModel):
    title: str
    description: str
    skills: List[str] = Field(default_factory=list)
    experience_level: str = "mid"
    deadline: datetime
    top_n: int = Field(5, ge=1, le=100)
    min_score: int = Field(60, ge=0, le=100)
    auto_invite: bool = True

    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("title must be a string")
        if _CTRL_SINGLE_LINE_RE.search(v):
            raise ValueError("title must not contain control characters")
        s = v.strip()
        if len(s) < 3 or len(s) > 150:
            raise ValueError("title must be between 3 and 150 characters")
        return s

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("description must be a string")
        if _CTRL_MULTI_LINE_RE.search(v):
            raise ValueError("description must not contain control characters")
        s = v.strip()
        if len(s) < 10 or len(s) > 8000:
            raise ValueError("description must be between 10 and 8000 characters")
        return s

    @field_validator("skills", mode="before")
    @classmethod
    def validate_skills(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("skills must be a list of strings")
        if len(v) > 20:
            raise ValueError("skills may contain at most 20 items")
        cleaned_skills: List[str] = []
        for item in v:
            if not isinstance(item, str):
                raise ValueError("each skill must be a string")
            if _CTRL_SINGLE_LINE_RE.search(item):
                raise ValueError("skill must not contain control characters")
            s = item.strip()
            if not s or len(s) > 50:
                raise ValueError("each skill must be 1 to 50 characters")
            cleaned_skills.append(s)
        return cleaned_skills

    @field_validator("experience_level", mode="before")
    @classmethod
    def validate_experience_level(cls, v: Any) -> str:
        if v is None:
            return "mid"
        if not isinstance(v, str):
            raise ValueError("experience_level must be a string")
        if _CTRL_SINGLE_LINE_RE.search(v):
            raise ValueError("experience_level must not contain control characters")
        s = v.strip()
        if not s or len(s) > 50:
            raise ValueError("invalid experience_level")
        return s

    @field_validator("deadline")
    @classmethod
    def validate_deadline_future(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        dt = v if v.tzinfo is not None else v.replace(tzinfo=timezone.utc)
        if dt <= now:
            raise ValueError("deadline must be in the future")
        return dt

    @field_validator("min_score", mode="before")
    @classmethod
    def validate_min_score(cls, v: Any) -> int:
        val = int(round(float(v)))
        if val < 0 or val > 100:
            raise ValueError("min_score must be between 0 and 100")
        return val


class JobDetailResponse(BaseModel):
    id: str
    owner_id: Optional[str] = None
    title: str
    description: str
    skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None
    top_n: int
    min_score: int
    auto_invite: bool = True
    deadline: datetime
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message: Optional[str] = None


class CandidateSummaryResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str
    ai_score: Optional[int] = None
    hr_score_override: Optional[int] = None
    effective_score: Optional[int] = None
    injection_suspected: bool = False
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class CandidateDetailResponse(BaseModel):
    id: str
    job_id: str
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    resume_path: Optional[str] = None
    resume_url: Optional[str] = None
    status: str
    ai_score: Optional[int] = None
    resume_score: Optional[float] = None
    match: Optional[Dict[str, Any]] = None
    resume_feedback: Dict[str, Any] = Field(default_factory=dict)
    hr_score_override: Optional[int] = None
    manual_score_override: Optional[float] = None
    override_reason: Optional[str] = None
    injection_suspected: bool = False
    created_at: datetime
    interview: Optional[Dict[str, Any]] = None
    evaluation_report: Optional[Dict[str, Any]] = None
    proctoring_events: List[Dict[str, Any]] = Field(default_factory=list)
    audit_logs: List[Dict[str, Any]] = Field(default_factory=list)


class StatusOverrideRequest(BaseModel):
    status: str = Field(..., pattern="^(applied|shortlisted|invited|interviewing|interviewed|hired|rejected|on_hold)$")
    reason: str = Field(..., min_length=3, max_length=500)


class ScoreOverrideRequest(BaseModel):
    manual_score: float = Field(..., ge=0.0, le=100.0)
    reason: str = Field(..., min_length=3, max_length=500)


class DecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(Hire|Reject|Hold)$")
    send_email: bool = True
    notes: Optional[str] = None


class InviteRequest(BaseModel):
    send_email: bool = True


class CancelInviteRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class AllowRetryRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class EmailPreviewResponse(BaseModel):
    recipient: str
    subject: str
    html_body: str
    text_body: str


class AuditLogResponse(BaseModel):
    id: Any
    owner_id: Optional[str] = None
    actor: Optional[str] = None
    action: str
    job_id: Optional[str] = None
    candidate_id: Optional[str] = None
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


class AgentRunResponse(BaseModel):
    id: Any
    agent: str
    job_id: Optional[str] = None
    candidate_id: Optional[str] = None
    provider: Optional[str] = None
    status: str
    latency_ms: Optional[int] = None
    created_at: datetime
