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

export interface CandidateStage {
  step: number;
  label: string;
  detail: string;
}

export interface ProgressStepItem {
  step: number;
  name: string;
  state: "done" | "current" | "upcoming" | "attention";
  summary: string;
  counts: Record<string, any>;
}

export interface ProgressNextAction {
  label: string;
  hint: string;
  type: "info" | "action" | "warning";
}

export interface JobProgress {
  current_step: number;
  steps: ProgressStepItem[];
  next_action: ProgressNextAction | null;
  warnings: string[];
  deadline_at?: string;
  server_time?: string;
  seconds_until_deadline?: number;
  scheduler_ran_at?: string;
  scheduler_state?: "waiting" | "due_now" | "ran" | "disabled" | string;
}

export interface DeletePreview {
  candidates: number;
  resume_files: number;
  interviews: number;
  proctor_events: number;
  reports: number;
  email_logs: number;
  agent_runs: number;
}

export interface Job {
  id: string;
  title: string;
  department?: string;
  description: string;
  requirements?: string;
  skills?: string[];
  experience_level?: string;
  deadline: string;
  status: string;
  top_n?: number;
  min_score?: number;
  auto_invite?: boolean;
  candidate_count?: number;
  rubric?: Rubric;
  deadline_at?: string;
  server_time?: string;
  seconds_until_deadline?: number;
  scheduler_ran_at?: string;
  scheduler_state?: "waiting" | "due_now" | "ran" | "disabled" | string;
  created_at?: string;
  updated_at?: string;
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
  stage?: CandidateStage;
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

export interface HROverrideQuestion {
  id: string;
  override_id: string;
  admin_id?: string;
  question: string;
  answer?: string | null;
  asked_at: string;
  answered_at?: string | null;
}

export interface HROverrideEvent {
  id: string;
  hr_user_id: string;
  job_id: string;
  candidate_id: string;
  candidate_name?: string | null;
  job_title?: string | null;
  hr_email?: string | null;
  override_type: "status" | "score" | "decision" | "invite_below_min" | "cancel_invite" | "retry" | string;
  from_value?: string | null;
  to_value?: string | null;
  reason_category: string;
  reason: string;
  reviewed_by_admin: boolean;
  reviewed_at?: string | null;
  created_at: string;
  questions?: HROverrideQuestion[];
  worth_a_look?: boolean;
}

export interface AdminOverview {
  total_hr_users: number;
  active_jobs: number;
  closed_jobs: number;
  total_candidates: number;
  completed_interviews: number;
  total_decisions: number;
  overrides_this_week: number;
  pending_access_requests: number;
  emails_sent_today: number;
  trends_14d: {
    dates: string[];
    applications: number[];
    jobs_created: number[];
  };
}

export interface AdminHRUser {
  id: string;
  email: string;
  full_name?: string;
  organization?: string;
  contact_email?: string;
  reply_to_enabled: boolean;
  role: string;
  jobs_count: number;
  candidates_count: number;
  decisions_count: number;
  overrides_count: number;
  override_rate_pct: number;
  last_active?: string;
  created_at: string;
}

export interface AdminCandidateApplication {
  job_id: string;
  job_title: string;
  applied_at: string;
  status: string;
  hr_email?: string;
}

export interface AdminCandidateLookupResult {
  email_key: string;
  is_blocked: boolean;
  blocked_reason?: string;
  applications: AdminCandidateApplication[];
}

export interface HRAccessRequest {
  id: string;
  user_id?: string;
  email: string;
  full_name?: string;
  organization?: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}
