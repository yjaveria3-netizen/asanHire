export type CandidateStatus =
  | "applied"
  | "shortlisted"
  | "invited"
  | "interviewing"
  | "interviewed"
  | "hired"
  | "rejected"
  | "on_hold";

export type JobStatus = "draft" | "active" | "closed";

export type InterviewStatus = "pending" | "in_progress" | "completed" | "expired" | "revoked";

export type ProctoringEventType =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "paste"
  | "copy"
  | "no_face"
  | "multiple_faces";

export interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface JobRubric {
  version: string;
  criteria: RubricCriterion[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  rubric: JobRubric;
  top_n: number;
  min_score: number;
  deadline: string;
  status: JobStatus;
  candidate_count?: number;
  created_at: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url: string;
  resume_text?: string;
  status: CandidateStatus;
  resume_score?: number;
  resume_feedback?: {
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    criteria_breakdown?: Record<string, { score: number; feedback: string }>;
  };
  manual_score_override?: number;
  override_reason?: string;
  created_at: string;
}

export interface TranscriptMessage {
  speaker: "agent" | "candidate";
  message: string;
  timestamp?: string;
}

export interface ProctoringEvent {
  id: string;
  interview_id: string;
  event_type: ProctoringEventType;
  penalty: number;
  payload: Record<string, any>;
  client_timestamp: string;
}

export interface EvaluationReport {
  id: string;
  candidate_id: string;
  interview_id: string;
  overall_score: number;
  recommendation: "Hire" | "Reject" | "Hold";
  summary: string;
  technical_rating: number;
  communication_rating: number;
  cultural_rating: number;
  key_strengths: string[];
  red_flags: string[];
  rubric_scores: Record<string, number>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_state: Record<string, any>;
  new_state: Record<string, any>;
  reason: string;
  created_at: string;
}
