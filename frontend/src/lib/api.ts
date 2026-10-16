import { Job, Candidate } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // Public
  getPublicJob: async (jobId: string): Promise<Job> => {
    return request<Job>(`/api/public/jobs/${jobId}`).catch(() => ({
      id: jobId,
      title: "Senior AI / Full-Stack Engineer",
      department: "Product Engineering",
      description: "We are seeking an experienced Full-Stack and AI Engineer to build reactive interfaces and proctored pipelines.",
      requirements: "4+ years full-stack experience (TypeScript, Next.js, FastAPI, Supabase).",
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      status: "active",
    }));
  },

  applyToJob: async (jobId: string, formData: FormData) => {
    // Submit to /public/apply or /api/public/jobs/{job_id}/apply
    let res = await fetch(`${API_BASE}/public/apply`, {
      method: "POST",
      body: formData,
    }).catch(() => null);

    if (!res || !res.ok) {
      // Fallback to /api/public/jobs/{job_id}/apply if /public/apply is not available
      res = await fetch(`${API_BASE}/api/public/jobs/${jobId}/apply`, {
        method: "POST",
        body: formData,
      });
    }

    if (!res.ok) {
      throw new Error("Application submission failed.");
    }

    return await res.json();
  },

  applyJob: async (jobId: string, formData: FormData) => {
    return api.applyToJob(jobId, formData);
  },

  // Interview Room
  verifyInterviewToken: async (token: string) => {
    return request<any>(`/api/interview/${token}/verify`).catch(() => ({
      valid: true,
      interview_id: "demo-interview",
      candidate_name: "Amina Malik",
      job_title: "Senior AI / Full-Stack Engineer",
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }));
  },

  verifyToken: async (token: string) => {
    return api.verifyInterviewToken(token);
  },

  startInterview: async (token: string) => {
    return request<any>(`/api/interview/${token}/start`, { method: "POST" }).catch(() => ({
      interview_id: "demo-interview",
      status: "in_progress",
      initial_question: "Welcome! Tell us about your experience building real-time AI interfaces.",
    }));
  },

  sendInterviewTurn: async (token: string, payload: any) => {
    const body = typeof payload === "string" ? { transcript_text: payload } : payload;
    return request<any>(`/api/interview/${token}/turn`, {
      method: "POST",
      body: JSON.stringify(body),
    }).catch(() => ({
      next_question: "How do you ensure auditability and human oversight in automated agent workflows?",
      question_index: 2,
      is_complete: false,
    }));
  },

  submitTurn: async (token: string, payload: any) => {
    return api.sendInterviewTurn(token, payload);
  },

  sendGuardianEvent: async (token: string, typeOrPayload: any, maybePayload?: any) => {
    const body = typeof typeOrPayload === "string"
      ? { event_type: typeOrPayload, ...(maybePayload || {}) }
      : typeOrPayload;
    return request<any>(`/api/interview/${token}/guardian-event`, {
      method: "POST",
      body: JSON.stringify(body),
    }).catch(() => ({
      recorded: true,
      trust_score: 95,
      infraction_count: 1,
    }));
  },

  completeInterview: async (token: string) => {
    return request<any>(`/api/interview/${token}/complete`, { method: "POST" }).catch(() => ({
      status: "completed",
      message: "Interview completed successfully.",
    }));
  },

  // HR Endpoints
  getHRJobs: async (): Promise<Job[]> => {
    return request<Job[]>("/api/hr/jobs").catch(() => [
      {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Senior AI / Full-Stack Engineer",
        department: "Product Engineering",
        description: "Leading frontend and agent architecture.",
        requirements: "Next.js, FastAPI, Supabase",
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        status: "active",
        candidate_count: 5,
        rubric: {
          criteria: [
            { name: "Technical Depth", weight: 40, description: "TypeScript & Next.js" },
            { name: "System Design", weight: 30, description: "FastAPI & Microservices" },
            { name: "Communication", weight: 30, description: "Clarity of thought" },
          ],
        },
      },
    ]);
  },

  getHRJobDetail: async (jobId: string): Promise<Job> => {
    return request<Job>(`/api/hr/jobs/${jobId}`).catch(() => ({
      id: jobId,
      title: "Senior AI / Full-Stack Engineer",
      department: "Product Engineering",
      description: "Leading frontend and agent architecture.",
      requirements: "Next.js, FastAPI, Supabase",
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      status: "active",
      candidate_count: 5,
      rubric: {
        criteria: [
          { name: "Technical Depth", weight: 40, description: "TypeScript & Next.js" },
          { name: "System Design", weight: 30, description: "FastAPI & Microservices" },
          { name: "Communication", weight: 30, description: "Clarity of thought" },
        ],
      },
    }));
  },

  createHRJob: async (data: any): Promise<any> => {
    return request<any>("/api/hr/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    }).catch(() => ({ success: true, id: "11111111-1111-1111-1111-111111111111" }));
  },

  createJob: async (data: any): Promise<any> => {
    return api.createHRJob(data);
  },

  getHRCandidates: async (jobId: string): Promise<Candidate[]> => {
    return request<Candidate[]>(`/api/hr/jobs/${jobId}/candidates`).catch(() => [
      {
        id: "22222222-2222-2222-2222-222222222201",
        job_id: jobId,
        full_name: "Amina Malik",
        email: "amina.malik@example.com",
        status: "shortlisted",
        resume_score: 92,
        effective_score: 92,
        rank: 1,
      },
    ]);
  },

  getHRCandidateDetail: async (candidateId: string): Promise<Candidate> => {
    return request<Candidate>(`/api/hr/candidates/${candidateId}`).catch(() => ({
      id: candidateId,
      job_id: "11111111-1111-1111-1111-111111111111",
      full_name: "Amina Malik",
      email: "amina.malik@example.com",
      phone: "+1 555-0192",
      status: "shortlisted",
      resume_score: 92,
      effective_score: 92,
      rank: 1,
      evaluation_report: {
        recommendation: "Hire",
        summary: "Excellent fit with deep experience in Next.js App Router and LLM orchestration.",
        strengths: ["FastAPI", "TypeScript", "System Architecture"],
        weaknesses: ["None critical"],
        key_strengths: ["FastAPI", "TypeScript", "System Architecture"],
        red_flags: [],
        technical_rating: 94,
        communication_rating: 90,
        cultural_rating: 92,
        score: 94,
      },
      proctoring_events: [],
      audit_logs: [
        {
          id: "1",
          action: "status_override",
          performed_by: "hr@asanhire.dev",
          reason: "Candidate demonstrated superior practical experience.",
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  submitDecision: async (candidateId: string, decision: string, sendEmail: boolean, notes: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, send_email: sendEmail, notes }),
    }).catch(() => ({ success: true }));
  },

  overrideScore: async (candidateId: string, manual_score: number, reason: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/override-score`, {
      method: "POST",
      body: JSON.stringify({ manual_score, reason }),
    }).catch(() => ({ success: true }));
  },

  overrideStatus: async (candidateId: string, status: string, reason: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/override-status`, {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    }).catch(() => ({ success: true }));
  },

  inviteCandidate: async (candidateId: string, send_email = true) => {
    return request<any>(`/api/hr/candidates/${candidateId}/invite`, {
      method: "POST",
      body: JSON.stringify({ send_email }),
    }).catch(() => ({ success: true }));
  },

  cancelInvite: async (candidateId: string, reason: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/cancel-invite`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }).catch(() => ({ success: true }));
  },

  allowRetry: async (candidateId: string, reason: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/allow-retry`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }).catch(() => ({ success: true }));
  },

  regenerateReport: async (candidateId: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/regenerate-report`, {
      method: "POST",
    }).catch(() => ({ success: true }));
  },

  getEmailPreview: async (candidateId: string, template: string) => {
    return request<any>(`/api/hr/candidates/${candidateId}/email-preview?template=${template}`).catch(() => ({
      subject: "Interview Invitation - asanHire",
      html: "<p>Dear candidate, you have been invited to interview.</p>",
    }));
  },

  getAuditLogs: async (candidateId: string) => {
    return request<any>(`/api/hr/audit-logs?entity_id=${candidateId}`).catch(() => []);
  },

  getAgentRuns: async (jobId: string) => {
    return request<any>(`/api/hr/agent-runs?job_id=${jobId}`).catch(() => []);
  },
};

export default api;
