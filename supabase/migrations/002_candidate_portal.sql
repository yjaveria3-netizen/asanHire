-- ============================================================================
-- asanHire Database Migration: 002_candidate_portal.sql
-- Architecture: Candidate Portal Auth, Sessions & Bookmarks
-- ============================================================================

-- Table: candidate_portal_profiles
CREATE TABLE IF NOT EXISTS public.candidate_portal_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: candidate_bookmarks
CREATE TABLE IF NOT EXISTS public.candidate_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(candidate_user_id, job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_bookmarks_user ON public.candidate_bookmarks(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_portal_profiles_email ON public.candidate_portal_profiles(email);

-- Enable RLS
ALTER TABLE public.candidate_portal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies for candidate_portal_profiles
DROP POLICY IF EXISTS "Candidate can view own profile" ON public.candidate_portal_profiles;
CREATE POLICY "Candidate can view own profile"
    ON public.candidate_portal_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Candidate can update own profile" ON public.candidate_portal_profiles;
CREATE POLICY "Candidate can update own profile"
    ON public.candidate_portal_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policies for candidate_bookmarks
DROP POLICY IF EXISTS "Candidate can manage bookmarks" ON public.candidate_bookmarks;
CREATE POLICY "Candidate can manage bookmarks"
    ON public.candidate_bookmarks FOR ALL
    USING (auth.uid() = candidate_user_id);
