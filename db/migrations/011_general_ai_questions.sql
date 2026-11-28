-- CREQOR migration 011: audit free-form analyst questions (POST /v1/ask).
-- Additive: existing SEC_CIK and LEI rows keep exactly the same rule; a new
-- GENERAL subject is allowed with neither an LEI nor a CIK attached.
BEGIN;
ALTER TABLE public.cq_ai_research_audit
  DROP CONSTRAINT IF EXISTS cq_ai_research_audit_subject_check;
ALTER TABLE public.cq_ai_research_audit
  ADD CONSTRAINT cq_ai_research_audit_subject_check CHECK (
    (subject_kind = 'SEC_CIK' AND cik IS NOT NULL) OR
    (subject_kind = 'LEI' AND lei IS NOT NULL AND lei ~ '^[A-Z0-9]{20}$') OR
    (subject_kind = 'GENERAL' AND lei IS NULL AND cik IS NULL));
COMMIT;
