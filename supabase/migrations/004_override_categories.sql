-- ============================================================================
-- asanHire Database Migration: 004_override_categories.sql
-- Architecture: Reconcile hr_override_events reason_category CHECK constraint
-- Supports both modern Part G categories and legacy categories for backward compatibility
-- ============================================================================

ALTER TABLE public.hr_override_events
    DROP CONSTRAINT IF EXISTS hr_override_events_reason_category_check;

ALTER TABLE public.hr_override_events
    ADD CONSTRAINT hr_override_events_reason_category_check
    CHECK (
        reason_category IN (
            'candidate_request',
            'recruiter_discretion',
            'technical_issue',
            'interview_interrupted',
            'new_information',
            'compliance_requirement',
            'prior_experience_not_in_resume',
            'interview_interrupted_tech_issue',
            'disagrees_with_ai_scoring',
            'diversity_equity_inclusion',
            'reference_check_input',
            'portfolio_review',
            'other'
        )
    );
