import { CandidateStatus } from "./types";

export const CANDIDATE_STATUSES: { value: CandidateStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "invited", label: "Invited" },
  { value: "interviewing", label: "Interviewing" },
  { value: "interviewed", label: "Interviewed" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "on_hold", label: "On Hold" },
];

export const OVERRIDE_REASON_CATEGORIES = [
  { value: "candidate_request", label: "Candidate Request" },
  { value: "recruiter_discretion", label: "Recruiter Discretion" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "interview_interrupted", label: "Interview Interrupted" },
  { value: "new_information", label: "New Information" },
  { value: "compliance_requirement", label: "Compliance Requirement" },
  { value: "other", label: "Other" },
] as const;

export type OverrideReasonCategory = typeof OVERRIDE_REASON_CATEGORIES[number]["value"];
