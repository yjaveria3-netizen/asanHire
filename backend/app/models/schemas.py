import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
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
    evidence: str = ""
    note: Optional[str] = None

    @field_validator("score", mode="before")
    @classmethod
    def clamp_answer_score(cls, v: Any) -> int:
        try:
            val = int(round(float(v)))
            return max(0, min(10, val))
        except (ValueError, TypeError):
            return 0

    def model_post_init(self, __context: Any) -> None:
        if not self.evidence and self.note:
            self.evidence = self.note
        elif self.evidence and not self.note:
            self.note = self.evidence


class InterviewTurnOutput(BaseModel):
    score_last_answer: Optional[AnswerScore] = None
    action: str = Field("ask_next", description="follow_up | ask_next | end")
    spoken_text: str = Field(..., min_length=1)
    injection_suspected: bool = False

    @field_validator("action", mode="before")
    @classmethod
    def validate_action(cls, v: Any) -> str:
        if not isinstance(v, str):
            return "ask_next"
        cleaned = v.strip().lower()
        if cleaned == "ask":
            return "ask_next"
        if cleaned not in {"follow_up", "ask_next", "end"}:
            raise ValueError(f"Invalid interview action: {v}")
        return cleaned


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
    spoken_text: str


class InterviewAnswerRequest(BaseModel):
    answer: Optional[str] = None
    transcript_text: Optional[str] = None
    text: Optional[str] = None
    audio_duration_seconds: Optional[float] = None

    def get_clean_answer(self) -> str:
        raw = self.answer if self.answer is not None else (self.transcript_text if self.transcript_text is not None else self.text)
        if not isinstance(raw, str):
            raise ValueError("Answer text is required")
        cleaned = _CTRL_MULTI_LINE_RE.sub("", raw).strip()
        if len(cleaned) < 1 or len(cleaned) > 4000:
            raise ValueError("Answer must be between 1 and 4000 characters")
        return cleaned


# Alias for backward compatibility
InterviewTurnRequest = InterviewAnswerRequest


class InterviewAnswerResponse(BaseModel):
    spoken_text: str
    action: str


InterviewTurnResponse = InterviewAnswerResponse


_ALLOWED_PROCTOR_EVENTS = {
    "tab_hidden",
    "window_blur",
    "fullscreen_exit",
    "paste",
    "copy",
    "no_face",
    "multiple_faces",
}


class GuardianEventRequest(BaseModel):
    type: Optional[str] = None
    event_type: Optional[str] = None
    detail: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    client_timestamp: Optional[datetime] = None

    def get_validated_event(self) -> tuple[str, Optional[str]]:
        raw_type = (self.type if self.type is not None else self.event_type)
        if not isinstance(raw_type, str) or raw_type.strip() not in _ALLOWED_PROCTOR_EVENTS:
            raise ValueError("Invalid proctor event type")
        clean_type = raw_type.strip()

        clean_detail: Optional[str] = None
        if self.detail is not None:
            if not isinstance(self.detail, str) or len(self.detail) > 200:
                raise ValueError("detail must be at most 200 characters")
            if _CTRL_SINGLE_LINE_RE.search(self.detail):
                raise ValueError("detail must not contain control characters")
            clean_detail = self.detail.strip()
        elif self.payload:
            import json as _json
            clean_detail = _json.dumps(self.payload)[:200]

        return clean_type, clean_detail


class GuardianEventResponse(BaseModel):
    trust_score: int


class InterviewFinishResponse(BaseModel):
    status: str = "interviewed"


InterviewCompleteResponse = InterviewFinishResponse


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
    department: Optional[str] = None
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

    @field_validator("deadline", mode="before")
    @classmethod
    def validate_deadline_future(cls, v: Any) -> datetime:
        import re
        if isinstance(v, str):
            s = v.strip()
            has_tz = s.endswith("Z") or s.endswith("z") or re.search(r"[+-]\d{2}:?\d{2}$", s) is not None
            if not has_tz:
                raise ValueError("Deadline must include a timezone offset or 'Z' (e.g., 2026-10-21T18:00:00Z)")
            if s.endswith("Z") or s.endswith("z"):
                s = s[:-1] + "+00:00"
            try:
                dt = datetime.fromisoformat(s)
            except Exception:
                raise ValueError("Invalid ISO 8601 format for deadline")
        elif isinstance(v, datetime):
            if v.tzinfo is None:
                raise ValueError("Deadline must include a timezone offset or 'Z' (e.g., 2026-10-21T18:00:00Z)")
            dt = v
        else:
            raise ValueError("Deadline must be an ISO 8601 string with a timezone offset or 'Z'")

        now = datetime.now(timezone.utc)
        dt_utc = dt.astimezone(timezone.utc)
        if dt_utc < now + timedelta(seconds=60):
            raise ValueError("Deadline must be at least 1 minute in the future")
        return dt_utc

    @field_validator("min_score", mode="before")
    @classmethod
    def validate_min_score(cls, v: Any) -> int:
        val = int(round(float(v)))
        if val < 0 or val > 100:
            raise ValueError("min_score must be between 0 and 100")
        return val


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    top_n: Optional[int] = None
    min_score: Optional[int] = None
    auto_invite: Optional[bool] = None
    deadline: Optional[Any] = None
    status: Optional[str] = None
    department: Optional[str] = None

    @field_validator("deadline", mode="before")
    @classmethod
    def validate_deadline_tz(cls, v: Any) -> Optional[datetime]:
        if v is None:
            return None
        import re
        if isinstance(v, str):
            s = v.strip()
            has_tz = s.endswith("Z") or s.endswith("z") or re.search(r"[+-]\d{2}:?\d{2}$", s) is not None
            if not has_tz:
                raise ValueError("Deadline must include a timezone offset or 'Z' (e.g., 2026-10-21T18:00:00Z)")
            if s.endswith("Z") or s.endswith("z"):
                s = s[:-1] + "+00:00"
            try:
                dt = datetime.fromisoformat(s)
            except Exception:
                raise ValueError("Invalid ISO 8601 format for deadline")
        elif isinstance(v, datetime):
            if v.tzinfo is None:
                raise ValueError("Deadline must include a timezone offset or 'Z' (e.g., 2026-10-21T18:00:00Z)")
            dt = v
        else:
            raise ValueError("Deadline must be an ISO 8601 string with a timezone offset or 'Z'")

        return dt.astimezone(timezone.utc)


class JobDetailResponse(BaseModel):
    id: str
    owner_id: Optional[str] = None
    title: str
    department: Optional[str] = "General"
    description: str
    skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    rubric: Optional[Dict[str, Any]] = None
    top_n: int
    min_score: int
    auto_invite: bool = True
    deadline: datetime
    status: str
    scheduler_ran_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message: Optional[str] = None
    deadline_at: Optional[str] = None
    server_time: Optional[str] = None
    seconds_until_deadline: Optional[int] = None
    scheduler_state: Optional[str] = None


class CandidateStage(BaseModel):
    step: int
    label: str
    detail: str


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
    stage: Optional[CandidateStage] = None


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
    stage: Optional[CandidateStage] = None


class ProgressStepItem(BaseModel):
    step: int
    name: str
    state: str  # "done" | "current" | "upcoming" | "attention"
    summary: str
    counts: Dict[str, Any] = Field(default_factory=dict)


class ProgressNextAction(BaseModel):
    label: str
    hint: str
    type: str  # "info" | "action" | "warning"


class JobProgressResponse(BaseModel):
    current_step: int  # 1..6
    steps: List[ProgressStepItem]
    next_action: Optional[ProgressNextAction] = None
    warnings: List[str] = Field(default_factory=list)
    deadline_at: Optional[str] = None
    server_time: Optional[str] = None
    seconds_until_deadline: Optional[int] = None
    scheduler_ran_at: Optional[str] = None
    scheduler_state: Optional[str] = None


class DeletePreviewResponse(BaseModel):
    candidates: int = 0
    resume_files: int = 0
    interviews: int = 0
    proctor_events: int = 0
    reports: int = 0
    email_logs: int = 0
    agent_runs: int = 0


class JobDeleteRequest(BaseModel):
    confirm_title: str


class JobDeleteResponse(BaseModel):
    deleted: bool = True
    counts: Dict[str, int] = Field(default_factory=dict)


_VALID_CANDIDATE_STATUSES = {
    "applied",
    "shortlisted",
    "invited",
    "interviewing",
    "interviewed",
    "hired",
    "rejected",
    "on_hold",
}

_DECISION_MAP = {
    "hired": "hired",
    "hire": "hired",
    "rejected": "rejected",
    "reject": "rejected",
    "on_hold": "on_hold",
    "hold": "on_hold",
}


VALID_REASON_CATEGORIES = {
    # Part G standard categories
    "candidate_request",
    "recruiter_discretion",
    "technical_issue",
    "interview_interrupted",
    "new_information",
    "compliance_requirement",
    "other",
    # Legacy categories preserved for backwards compatibility
    "prior_experience_not_in_resume",
    "interview_interrupted_tech_issue",
    "disagrees_with_ai_scoring",
    "diversity_equity_inclusion",
    "reference_check_input",
    "portfolio_review",
}


class StatusOverrideRequest(BaseModel):
    status: str
    reason: str
    reason_category: Optional[str] = "other"

    def get_validated(self) -> tuple[str, str, str]:
        s = (self.status or "").strip().lower()
        if s not in _VALID_CANDIDATE_STATUSES:
            raise ValueError("Invalid candidate status")
        cat = (self.reason_category or "other").strip()
        if cat not in VALID_REASON_CATEGORIES:
            raise ValueError(f"Invalid reason_category: {cat}")
        r = (self.reason or "").strip()
        if not r or len(r) < 10 or len(r) > 500 or _CTRL_SINGLE_LINE_RE.search(r):
            raise ValueError("reason is required (10-500 chars)")
        return s, r, cat


class ScoreOverrideRequest(BaseModel):
    score: Optional[float] = None
    hr_score_override: Optional[float] = None
    manual_score: Optional[float] = None
    note: Optional[str] = None
    reason: Optional[str] = None
    reason_category: Optional[str] = "other"

    def get_validated(self) -> tuple[int, str, str]:
        raw_score = (
            self.score
            if self.score is not None
            else (self.hr_score_override if self.hr_score_override is not None else self.manual_score)
        )
        if raw_score is None:
            raise ValueError("score is required")
        val = int(round(float(raw_score)))
        if val < 0 or val > 100:
            raise ValueError("score must be between 0 and 100")

        cat = (self.reason_category or "other").strip()
        if cat not in VALID_REASON_CATEGORIES:
            raise ValueError(f"Invalid reason_category: {cat}")

        raw_note = self.note if self.note is not None else self.reason
        clean_note = (raw_note or "").strip()
        if not clean_note or len(clean_note) < 10 or len(clean_note) > 500 or _CTRL_SINGLE_LINE_RE.search(clean_note):
            raise ValueError("note/reason is required (10-500 chars)")
        return val, clean_note, cat


class DecisionRequest(BaseModel):
    decision: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    reason_category: Optional[str] = None
    send_email: bool = False

    def get_validated(self, is_override: bool = False) -> tuple[str, str, Optional[str], bool]:
        raw_dec = (self.decision or "").strip().lower()
        if raw_dec not in _DECISION_MAP:
            raise ValueError("decision must be hired, rejected, or on_hold")
        target_status = _DECISION_MAP[raw_dec]

        cat = (self.reason_category or ("other" if is_override else "")).strip()
        if is_override and cat and cat not in VALID_REASON_CATEGORIES:
            raise ValueError(f"Invalid reason_category: {cat}")

        raw_reason = self.reason if self.reason is not None else self.notes
        clean_reason = (raw_reason or "").strip()
        if is_override:
            if not clean_reason or len(clean_reason) < 10 or len(clean_reason) > 500 or _CTRL_SINGLE_LINE_RE.search(clean_reason):
                raise ValueError("reason is required for override (10-500 chars)")
        else:
            if clean_reason and (len(clean_reason) > 500 or _CTRL_SINGLE_LINE_RE.search(clean_reason)):
                raise ValueError("reason exceeds allowed length")
            if not clean_reason:
                clean_reason = f"Decision submitted: {target_status}"

        return target_status, clean_reason, (cat or "other" if is_override else None), bool(self.send_email)


class InviteRequest(BaseModel):
    send_email: bool = True
    reason: Optional[str] = "Manual invite by HR"
    reason_category: Optional[str] = "other"


class CancelInviteRequest(BaseModel):
    reason: str = "Invite cancelled by HR"
    reason_category: Optional[str] = "other"

    def get_validated(self) -> tuple[str, str]:
        cat = (self.reason_category or "other").strip()
        if cat not in VALID_REASON_CATEGORIES:
            raise ValueError(f"Invalid reason_category: {cat}")
        r = (self.reason or "").strip()
        if not r or len(r) < 10 or len(r) > 500 or _CTRL_SINGLE_LINE_RE.search(r):
            raise ValueError("reason is required (10-500 chars)")
        return r, cat


class AllowRetryRequest(BaseModel):
    reason: str = "Interview retry allowed by HR"
    reason_category: Optional[str] = "other"

    def get_validated(self) -> tuple[str, str]:
        cat = (self.reason_category or "other").strip()
        if cat not in VALID_REASON_CATEGORIES:
            raise ValueError(f"Invalid reason_category: {cat}")
        r = (self.reason or "").strip()
        if not r or len(r) < 10 or len(r) > 500 or _CTRL_SINGLE_LINE_RE.search(r):
            raise ValueError("reason is required (10-500 chars)")
        return r, cat


class EmailPreviewResponse(BaseModel):
    recipient: str
    subject: str
    html_body: str
    text_body: str
    html: Optional[str] = None
    text: Optional[str] = None


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


# ============================================================================
# Part G: Admin & Override Accountability Schemas
# ============================================================================

class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AdminOverviewResponse(BaseModel):
    hr_users_count: int
    jobs_active_count: int
    jobs_closed_count: int
    candidates_count: int
    interviews_completed_count: int
    decisions_hired_count: int
    decisions_rejected_count: int
    decisions_on_hold_count: int
    overrides_this_week_count: int
    pending_hr_access_requests_count: int
    emails_sent_today_count: int
    trends_applications_14d: List[Dict[str, Any]]
    trends_jobs_14d: List[Dict[str, Any]]


class AdminHRUserItem(BaseModel):
    id: str
    email: str
    full_name: str
    organization: str
    contact_email: str
    reply_to_enabled: bool
    status: str
    jobs_count: int
    candidates_count: int
    override_rate: float
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None


class AdminHRUserDetailResponse(BaseModel):
    id: str
    email: str
    full_name: str
    organization: str
    job_title: str
    contact_email: str
    reply_to_enabled: bool
    status: str
    jobs_count: int
    candidates_count: int
    override_rate: float
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    jobs: List[Dict[str, Any]] = Field(default_factory=list)


class AdminCandidateSummaryResponse(BaseModel):
    email_key: str
    applications_count: int
    interviews_completed_count: int
    portal_last_sign_in: Optional[datetime] = None
    is_blocked: bool = False
    applications: List[Dict[str, Any]] = Field(default_factory=list)


class OverrideQuestionItem(BaseModel):
    id: str
    override_id: str
    admin_id: str
    question: str
    answer: Optional[str] = None
    asked_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None


class HROverrideItem(BaseModel):
    id: str
    job_id: str
    job_title: str
    candidate_id: Optional[str] = None
    candidate_name: str
    override_type: str
    from_value: str
    to_value: str
    reason_category: str
    reason: str
    admin_status: str  # 'pending' | 'reviewed' | 'question_asked' | 'answered'
    admin_note: Optional[str] = None
    created_at: Optional[datetime] = None
    questions: List[OverrideQuestionItem] = Field(default_factory=list)


class HROverridesListResponse(BaseModel):
    overrides: List[HROverrideItem]
    unanswered_questions_count: int = 0


class AdminOverrideItem(BaseModel):
    id: str
    hr_user_id: str
    hr_organization: str
    hr_email: Optional[str] = None
    job_id: str
    job_title: str
    candidate_id: Optional[str] = None
    candidate_name: str
    override_type: str
    from_value: str
    to_value: str
    reason_category: str
    reason: str
    admin_status: str
    admin_note: Optional[str] = None
    created_at: Optional[datetime] = None
    worth_a_look: bool = False
    worth_a_look_reason: Optional[str] = None
    questions: List[OverrideQuestionItem] = Field(default_factory=list)


class AdminOverridesListResponse(BaseModel):
    total: int
    page: int
    limit: int
    overrides: List[AdminOverrideItem]


class AdminOverrideReviewRequest(BaseModel):
    admin_note: Optional[str] = Field(None, max_length=300)


class AdminOverrideQuestionRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=500)


class HROverrideAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=1000)


class RegisterRoleRequest(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str] = ""
    role: str = "hr"
    organization: Optional[str] = ""
    reason: Optional[str] = ""


class HRAccessRequestItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    email: str
    full_name: str = ""
    organization: str = ""
    reason: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

