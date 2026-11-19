-- CREQOR migration 004: operational DGX platform.
-- Apply after 001-003 with the database owner role. Transaction-safe and re-runnable.
--  * least-privilege runtime roles (NOLOGIN here; passwords are set out of band by
--    scripts/dgx-db-bootstrap.sh so no credential ever lives in a migration file)
--  * per-run source provenance (publication date, archive hash, retrieval time,
--    read/valid/rejected/persisted counts) and per-entity first/last-seen run links
--  * job ledger for supervised background work and data-quality results
--  * research-audit fields required to reproduce an analysis
BEGIN;

CREATE TABLE IF NOT EXISTS public.cq_schema_migrations (
  version text PRIMARY KEY CHECK (version ~ '^[0-9]{3}_[a-z0-9_]+$'),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creqor_app') THEN
    CREATE ROLE creqor_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'creqor_ingest') THEN
    CREATE ROLE creqor_ingest NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- Bulk source runs: every import is attributable to one official publication.
ALTER TABLE public.cq_bulk_source_runs
  DROP CONSTRAINT IF EXISTS cq_bulk_source_runs_source_check,
  DROP CONSTRAINT IF EXISTS cq_bulk_source_runs_status_check;
ALTER TABLE public.cq_bulk_source_runs
  ADD CONSTRAINT cq_bulk_source_runs_source_check
    CHECK (source IN ('GLEIF_GOLDEN_COPY','GLEIF_DELTA','SEC_TICKERS','SEC_COMPANYFACTS')),
  ADD CONSTRAINT cq_bulk_source_runs_status_check
    CHECK (status IN ('running','complete','partial','failed'));
ALTER TABLE public.cq_bulk_source_runs
  ADD COLUMN IF NOT EXISTS archive_sha256 char(64) CHECK (archive_sha256 IS NULL OR archive_sha256 ~ '^[a-f0-9]{64}$'),
  ADD COLUMN IF NOT EXISTS archive_bytes bigint CHECK (archive_bytes IS NULL OR archive_bytes > 0),
  ADD COLUMN IF NOT EXISTS retrieved_at timestamptz,
  ADD COLUMN IF NOT EXISTS retrieval_path text CHECK (retrieval_path IS NULL OR retrieval_path IN ('direct','operator-relay')),
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS row_limit bigint,
  ADD COLUMN IF NOT EXISTS rows_read bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_valid bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_rejected bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_inserted bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_code text CHECK (error_code IS NULL OR length(error_code) <= 200);

-- Per-entity provenance: which publication first introduced the record, last changed
-- it and last confirmed it. Records absent from the newest complete publication are
-- reported as stale; they are never silently deleted.
ALTER TABLE public.cq_lei_catalogue
  ADD COLUMN IF NOT EXISTS first_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  ADD COLUMN IF NOT EXISTS last_changed_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  ADD COLUMN IF NOT EXISTS last_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  ADD COLUMN IF NOT EXISTS source_published_at timestamptz;
-- Leave room on each page for HOT updates of last_seen_run_id during re-imports.
ALTER TABLE public.cq_lei_catalogue SET (fillfactor = 85);
CREATE INDEX IF NOT EXISTS cq_lei_last_seen_run_idx ON public.cq_lei_catalogue (last_seen_run_id);
CREATE INDEX IF NOT EXISTS cq_lei_registration_status_idx ON public.cq_lei_catalogue (registration_status);

ALTER TABLE public.cq_lei_observations
  ADD COLUMN IF NOT EXISTS run_id bigint REFERENCES public.cq_bulk_source_runs(id);

-- Supervised job ledger (ingestion, backups, data-quality and health checks).
CREATE TABLE IF NOT EXISTS public.cq_job_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job text NOT NULL CHECK (job ~ '^[a-z0-9_.-]{2,60}$'),
  status text NOT NULL CHECK (status IN ('running','ok','warning','failed','skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  error_code text CHECK (error_code IS NULL OR length(error_code) <= 200)
);
CREATE INDEX IF NOT EXISTS cq_job_runs_recent_idx ON public.cq_job_runs (job, started_at DESC);

-- Research audit: reproducible record of every analysis (LEI or SEC subject).
ALTER TABLE public.cq_ai_research_audit
  ALTER COLUMN cik DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS subject_kind text NOT NULL DEFAULT 'SEC_CIK',
  ADD COLUMN IF NOT EXISTS lei char(20),
  ADD COLUMN IF NOT EXISTS question text,
  ADD COLUMN IF NOT EXISTS source_versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assumptions jsonb,
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model_latency_ms integer,
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'unreviewed';
ALTER TABLE public.cq_ai_research_audit
  DROP CONSTRAINT IF EXISTS cq_ai_research_audit_subject_check,
  DROP CONSTRAINT IF EXISTS cq_ai_research_audit_review_check;
ALTER TABLE public.cq_ai_research_audit
  ADD CONSTRAINT cq_ai_research_audit_subject_check CHECK (
    (subject_kind = 'SEC_CIK' AND cik IS NOT NULL) OR
    (subject_kind = 'LEI' AND lei IS NOT NULL AND lei ~ '^[A-Z0-9]{20}$')),
  ADD CONSTRAINT cq_ai_research_audit_review_check
    CHECK (review_state IN ('unreviewed','reviewed','rejected'));
CREATE INDEX IF NOT EXISTS cq_ai_research_audit_lei_idx
  ON public.cq_ai_research_audit (lei, created_at DESC) WHERE lei IS NOT NULL;

-- Least privilege. The engine (creqor_app) reads public records and appends audit
-- rows; ingestion (creqor_ingest) writes source tables. Neither may DELETE, TRUNCATE,
-- alter schema or read anything outside the public CREQOR schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO creqor_app, creqor_ingest;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO creqor_app, creqor_ingest;
GRANT INSERT ON public.cq_ai_research_audit TO creqor_app;
GRANT INSERT, UPDATE ON
  public.cq_lei_catalogue, public.cq_lei_observations,
  public.cq_catalogue_cursors, public.cq_catalogue_sync_runs,
  public.cq_sec_issuers, public.cq_sec_issuer_observations,
  public.cq_bulk_source_runs, public.cq_sec_financial_facts,
  public.cq_sec_fact_sync_state, public.cq_job_runs
TO creqor_ingest;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO creqor_app, creqor_ingest;

COMMIT;
