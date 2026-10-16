-- ============================================================================
-- asanHire Database Migration: 001_init.sql
-- Architecture: Supabase PostgreSQL + RLS + Triggers + Indexes
-- ============================================================================

-- Enable pgcrypto and uuid extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE candidate_status AS ENUM (
        'applied',
        'shortlisted',
        'invited',
        'interviewing',
        'interviewed',
        'hired',
        'rejected',
        'on_hold'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'draft',
        'active',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interview_status AS ENUM (
        'pending',
        'in_progress',
        'completed',
        'expired',
        'revoked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proctoring_event_type AS ENUM (
        'tab_hidden',
        'window_blur',
        'fullscreen_exit',
        'paste',
        'copy',
        'no_face',
        'multiple_faces'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Table: jobs
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    rubric JSONB DEFAULT '{}'::jsonb,
    top_n INTEGER NOT NULL DEFAULT 5 CHECK (top_n > 0),
    min_score NUMERIC(5,2) NOT NULL DEFAULT 60.00 CHECK (min_score >= 0 AND min_score <= 100),
    deadline TIMESTAMPTZ NOT NULL,
    status job_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: candidates
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT NOT NULL,
    resume_text TEXT,
    status candidate_status NOT NULL DEFAULT 'applied',
    resume_score NUMERIC(5,2) CHECK (resume_score >= 0 AND resume_score <= 100),
    resume_feedback JSONB DEFAULT '{}'::jsonb,
    manual_score_override NUMERIC(5,2) CHECK (manual_score_override >= 0 AND manual_score_override <= 100),
    override_reason TEXT,
    override_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: interviews
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    status interview_status NOT NULL DEFAULT 'pending',
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    trust_score NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (trust_score >= 0 AND trust_score <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: proctoring_events
CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    event_type proctoring_event_type NOT NULL,
    penalty NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: evaluation_reports
CREATE TABLE IF NOT EXISTS public.evaluation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    recommendation TEXT NOT NULL CHECK (recommendation IN ('Hire', 'Reject', 'Hold')),
    summary TEXT NOT NULL,
    technical_rating NUMERIC(5,2) NOT NULL CHECK (technical_rating >= 0 AND technical_rating <= 100),
    communication_rating NUMERIC(5,2) NOT NULL CHECK (communication_rating >= 0 AND communication_rating <= 100),
    cultural_rating NUMERIC(5,2) NOT NULL CHECK (cultural_rating >= 0 AND cultural_rating <= 100),
    key_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: agent_runs
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
    model_used TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    tokens_used INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    previous_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    resend_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON public.candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_resume_score ON public.candidates(resume_score DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_token_hash ON public.interviews(token_hash);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_interview_id ON public.proctoring_events(interview_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_job ON public.agent_runs(job_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- JOBS POLICIES:
-- 1. Public can view active jobs
CREATE POLICY "Public can view active jobs" ON public.jobs
    FOR SELECT USING (status = 'active');

-- 2. HR can view all jobs they created
CREATE POLICY "HR can view own jobs" ON public.jobs
    FOR SELECT TO authenticated USING (auth.uid() = created_by);

-- 3. HR can insert/update/delete jobs they own
CREATE POLICY "HR can manage own jobs" ON public.jobs
    FOR ALL TO authenticated USING (auth.uid() = created_by);

-- CANDIDATES POLICIES:
-- 1. Public can submit application for an active job
CREATE POLICY "Public can apply to active jobs" ON public.candidates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = job_id AND public.jobs.status = 'active'
        )
    );

-- 2. HR can view and manage candidates for jobs they own
CREATE POLICY "HR can manage candidates for their jobs" ON public.candidates
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = candidates.job_id AND public.jobs.created_by = auth.uid()
        )
    );

-- INTERVIEWS POLICIES:
-- 1. HR can view interviews for their jobs
CREATE POLICY "HR can view interviews" ON public.interviews
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = interviews.job_id AND public.jobs.created_by = auth.uid()
        )
    );

-- PROCTORING EVENTS POLICIES:
-- 1. HR can view proctoring events
CREATE POLICY "HR can view proctoring events" ON public.proctoring_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            JOIN public.jobs ON public.jobs.id = interviews.job_id
            WHERE public.interviews.id = proctoring_events.interview_id
              AND public.jobs.created_by = auth.uid()
        )
    );

-- REPORTS POLICIES:
-- 1. HR can view reports
CREATE POLICY "HR can view reports" ON public.evaluation_reports
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.candidates
            JOIN public.jobs ON public.jobs.id = candidates.job_id
            WHERE public.candidates.id = evaluation_reports.candidate_id
              AND public.jobs.created_by = auth.uid()
        )
    );

-- AUDIT LOGS POLICIES:
-- 1. HR can view audit logs
CREATE POLICY "HR can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

-- AGENT RUNS POLICIES:
-- 1. HR can view agent runs
CREATE POLICY "HR can view agent runs" ON public.agent_runs
    FOR SELECT TO authenticated USING (
        job_id IS NULL OR EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = agent_runs.job_id AND public.jobs.created_by = auth.uid()
        )
    );

-- EMAIL LOGS POLICIES:
-- 1. Authenticated HR can view email logs
CREATE POLICY "HR can view email logs" ON public.email_logs
    FOR SELECT TO authenticated USING (true);
