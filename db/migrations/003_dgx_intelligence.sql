-- Apply to the private CREQOR PostgreSQL database after migrations 001 and 002.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cq_sec_financial_facts (
  cik integer NOT NULL CHECK (cik > 0),
  taxonomy text NOT NULL CHECK (length(taxonomy) BETWEEN 1 AND 60),
  concept text NOT NULL CHECK (length(concept) BETWEEN 1 AND 130),
  unit text NOT NULL CHECK (unit IN ('USD','shares')),
  period_start text NOT NULL DEFAULT '',
  period_end date NOT NULL,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 1990 AND 2200),
  fiscal_period text NOT NULL DEFAULT '',
  form text NOT NULL CHECK (form IN ('10-K','10-Q','10-K/A','10-Q/A')),
  accession text NOT NULL,
  filed date NOT NULL,
  value numeric(34,6) NOT NULL,
  source_url text NOT NULL CHECK (source_url LIKE 'https://data.sec.gov/api/xbrl/companyfacts/CIK%.json'),
  source_sha256 char(64) NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cik,taxonomy,concept,unit,accession,period_start,period_end)
);
CREATE INDEX IF NOT EXISTS cq_financial_facts_company ON public.cq_sec_financial_facts(cik,period_end DESC,filed DESC);
CREATE INDEX IF NOT EXISTS cq_financial_facts_metrics ON public.cq_sec_financial_facts(cik,concept,fiscal_year,form);
CREATE TABLE IF NOT EXISTS public.cq_sec_fact_sync_state (
  cik integer PRIMARY KEY,
  source_url text NOT NULL,
  last_success_at timestamptz,
  last_status text NOT NULL,
  fact_count integer NOT NULL DEFAULT 0,
  error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cq_ai_research_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cik integer NOT NULL,
  model_id text NOT NULL,
  input_fingerprint char(64) NOT NULL,
  source_count integer NOT NULL DEFAULT 0,
  analysis_kind text NOT NULL CHECK(analysis_kind IN ('deterministic','model_assisted')),
  output_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_ai_research_audit_recent ON public.cq_ai_research_audit(cik,created_at DESC);
COMMIT;
