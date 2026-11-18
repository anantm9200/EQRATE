-- CREQOR sourced catalogue migration 001
-- Postgres 15+. Apply manually only to the dedicated CREQOR database.
-- No user research, passwords, private valuations or AI outputs are stored here.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cq_lei_catalogue (
  lei char(20) PRIMARY KEY CHECK (lei ~ '^[A-Z0-9]{20}$'),
  legal_name text NOT NULL CHECK(length(legal_name) BETWEEN 1 AND 1000),
  country_code char(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  jurisdiction text NOT NULL DEFAULT '',
  entity_status text NOT NULL DEFAULT 'UNKNOWN',
  registration_status text NOT NULL DEFAULT 'UNKNOWN',
  last_update text NOT NULL DEFAULT '',
  source_url text NOT NULL CHECK(source_url LIKE 'https://search.gleif.org/#/record/%'),
  source_payload jsonb NOT NULL CHECK(jsonb_typeof(source_payload)='object'),
  source_sha256 char(64) NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_lei_country_name_idx
  ON public.cq_lei_catalogue (country_code,lower(legal_name),lei);
CREATE INDEX IF NOT EXISTS cq_lei_name_prefix_idx
  ON public.cq_lei_catalogue (lower(legal_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS cq_lei_updated_idx
  ON public.cq_lei_catalogue (last_changed_at DESC);

CREATE TABLE IF NOT EXISTS public.cq_lei_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lei char(20) NOT NULL REFERENCES public.cq_lei_catalogue(lei) ON DELETE CASCADE,
  source_sha256 char(64) NOT NULL,
  source_payload jsonb NOT NULL CHECK(jsonb_typeof(source_payload)='object'),
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lei,source_sha256)
);
CREATE INDEX IF NOT EXISTS cq_lei_observations_entity_idx
  ON public.cq_lei_observations (lei,first_observed_at DESC);

CREATE TABLE IF NOT EXISTS public.cq_catalogue_cursors (
  segment text PRIMARY KEY,
  next_page integer NOT NULL DEFAULT 1 CHECK(next_page>=1),
  last_completed_at timestamptz,
  last_ingested integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cq_catalogue_sync_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  segment text NOT NULL,
  start_page integer NOT NULL CHECK(start_page>=1),
  page_count integer NOT NULL CHECK(page_count BETWEEN 1 AND 8),
  fetched integer NOT NULL DEFAULT 0,
  changed integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK(status IN ('ok','partial','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_catalogue_sync_runs_recent_idx ON public.cq_catalogue_sync_runs(created_at DESC);

-- Database user should be restricted to these source-catalogue tables.
-- Never grant anonymous write permissions to catalogue or audit tables.
COMMIT;
