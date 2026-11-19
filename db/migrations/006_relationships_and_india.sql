-- CREQOR migration 006: GLEIF Level 2 relationships, reporting exceptions and the
-- India identifier view. Apply after 001-005 with the database owner role.
--  * cq_lei_relationships: official GLEIF relationship records (who consolidates whom,
--    branches, fund management). Source facts only; no inferred ownership.
--  * cq_lei_reporting_exceptions: the official reasons a parent was NOT reported.
--  * cq_india_entities: materialized view decoding identifiers that Indian registrants
--    reported to GLEIF (MCA CIN, GSTIN). Decoding is deterministic from the official
--    identifier formats; nothing is looked up or guessed.
BEGIN;

ALTER TABLE public.cq_bulk_source_runs DROP CONSTRAINT IF EXISTS cq_bulk_source_runs_source_check;
ALTER TABLE public.cq_bulk_source_runs ADD CONSTRAINT cq_bulk_source_runs_source_check
  CHECK (source IN ('GLEIF_GOLDEN_COPY','GLEIF_DELTA','GLEIF_RR','GLEIF_REPEX','SEC_TICKERS','SEC_COMPANYFACTS'));

CREATE TABLE IF NOT EXISTS public.cq_lei_relationships (
  child_lei char(20) NOT NULL CHECK (child_lei ~ '^[A-Z0-9]{20}$'),
  parent_lei char(20) NOT NULL CHECK (parent_lei ~ '^[A-Z0-9]{20}$'),
  relationship_type text NOT NULL CHECK (relationship_type ~ '^[A-Z_-]{3,60}$'),
  relationship_status text NOT NULL DEFAULT '',
  registration_status text NOT NULL DEFAULT '',
  validation_sources text NOT NULL DEFAULT '',
  relationship_start text NOT NULL DEFAULT '',
  relationship_end text NOT NULL DEFAULT '',
  accounting_period_start text NOT NULL DEFAULT '',
  accounting_period_end text NOT NULL DEFAULT '',
  qualifiers text NOT NULL DEFAULT '',
  quantifiers text NOT NULL DEFAULT '',
  last_update text NOT NULL DEFAULT '',
  managing_lou text NOT NULL DEFAULT '',
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  first_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  last_changed_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  last_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_lei, parent_lei, relationship_type)
) WITH (fillfactor = 85);
CREATE INDEX IF NOT EXISTS cq_lei_rel_parent_idx ON public.cq_lei_relationships (parent_lei, relationship_type);
CREATE INDEX IF NOT EXISTS cq_lei_rel_last_seen_idx ON public.cq_lei_relationships (last_seen_run_id);

CREATE TABLE IF NOT EXISTS public.cq_lei_reporting_exceptions (
  lei char(20) NOT NULL CHECK (lei ~ '^[A-Z0-9]{20}$'),
  category text NOT NULL CHECK (category ~ '^[A-Z_]{3,60}$'),
  reasons text[] NOT NULL DEFAULT '{}',
  refs text[] NOT NULL DEFAULT '{}',
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  first_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  last_changed_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  last_seen_run_id bigint REFERENCES public.cq_bulk_source_runs(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lei, category)
) WITH (fillfactor = 85);
CREATE INDEX IF NOT EXISTS cq_lei_repex_last_seen_idx ON public.cq_lei_reporting_exceptions (last_seen_run_id);

-- India: identifiers exactly as reported to GLEIF, decoded by fixed formats.
--  CIN   L/U + 5-digit industry code + 2-letter ROC state + year + 3-letter class + 6 digits
--  GSTIN 2-digit GST state code + 10-character PAN (4th char = holder type) + entity no + Z + check
DROP MATERIALIZED VIEW IF EXISTS public.cq_india_entities;
CREATE MATERIALIZED VIEW public.cq_india_entities AS
SELECT
  c.lei,
  c.legal_name,
  c.registration_status,
  c.entity_status,
  c.last_seen_run_id,
  coalesce(c.source_payload->>'registrationAuthorityId','') AS registration_authority,
  coalesce(c.source_payload->>'registeredAs','') AS registered_as,
  substring(c.source_payload->>'address' from 'IN-([A-Z]{2})') AS address_region,
  coalesce(c.source_payload->>'category','') AS category,
  nullif(left(coalesce(c.source_payload->>'initialRegistrationDate',''),10),'') AS lei_initial_registration,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$' THEN true ELSE false END AS has_cin,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
       THEN left(c.source_payload->>'registeredAs',1) END AS cin_listing,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
       THEN substr(c.source_payload->>'registeredAs',2,5) END AS cin_industry_code,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
       THEN substr(c.source_payload->>'registeredAs',7,2) END AS cin_roc_state,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
       THEN substr(c.source_payload->>'registeredAs',9,4)::int END AS cin_year,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'
       THEN substr(c.source_payload->>'registeredAs',13,3) END AS cin_class,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'
       THEN left(c.source_payload->>'registeredAs',2) END AS gst_state_code,
  CASE WHEN c.source_payload->>'registeredAs' ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'
       THEN substr(c.source_payload->>'registeredAs',6,1) END AS pan_holder_type
FROM public.cq_lei_catalogue c
WHERE c.country_code = 'IN';
CREATE UNIQUE INDEX IF NOT EXISTS cq_india_entities_lei ON public.cq_india_entities (lei);
CREATE INDEX IF NOT EXISTS cq_india_entities_region ON public.cq_india_entities (address_region);
CREATE INDEX IF NOT EXISTS cq_india_entities_class ON public.cq_india_entities (cin_class, cin_listing);
CREATE INDEX IF NOT EXISTS cq_india_entities_name ON public.cq_india_entities (lower(legal_name) text_pattern_ops);

-- REFRESH requires ownership; this narrowly scoped definer function lets the ingest
-- role refresh the view after an import without being granted ownership.
CREATE OR REPLACE FUNCTION public.cq_refresh_india_entities() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n bigint;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cq_india_entities;
  SELECT count(*) INTO n FROM public.cq_india_entities;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.cq_refresh_india_entities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cq_refresh_india_entities() TO creqor_ingest;

GRANT SELECT ON public.cq_lei_relationships, public.cq_lei_reporting_exceptions, public.cq_india_entities
  TO creqor_app, creqor_ingest;
GRANT INSERT, UPDATE ON public.cq_lei_relationships, public.cq_lei_reporting_exceptions TO creqor_ingest;

COMMIT;
