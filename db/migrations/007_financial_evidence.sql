-- CREQOR migration 007: source registry, financial source documents and financial
-- observations with full provenance and point-in-time semantics.
--  * cq_source_registry: who owns each source, how it is accessed, what use and
--    redistribution its terms allow. Every document and observation references a row.
--  * cq_financial_documents: privately held source documents (e.g. annual reports
--    fetched from company investor-relations sites). Stored for evidence only and never
--    republished; identified by SHA-256 so unchanged documents are never re-processed.
--  * cq_financial_observations: one reported figure with original label, normalized
--    concept, period, scope, currency, unit, page reference, extraction method,
--    confidence and review status. A figure that is not reported is simply absent:
--    there is no row with a placeholder or zero.
--  * Point in time: `known_at` is when the figure became public. Restatements are new
--    rows that point to the row they restate; nothing is overwritten.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cq_source_registry (
  source_id text PRIMARY KEY CHECK (source_id ~ '^[A-Z0-9_]{2,40}$'),
  name text NOT NULL,
  owner text NOT NULL,
  access_method text NOT NULL,
  terms_url text,
  permitted_use text NOT NULL,
  redistribution text NOT NULL,
  rate_limit text,
  attribution text,
  retention text NOT NULL,
  coverage text NOT NULL,
  refresh_schedule text,
  limitations text,
  active boolean NOT NULL DEFAULT true,
  reviewed_at date NOT NULL DEFAULT current_date
);

INSERT INTO public.cq_source_registry
  (source_id,name,owner,access_method,terms_url,permitted_use,redistribution,rate_limit,attribution,retention,coverage,refresh_schedule,limitations)
VALUES
 ('GLEIF_LEI2','GLEIF Golden Copy — LEI-CDF (Level 1)','Global Legal Entity Identifier Foundation',
  'Official Golden Copy CSV archive via operator relay; SHA-256 verified',
  'https://www.gleif.org/en/meta/lei-data-terms-of-use',
  'Free use including commercial (CC0 licence)','Permitted (CC0); attribution appreciated',
  'Bulk file; API 60 requests/minute','Source: GLEIF','All versions kept for provenance','Global LEI registrations','Daily publications; imported on relay schedule',
  'Identity data only; no financials, prices or ownership percentages'),
 ('GLEIF_RR','GLEIF Golden Copy — Relationship Records (Level 2)','Global Legal Entity Identifier Foundation',
  'Official Golden Copy CSV archive via operator relay; SHA-256 verified','https://www.gleif.org/en/meta/lei-data-terms-of-use',
  'Free use including commercial (CC0 licence)','Permitted (CC0)','Bulk file','Source: GLEIF','Current publication plus first/last-seen run ids',
  'Accounting-consolidation parents, branches, fund links','Daily publications','Accounting consolidation, not legal or beneficial ownership'),
 ('GLEIF_REPEX','GLEIF Golden Copy — Reporting Exceptions (Level 2)','Global Legal Entity Identifier Foundation',
  'Official Golden Copy CSV archive via operator relay; SHA-256 verified','https://www.gleif.org/en/meta/lei-data-terms-of-use',
  'Free use including commercial (CC0 licence)','Permitted (CC0)','Bulk file','Source: GLEIF','Current publication',
  'Reasons a parent is not reported','Daily publications','Self-reported reasons'),
 ('COMPANY_ANNUAL_REPORT','Company annual reports (investor-relations websites)','Each reporting company',
  'Operator relay fetches the published PDF from the company''s own investor-relations site, a few documents at a time',
  NULL,
  'Extract reported figures as facts with page citations for research; documents kept privately as evidence',
  'Do NOT republish documents; publish derived facts with citation and link to the company''s own copy',
  'Polite: at most one request per site every few seconds; no crawling beyond the report link','Company name, document title, page',
  'Private evidence copy kept while referenced; removable on request','Indian listed companies first','After each annual report publication',
  'Figures are as reported; extraction is reviewed; terms vary by company')
ON CONFLICT (source_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cq_financial_documents (
  document_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lei char(20) NOT NULL REFERENCES public.cq_lei_catalogue(lei),
  source_id text NOT NULL REFERENCES public.cq_source_registry(source_id),
  document_type text NOT NULL CHECK (document_type IN ('annual_report','quarterly_result','financial_statements','other')),
  title text,
  fiscal_year int CHECK (fiscal_year BETWEEN 1900 AND 2100),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  retrieval_path text NOT NULL CHECK (retrieval_path IN ('operator-relay','direct')),
  retrieved_at timestamptz NOT NULL,
  published_at date,
  sha256 char(64) NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  bytes bigint NOT NULL CHECK (bytes > 0),
  content_type text NOT NULL,
  storage_path text NOT NULL,
  page_count int CHECK (page_count > 0),
  status text NOT NULL DEFAULT 'fetched' CHECK (status IN ('fetched','text_extracted','facts_extracted','failed','withdrawn')),
  status_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_financial_documents_lei_idx ON public.cq_financial_documents (lei, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS public.cq_financial_observations (
  observation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lei char(20) NOT NULL REFERENCES public.cq_lei_catalogue(lei),
  document_id bigint NOT NULL REFERENCES public.cq_financial_documents(document_id),
  original_label text NOT NULL,
  normalized_concept text NOT NULL CHECK (normalized_concept ~ '^[a-z][a-zA-Z0-9]{1,60}$'),
  statement text NOT NULL CHECK (statement IN ('income','balance','cash_flow','equity','other')),
  period_type text NOT NULL CHECK (period_type IN ('annual','quarterly','instant')),
  period_start date,
  period_end date NOT NULL,
  fiscal_year int NOT NULL CHECK (fiscal_year BETWEEN 1900 AND 2100),
  scope text NOT NULL CHECK (scope IN ('consolidated','standalone')),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit_label text NOT NULL,
  unit_multiplier numeric NOT NULL CHECK (unit_multiplier > 0),
  source_value numeric NOT NULL,
  normalized_value numeric NOT NULL,
  page int CHECK (page > 0),
  table_ref text,
  extraction_method text NOT NULL CHECK (extraction_method IN ('deterministic_table','model_proposed','manual_entry')),
  extraction_confidence numeric NOT NULL CHECK (extraction_confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','validator_passed','accepted','rejected')),
  review_note text,
  restates_observation_id bigint REFERENCES public.cq_financial_observations(observation_id),
  known_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (normalized_value = source_value * unit_multiplier),
  CHECK (period_start IS NULL OR period_start <= period_end),
  UNIQUE (document_id, normalized_concept, period_end, scope)
);
CREATE INDEX IF NOT EXISTS cq_financial_observations_lookup_idx
  ON public.cq_financial_observations (lei, normalized_concept, period_end DESC, known_at DESC);
CREATE INDEX IF NOT EXISTS cq_financial_observations_review_idx
  ON public.cq_financial_observations (review_status) WHERE review_status IN ('pending','validator_passed');

-- Point in time: the latest usable figure per concept/period/scope that was public at `as_of`.
CREATE OR REPLACE FUNCTION public.cq_financials_as_of(p_lei char(20), p_as_of timestamptz DEFAULT now())
RETURNS SETOF public.cq_financial_observations
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (o.normalized_concept, o.period_end, o.scope) o.*
  FROM public.cq_financial_observations o
  WHERE o.lei = p_lei AND o.known_at <= p_as_of AND o.review_status IN ('validator_passed','accepted')
  ORDER BY o.normalized_concept, o.period_end, o.scope, o.known_at DESC, o.observation_id DESC
$$;

GRANT SELECT ON public.cq_source_registry, public.cq_financial_documents, public.cq_financial_observations TO creqor_app, creqor_ingest;
GRANT EXECUTE ON FUNCTION public.cq_financials_as_of(char(20), timestamptz) TO creqor_app, creqor_ingest;
GRANT INSERT, UPDATE ON public.cq_financial_documents, public.cq_financial_observations TO creqor_ingest;

COMMIT;
