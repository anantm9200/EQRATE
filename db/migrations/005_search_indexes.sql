-- CREQOR migration 005: keyword retrieval indexes for the global entity index.
-- Apply after the initial bulk load (building GIN indexes on a populated table is far
-- cheaper than maintaining them row by row during a multi-million-row import).
-- pg_trgm is a trusted extension (PostgreSQL 13+), so the database owner may create it.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Substring / fuzzy legal-name search (e.g. "deutsche bank" inside a longer legal name).
CREATE INDEX IF NOT EXISTS cq_lei_name_trgm_idx
  ON public.cq_lei_catalogue USING gin (lower(legal_name) gin_trgm_ops);
-- Name variants (other legal names, transliterations) preserved in the source payload.
CREATE INDEX IF NOT EXISTS cq_lei_other_names_trgm_idx
  ON public.cq_lei_catalogue USING gin (lower(coalesce(source_payload->>'otherNames','')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS cq_sec_issuer_name_trgm_idx
  ON public.cq_sec_issuers USING gin (lower(legal_name) gin_trgm_ops);
ANALYZE public.cq_lei_catalogue;
COMMIT;
