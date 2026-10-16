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
