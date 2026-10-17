-- ============================================================================
-- asanHire Database Migration: 003_roles_admin.sql
-- Architecture: Roles, Admin Controls, HR Profiles, Override Accountability
-- ============================================================================

-- 1. Table: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'candidate')) DEFAULT 'hr',
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: hr_profiles
CREATE TABLE IF NOT EXISTS public.hr_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL,
    reply_to_enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: hr_access_requests
CREATE TABLE IF NOT EXISTS public.hr_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    reason TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Table: blocked_emails
CREATE TABLE IF NOT EXISTS public.blocked_emails (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL DEFAULT '',
    blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Table: admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT '',
    target_id TEXT NOT NULL DEFAULT '',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Table: hr_override_events
CREATE TABLE IF NOT EXISTS public.hr_override_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hr_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hr_organization TEXT NOT NULL DEFAULT '',
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL DEFAULT '',
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
    candidate_name TEXT NOT NULL DEFAULT '',
    override_type TEXT NOT NULL,
    from_value TEXT NOT NULL DEFAULT '',
    to_value TEXT NOT NULL DEFAULT '',
    reason_category TEXT NOT NULL CHECK (
        reason_category IN (
            'prior_experience_not_in_resume',
            'interview_interrupted_tech_issue',
            'disagrees_with_ai_scoring',
            'diversity_equity_inclusion',
            'reference_check_input',
            'portfolio_review',
            'other'
        )
    ),
    reason TEXT NOT NULL,
    admin_status TEXT NOT NULL CHECK (
        admin_status IN ('pending', 'reviewed', 'question_asked', 'answered')
    ) DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Table: hr_override_questions
CREATE TABLE IF NOT EXISTS public.hr_override_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    override_id UUID NOT NULL REFERENCES public.hr_override_events(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    asked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    answered_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_contact_email ON public.hr_profiles(contact_email);
CREATE INDEX IF NOT EXISTS idx_hr_access_requests_status ON public.hr_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_hr_override_events_hr_user ON public.hr_override_events(hr_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_override_events_job ON public.hr_override_events(job_id);
CREATE INDEX IF NOT EXISTS idx_hr_override_events_candidate ON public.hr_override_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_override_events_admin_status ON public.hr_override_events(admin_status);
CREATE INDEX IF NOT EXISTS idx_hr_override_questions_override ON public.hr_override_questions(override_id);

-- ============================================================================
-- Privacy Scrubbing Trigger: Scrubs candidate PII upon candidate deletion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.scrub_candidate_override_pii()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.hr_override_events
    SET candidate_name = '[candidate removed]'
    WHERE candidate_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_scrub_candidate_override_pii ON public.candidates;
CREATE TRIGGER trg_scrub_candidate_override_pii
BEFORE DELETE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.scrub_candidate_override_pii();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_override_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_override_questions ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies: Service role has full access; Authenticated HR access to own data
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "HR can read own profile" ON public.hr_profiles;
CREATE POLICY "HR can read own profile"
    ON public.hr_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "HR can update own profile" ON public.hr_profiles;
CREATE POLICY "HR can update own profile"
    ON public.hr_profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "HR can view own overrides" ON public.hr_override_events;
CREATE POLICY "HR can view own overrides"
    ON public.hr_override_events FOR SELECT
    USING (auth.uid() = hr_user_id);

DROP POLICY IF EXISTS "HR can view questions for own overrides" ON public.hr_override_questions;
CREATE POLICY "HR can view questions for own overrides"
    ON public.hr_override_questions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.hr_override_events
        WHERE hr_override_events.id = hr_override_questions.override_id
          AND hr_override_events.hr_user_id = auth.uid()
    ));
