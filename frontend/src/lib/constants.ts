import { Candidate, Job, EvaluationReport, AuditLog, ProctoringEvent } from "./types";

export const CANDIDATE_STATUSES = [
  { value: "applied", label: "Applied", color: "bg-[#2A2D2A] text-[#8A8B82] border border-[#8A8B82]" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-[rgba(252,248,216,0.1)] text-[#FCF8D8] border border-[#FCF8D8]" },
  { value: "invited", label: "Invited", color: "bg-transparent text-[#DD700B] border border-[#DD700B]" },
  { value: "interviewing", label: "Interviewing", color: "bg-[rgba(221,112,11,0.15)] text-[#DD700B] border border-[#DD700B]" },
  { value: "interviewed", label: "Interviewed", color: "bg-[#2A2D2A] text-[#D9DADF] border border-[#D9DADF]" },
  { value: "hired", label: "Hired", color: "bg-[rgba(62,90,68,0.25)] text-[#8FD19E] border border-[#689F77]" },
  { value: "rejected", label: "Rejected", color: "bg-[rgba(90,42,42,0.25)] text-[#E57373] border border-[#9E4A4A]" },
  { value: "on_hold", label: "On Hold", color: "bg-transparent text-[#FCF8D8] border border-dashed border-[#FCF8D8]" },
] as const;

export const PROCTORING_PENALTIES = {
  tab_hidden: 8.0,
  window_blur: 3.0,
  fullscreen_exit: 10.0,
  paste: 10.0,
  copy: 3.0,
  no_face: 5.0,
  multiple_faces: 15.0,
};

export const MOCK_JOB: Job = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Senior AI / Full-Stack Engineer",
  department: "Product Engineering",
  description: "We are seeking an experienced Full-Stack and AI Engineer to spearhead our next-generation agentic workflows, LLM orchestration, and high-performance reactive web applications.",
  requirements: "4+ years full-stack experience (TypeScript, Next.js, FastAPI, Python). Production experience with LLMs (Groq, Gemini, Anthropic), vector embeddings, and autonomous agent patterns. Strong distributed systems design.",
  rubric: {
    version: "1.0",
    criteria: [
      { name: "Technical Breadth & Next.js", weight: 25, description: "Hands-on experience with App Router, TypeScript, and state management." },
      { name: "AI & LLM Orchestration", weight: 35, description: "Production experience building agents, tool calling, and prompt engineering." },
      { name: "Backend & Database", weight: 25, description: "FastAPI, PostgreSQL / Supabase, RLS, and secure RESTful architectures." },
      { name: "System Architecture & Security", weight: 15, description: "Knowledge of auth tokens, input validation, and defensive programming." }
    ]
  },
  top_n: 3,
  min_score: 70.0,
  deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  status: "active",
  candidate_count: 5,
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    job_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Amina Malik",
    email: "amina.malik@example.com",
    phone: "+1 555-0101",
    resume_url: "https://storage.asanhire.dev/resumes/demo_amina.pdf",
    resume_text: "Senior Full-Stack AI Engineer with 6 years building Next.js 14 applications...",
    status: "interviewed",
    resume_score: 92.5,
    resume_feedback: {
      summary: "Exceptional fit with deep knowledge of App Router, FastAPI, and real-time voice LLM integration.",
      strengths: ["6 yrs Next.js & FastAPI", "Groq & Gemini agent orchestration", "Production RLS security"],
      gaps: []
    },
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    job_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Bilal Tariq",
    email: "bilal.tariq@example.com",
    phone: "+1 555-0102",
    resume_url: "https://storage.asanhire.dev/resumes/demo_bilal.pdf",
    status: "interviewing",
    resume_score: 85.0,
    resume_feedback: {
      summary: "Strong core developer with solid React and Python foundation.",
      strengths: ["Solid Next.js and Tailwind", "FastAPI microservices"],
      gaps: ["Lacks voice LLM low-latency experience"]
    },
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    job_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Clara Vance",
    email: "clara.vance@example.com",
    phone: "+1 555-0103",
    resume_url: "https://storage.asanhire.dev/resumes/demo_clara.pdf",
    status: "invited",
    resume_score: 78.0,
    resume_feedback: {
      summary: "Great frontend skills, passes the minimum threshold.",
      strengths: ["Clean TypeScript/UI code", "Supabase auth experience"],
      gaps: ["Limited Python & agentic backend exposure"]
    },
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222204",
    job_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Devon Patel",
    email: "devon.patel@example.com",
    phone: "+1 555-0104",
    resume_url: "https://storage.asanhire.dev/resumes/demo_devon.pdf",
    status: "shortlisted",
    resume_score: 74.0,
    resume_feedback: {
      summary: "Passes minimum threshold (70.0) but currently ranked 4th, outside top N=3 auto-invite quota.",
      strengths: ["Strong SQL and relational modeling"],
      gaps: ["Lacks Next.js production experience"]
    },
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222205",
    job_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Elena Rostova",
    email: "elena.rostova@example.com",
    phone: "+1 555-0105",
    resume_url: "https://storage.asanhire.dev/resumes/demo_elena.pdf",
    status: "applied",
    resume_score: 52.0,
    resume_feedback: {
      summary: "Does not meet minimum qualification threshold (score 52.0 < 60.0).",
      strengths: ["Enthusiastic entry-level engineer"],
      gaps: ["Insufficient years of experience", "No production LLM exposure"]
    },
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  }
];

export const MOCK_EVALUATION_REPORT: EvaluationReport = {
  id: "55555555-5555-5555-5555-555555555501",
  candidate_id: "22222222-2222-2222-2222-222222222201",
  interview_id: "33333333-3333-3333-3333-333333333301",
  overall_score: 94.0,
  recommendation: "Hire",
  summary: "Amina demonstrated world-class mastery of AI orchestration, WebSockets, and state consistency. High integrity score (97/100). Strongly recommended for immediate hire.",
  technical_rating: 96.0,
  communication_rating: 92.0,
  cultural_rating: 94.0,
  key_strengths: [
    "Architectural clarity on real-time streaming",
    "Strong security mindset",
    "Deep Next.js App Router experience"
  ],
  red_flags: [],
  rubric_scores: {
    "Technical Breadth & Next.js": 95,
    "AI & LLM Orchestration": 98,
    "Backend & Database": 92,
    "System Architecture & Security": 91
  },
  created_at: new Date(Date.now() - 23 * 3600 * 1000).toISOString()
};

export const MOCK_PROCTORING_EVENTS: ProctoringEvent[] = [
  {
    id: "44444444-4444-4444-4444-444444444401",
    interview_id: "33333333-3333-3333-3333-333333333301",
    event_type: "window_blur",
    penalty: 3.0,
    payload: { duration_ms: 1200, note: "Minor focus lost to desktop notification" },
    client_timestamp: new Date(Date.now() - 23.5 * 3600 * 1000).toISOString()
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "66666666-6666-6666-6666-666666666601",
    user_id: "00000000-0000-0000-0000-000000000001",
    entity_type: "candidate",
    entity_id: "22222222-2222-2222-2222-222222222201",
    action: "status_override",
    previous_state: { status: "interviewing" },
    new_state: { status: "interviewed" },
    reason: "Automated completion after successful supervisor evaluation report generated.",
    created_at: new Date(Date.now() - 23 * 3600 * 1000).toISOString()
  }
];
