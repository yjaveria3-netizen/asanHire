-- ============================================================================
-- asanHire Seed Data: seed.sql
-- 1 Demo Job + 5 Demo Candidates across different stages + Interview + Report
-- ============================================================================

-- Insert Demo User into auth.users (if using Supabase Auth test environment)
DO $$
BEGIN
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'hr@asanhire.dev',
        crypt('asanHire2026!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"HR Lead"}',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        -- auth.users might not exist in standalone postgres test
        NULL;
END $$;

-- 1. Insert Demo Job
INSERT INTO public.jobs (
    id,
    created_by,
    title,
    department,
    description,
    requirements,
    rubric,
    top_n,
    min_score,
    deadline,
    status,
    created_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Senior AI / Full-Stack Engineer',
    'Product Engineering',
    'We are seeking an experienced Full-Stack and AI Engineer to spearhead our next-generation agentic workflows, LLM orchestration, and high-performance reactive web applications.',
    '4+ years full-stack experience (TypeScript, Next.js, FastAPI, Python). Production experience with LLMs (Groq, Gemini, Anthropic), vector embeddings, and autonomous agent patterns. Strong distributed systems design.',
    '{
        "version": "1.0",
        "criteria": [
            {"name": "Technical Breadth & Next.js", "weight": 25, "description": "Hands-on experience with App Router, TypeScript, and state management."},
            {"name": "AI & LLM Orchestration", "weight": 35, "description": "Production experience building agents, tool calling, and prompt engineering."},
            {"name": "Backend & Database", "weight": 25, "description": "FastAPI, PostgreSQL / Supabase, RLS, and secure RESTful architectures."},
            {"name": "System Architecture & Security", "weight": 15, "description": "Knowledge of auth tokens, input validation, and defensive programming."}
        ]
    }'::jsonb,
    3,
    70.00,
    timezone('utc'::text, now() + interval '3 days'),
    'active',
    now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert 5 Demo Candidates across various workflow stages
INSERT INTO public.candidates (
    id, job_id, full_name, email, phone, resume_url, resume_text,
    status, resume_score, resume_feedback, created_at
) VALUES 
(
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111111',
    'Amina Malik',
    'amina.malik@example.com',
    '+1 555-0101',
    'https://storage.asanhire.dev/resumes/demo_amina.pdf',
    'Senior Full-Stack AI Engineer with 6 years building Next.js 14 applications and deploying LLM pipelines using FastAPI, LangChain, and Groq. Built real-time proctoring and voice AI agents.',
    'interviewed',
    92.50,
    '{"summary": "Exceptional fit with deep knowledge of App Router, FastAPI, and real-time voice LLM integration.", "strengths": ["6 yrs Next.js & FastAPI", "Groq & Gemini agent orchestration", "Production RLS security"], "gaps": []}'::jsonb,
    now() - interval '2 days'
),
(
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111111',
    'Bilal Tariq',
    'bilal.tariq@example.com',
    '+1 555-0102',
    'https://storage.asanhire.dev/resumes/demo_bilal.pdf',
    'Full-Stack Developer with 4 years specializing in React, Next.js, and Python backend APIs. Integrated OpenAI and Gemini for automated customer support systems.',
    'interviewing',
    85.00,
    '{"summary": "Strong core developer with solid React and Python foundation. Moderate autonomous agent experience.", "strengths": ["Solid Next.js and Tailwind", "FastAPI microservices"], "gaps": ["Lacks voice LLM low-latency experience"]}'::jsonb,
    now() - interval '1 day'
),
(
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111111',
    'Clara Vance',
    'clara.vance@example.com',
    '+1 555-0103',
    'https://storage.asanhire.dev/resumes/demo_clara.pdf',
    'Software Engineer with 3 years focused on frontend engineering and Supabase applications. Experience with TypeScript and basic LLM prompt chaining.',
    'invited',
    78.00,
    '{"summary": "Great frontend skills, passes the minimum threshold. Will be tested on backend depth during interview.", "strengths": ["Clean TypeScript/UI code", "Supabase auth experience"], "gaps": ["Limited Python & agentic backend exposure"]}'::jsonb,
    now() - interval '18 hours'
),
(
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111111',
    'Devon Patel',
    'devon.patel@example.com',
    '+1 555-0104',
    'https://storage.asanhire.dev/resumes/demo_devon.pdf',
    'Backend Engineer with 3 years in Django and PostgreSQL. Recent hobby projects with LangChain.',
    'shortlisted',
    74.00,
    '{"summary": "Passes minimum threshold (70.0) but currently ranked 4th, outside top N=3 auto-invite quota.", "strengths": ["Strong SQL and relational modeling"], "gaps": ["Lacks Next.js production experience"]}'::jsonb,
    now() - interval '12 hours'
),
(
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111111',
    'Elena Rostova',
    'elena.rostova@example.com',
    '+1 555-0105',
    'https://storage.asanhire.dev/resumes/demo_elena.pdf',
    'Junior Web Developer with 1 year experience in HTML, CSS, JavaScript, and introductory Python.',
    'applied',
    52.00,
    '{"summary": "Does not meet the minimum qualification threshold (score 52.00 < 60.00).", "strengths": ["Good junior enthusiasm"], "gaps": ["Insufficient years of experience", "No production LLM experience"]}'::jsonb,
    now() - interval '6 hours'
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert Demo Interview for Amina Malik (Completed)
INSERT INTO public.interviews (
    id, candidate_id, job_id, token_hash, token_expires_at, status,
    transcript, trust_score, started_at, completed_at
) VALUES (
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111111',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timezone('utc'::text, now() + interval '5 days'),
    'completed',
    '[
        {"speaker": "agent", "message": "Hello Amina! Welcome to your interview for the Senior AI / Full-Stack Engineer role at asanHire. Can you start by explaining how you architect real-time voice streaming with Groq and Next.js?"},
        {"speaker": "candidate", "message": "Certainly. I establish a WebSocket connection directly to our FastAPI gateway, which handles bi-directional audio frames. We buffer chunks using Opus codec, stream to Groq with low latency, and render tokens back optimistically into the UI."},
        {"speaker": "agent", "message": "Impressive. How do you handle proctoring and race conditions when multiple agent runs complete simultaneously?"},
        {"speaker": "candidate", "message": "We rely on optimistic concurrency and idempotent audit trails in Supabase with database-level row locks and state machine validation."}
    ]'::jsonb,
    97.00,
    now() - interval '1 day',
    now() - interval '23 hours'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert Proctoring Event for Demo Interview
INSERT INTO public.proctoring_events (
    id, interview_id, event_type, penalty, payload, client_timestamp
) VALUES (
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333301',
    'window_blur',
    3.00,
    '{"duration_ms": 1200, "note": "Minor focus lost to desktop notification"}'::jsonb,
    now() - interval '23 hours 45 minutes'
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert Evaluation Report for Amina Malik
INSERT INTO public.evaluation_reports (
    id, candidate_id, interview_id, overall_score, recommendation,
    summary, technical_rating, communication_rating, cultural_rating,
    key_strengths, red_flags, rubric_scores
) VALUES (
    '55555555-5555-5555-5555-555555555501',
    '22222222-2222-2222-2222-222222222201',
    '33333333-3333-3333-3333-333333333301',
    94.00,
    'Hire',
    'Amina demonstrated world-class mastery of AI orchestration, WebSockets, and state consistency. High integrity score (97/100). Strongly recommended for immediate hire.',
    96.00,
    92.00,
    94.00,
    '["Architectural clarity on real-time streaming", "Strong security mindset", "Deep Next.js App Router experience"]'::jsonb,
    '[]'::jsonb,
    '{
        "Technical Breadth": 95,
        "AI Orchestration": 98,
        "Backend & DB": 92,
        "Architecture & Security": 91
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 6. Insert Audit Log
INSERT INTO public.audit_logs (
    id, user_id, entity_type, entity_id, action, previous_state, new_state, reason
) VALUES (
    '66666666-6666-6666-6666-666666666601',
    '00000000-0000-0000-0000-000000000001',
    'candidate',
    '22222222-2222-2222-2222-222222222201',
    'status_override',
    '{"status": "interviewing"}'::jsonb,
    '{"status": "interviewed"}'::jsonb,
    'Automated completion after successful supervisor evaluation report generated.'
) ON CONFLICT (id) DO NOTHING;
