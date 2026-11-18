-- CREQOR migration 002: sourced SEC ticker/CIK associations.
-- Apply only after 001 to a dedicated authorised PostgreSQL 15+ instance.
-- Company tickers may have multiple share classes; not every SEC filer has an exchange ticker.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cq_sec_issuers (
 cik integer NOT NULL CHECK(cik>0),
 ticker text NOT NULL CHECK(length(ticker) BETWEEN 1 AND 32),
 legal_name text NOT NULL CHECK(length(legal_name) BETWEEN 1 AND 500),
 exchange text NOT NULL DEFAULT '',
 source_url text NOT NULL DEFAULT 'https://www.sec.gov/files/company_tickers_exchange.json'
  CHECK(source_url='https://www.sec.gov/files/company_tickers_exchange.json'),
 source_sha256 char(64) NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$'),
 source_retrieved_at timestamptz NOT NULL,
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 last_changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(cik,ticker)
);
CREATE INDEX IF NOT EXISTS cq_sec_issuer_name_search ON public.cq_sec_issuers (lower(legal_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS cq_sec_issuer_ticker_search ON public.cq_sec_issuers (lower(ticker) text_pattern_ops);
CREATE INDEX IF NOT EXISTS cq_sec_issuer_exchange ON public.cq_sec_issuers(exchange);
CREATE TABLE IF NOT EXISTS public.cq_sec_issuer_observations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 cik integer NOT NULL,
 ticker text NOT NULL,
 source_sha256 char(64) NOT NULL,
 name_at_observation text NOT NULL,
 exchange_at_observation text NOT NULL,
 observed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(cik,ticker) REFERENCES public.cq_sec_issuers(cik,ticker) ON DELETE CASCADE,
 UNIQUE(cik,ticker,source_sha256)
);
CREATE INDEX IF NOT EXISTS cq_sec_observations_by_issuer ON public.cq_sec_issuer_observations(cik,observed_at DESC);
CREATE TABLE IF NOT EXISTS public.cq_bulk_source_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 source text NOT NULL CHECK(source IN ('GLEIF_GOLDEN_COPY','SEC_TICKERS')),
 source_publish_date text,
 source_reported_records bigint,
 source_url text NOT NULL,
 processed bigint NOT NULL DEFAULT 0,
 changed bigint NOT NULL DEFAULT 0,
 status text NOT NULL CHECK(status IN ('complete','partial','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_bulk_source_runs_recent ON public.cq_bulk_source_runs (source,created_at DESC);
COMMIT;
