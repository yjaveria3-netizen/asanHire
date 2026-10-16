from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# ============================================================================
# 1. LLM Structured Output Schemas
# ============================================================================

class RubricCriterion(BaseModel):
    name: str = Field(..., description="Name of the evaluation criterion")
    weight: int = Field(..., ge=1, le=100, description="Integer percentage weight")
    description: str = Field(..., description="Evaluation guide and rubric standard")

class RubricOutput(BaseModel):
    version: str = "1.0"
    criteria: List[RubricCriterion]

    @field_validator("criteria")
    def validate_weights_sum(cls, criteria: List[RubricCriterion]):
        total_weight = sum(c.weight for c in criteria)
        if total_weight != 100:
            raise ValueError(f"Rubric criteria weights must sum to 100 (got {total_weight})")
        return criteria

class MatcherCriterionDetail(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)
    feedback: str

class MatcherOutput(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    summary: str
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    criteria_breakdown: Dict[str, MatcherCriterionDetail] = Field(default_factory=dict)
    injection_suspected: bool = False

    @field_validator("overall_score", mode="before")
    def clamp_score(cls, v):
        try:
            val = float(v)
            return max(0.0, min(100.0, val))
        except (ValueError, TypeError):
            return 0.0

class InterviewTurnOutput(BaseModel):
    next_question: str
    question_index: int = Field(..., ge=1, le=5)
    is_complete: bool = False
    interviewer_notes: Optional[str] = None

class SupervisorReportOutput(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    recommendation: str = Field(..., pattern="^(Hire|Reject|Hold)$")
    summary: str
    technical_rating: float = Field(..., ge=0.0, le=100.0)
    communication_rating: float = Field(..., ge=0.0, le=100.0)
    cultural_rating: float = Field(..., ge=0.0, le=100.0)
    key_strengths: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    rubric_scores: Dict[str, float] = Field(default_factory=dict)

    @field_validator("overall_score", "technical_rating", "communication_rating", "cultural_rating", mode="before")
    def clamp_ratings(cls, v):
        try:
            val = float(v)
            return max(0.0, min(100.0, val))
        except (ValueError, TypeError):
            return 0.0

# ============================================================================
# 2. Public API Schemas
# ============================================================================

class JobPublicResponse(BaseModel):
    id: str
    title: str
    department: str
    description: str
    requirements: str
    deadline: datetime
    status: str

class ApplicationSubmitResponse(BaseModel):
    candidate_id: str
    status: str
    message: str

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
    title: str = Field(..., min_length=3, max_length=120)
    department: str = Field(..., min_length=2, max_length=80)
    description: str = Field(..., min_length=10)
    requirements: str = Field(..., min_length=10)
    top_n: int = Field(5, ge=1, le=50)
    min_score: float = Field(60.0, ge=0.0, le=100.0)
    deadline: datetime

class JobDetailResponse(BaseModel):
    id: str
    title: str
    department: str
    description: str
    requirements: str
    rubric: Dict[str, Any]
    top_n: int
    min_score: float
    deadline: datetime
    status: str
    candidate_count: int = 0
    created_at: datetime

class CandidateSummaryResponse(BaseModel):
    id: str
    job_id: str
    full_name: str
    email: str
    status: str
    resume_score: Optional[float] = None
    manual_score_override: Optional[float] = None
    effective_score: Optional[float] = None
    created_at: datetime

class CandidateDetailResponse(BaseModel):
    id: str
    job_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_url: str
    status: str
    resume_score: Optional[float] = None
    resume_feedback: Dict[str, Any] = Field(default_factory=dict)
    manual_score_override: Optional[float] = None
    override_reason: Optional[str] = None
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
    id: str
    user_id: Optional[str] = None
    entity_type: str
    entity_id: str
    action: str
    previous_state: Dict[str, Any]
    new_state: Dict[str, Any]
    reason: str
    created_at: datetime

class AgentRunResponse(BaseModel):
    id: str
    agent_name: str
    job_id: Optional[str] = None
    candidate_id: Optional[str] = None
    model_used: str
    status: str
    execution_time_ms: int
    tokens_used: int
    created_at: datetime
