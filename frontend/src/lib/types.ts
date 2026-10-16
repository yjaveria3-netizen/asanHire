export type CandidateStatus =
  | "applied"
  | "shortlisted"
  | "invited"
  | "interviewing"
  | "interviewed"
  | "hired"
  | "rejected"
  | "on_hold";

export interface RubricCriterion {
  name: string;
  weight?: number;
  description?: string;
  [key: string]: any;
}

export interface Rubric {
  criteria: RubricCriterion[];
  [key: string]: any;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  deadline: string;
  status: string;
  top_n?: number;
  min_score?: number;
  candidate_count?: number;
  rubric?: Rubric;
  [key: string]: any;
}

export interface Candidate {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  status: CandidateStatus;
  resume_score?: number;
  manual_score_override?: number;
  effective_score?: number;
  override_reason?: string;
  rank?: number;
  created_at?: string;
  evaluation_report?: EvaluationReport;
  proctoring_events?: ProctoringEvent[];
  audit_logs?: AuditLog[];
  [key: string]: any;
}

export interface EvaluationReport {
  id?: string;
  candidate_id?: string;
  recommendation?: "Hire" | "Reject" | "Hold" | string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  key_strengths?: string[];
  red_flags?: string[];
  technical_rating?: number;
  communication_rating?: number;
  cultural_rating?: number;
  score?: number;
  rubric_scores?: Record<string, number>;
  [key: string]: any;
}

export interface ProctoringEvent {
  id?: string;
  candidate_id?: string;
  type?: string;
  event_type: string;
  timestamp?: string;
  penalty?: number;
  payload?: any;
  details?: any;
  [key: string]: any;
}

export interface AuditLog {
  id?: string;
  action: string;
  performed_by: string;
  reason?: string;
  timestamp: string;
  metadata?: any;
  [key: string]: any;
}

export interface TranscriptMessage {
  speaker?: "agent" | "candidate" | string;
  message?: string;
  sender?: string;
  text?: string;
  timestamp?: string;
  [key: string]: any;
}
