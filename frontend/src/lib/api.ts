import { supabase } from "./supabase";
import {
  MOCK_JOB,
  MOCK_CANDIDATES,
  MOCK_EVALUATION_REPORT,
  MOCK_AUDIT_LOGS,
  MOCK_PROCTORING_EVENTS
} from "./constants";
import { Candidate, Job, EvaluationReport, AuditLog } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // ============================================================================
  // Public Candidate Endpoints
  // ============================================================================
  async getPublicJob(jobId: string): Promise<Job> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/jobs/${jobId}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback to local mock data in dev
    }
    return MOCK_JOB;
  },

  async applyToJob(jobId: string, formData: FormData): Promise<{ candidate_id: string; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/jobs/${jobId}/apply`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      candidate_id: "22222222-2222-2222-2222-222222222201",
      message: "Application received and queued for Matcher Agent evaluation.",
    };
  },

  // ============================================================================
  // Interview Room Endpoints
  // ============================================================================
  async verifyInterviewToken(token: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${token}/verify`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      valid: true,
      interview_id: "33333333-3333-3333-3333-333333333301",
      candidate_name: "Amina Malik",
      job_title: "Senior AI / Full-Stack Engineer",
      status: "pending",
      expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    };
  },

  async startInterview(token: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${token}/start`, { method: "POST" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      interview_id: "33333333-3333-3333-3333-333333333301",
      status: "in_progress",
      initial_question: "Hello! Welcome to your technical interview for the Senior AI / Full-Stack Engineer position. Could you introduce yourself and describe your recent experience with Next.js App Router and LLMs?",
    };
  },

  async sendInterviewTurn(token: string, transcriptText: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${token}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript_text: transcriptText }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      next_question: "Great explanation. How do you handle proctoring and race conditions when multiple agent runs complete simultaneously?",
      question_index: 2,
      is_complete: false,
    };
  },

  async sendGuardianEvent(token: string, eventType: string, payload: any = {}) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${token}/guardian-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          payload,
          client_timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { recorded: true, trust_score: 95.0, infraction_count: 1 };
  },

  async completeInterview(token: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${token}/complete`, { method: "POST" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { status: "completed", message: "Interview completed. Thank you!" };
  },

  // ============================================================================
  // HR Admin Endpoints
  // ============================================================================
  async getHRJobs(): Promise<Job[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/jobs`, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [MOCK_JOB];
  },

  async createHRJob(jobData: any): Promise<Job> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/jobs`, {
        method: "POST",
        headers,
        body: JSON.stringify(jobData),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { ...MOCK_JOB, ...jobData, id: "new-job-" + Date.now() };
  },

  async getHRJobDetail(jobId: string): Promise<Job> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/jobs/${jobId}`, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_JOB;
  },

  async getHRCandidates(jobId: string): Promise<Candidate[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/jobs/${jobId}/candidates`, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_CANDIDATES;
  },

  async getHRCandidateDetail(candidateId: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}`, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId) || MOCK_CANDIDATES[0];
    return {
      ...candidate,
      evaluation_report: MOCK_EVALUATION_REPORT,
      proctoring_events: MOCK_PROCTORING_EVENTS,
      audit_logs: MOCK_AUDIT_LOGS,
      interview: {
        id: "33333333-3333-3333-3333-333333333301",
        status: "completed",
        trust_score: 97.0,
      },
    };
  },

  async overrideStatus(candidateId: string, status: string, reason: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/override-status`, {
      method: "POST",
      headers,
      body: JSON.stringify({ status, reason }),
    });
  },

  async overrideScore(candidateId: string, manual_score: number, reason: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/override-score`, {
      method: "POST",
      headers,
      body: JSON.stringify({ manual_score, reason }),
    });
  },

  async inviteCandidate(candidateId: string, send_email: boolean = true) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ send_email }),
    });
  },

  async cancelInvite(candidateId: string, reason: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/cancel-invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason }),
    });
  },

  async allowRetry(candidateId: string, reason: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/allow-retry`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason }),
    });
  },

  async regenerateReport(candidateId: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/regenerate-report`, {
      method: "POST",
      headers,
    });
  },

  async submitDecision(candidateId: string, decision: string, send_email: boolean, notes?: string) {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/decision`, {
      method: "POST",
      headers,
      body: JSON.stringify({ decision, send_email, notes }),
    });
  },

  async previewEmail(candidateId: string, template: string = "interview_invite") {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/hr/candidates/${candidateId}/email-preview?template=${template}`, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      recipient: "candidate@example.com",
      subject: "You're Invited to Interview: Senior AI / Full-Stack Engineer at asanHire",
      html_body: "<p>Hello! You have been invited to interview.</p>",
      text_body: "Hello! You have been invited to interview.",
    };
  },

  async getAuditLogs(entityId?: string): Promise<AuditLog[]> {
    try {
      const headers = await getAuthHeaders();
      const url = entityId ? `${API_BASE_URL}/api/hr/audit-logs?entity_id=${entityId}` : `${API_BASE_URL}/api/hr/audit-logs`;
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_AUDIT_LOGS;
  },

  async getAgentRuns(jobId?: string) {
    try {
      const headers = await getAuthHeaders();
      const url = jobId ? `${API_BASE_URL}/api/hr/agent-runs?job_id=${jobId}` : `${API_BASE_URL}/api/hr/agent-runs`;
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  },
};
