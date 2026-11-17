-- CREQOR evidence-led financial intelligence schema
-- PostgreSQL 15+. Preparatory migration; apply to an explicitly provisioned database.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS companies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), canonical_name text NOT NULL, entity_type text NOT NULL DEFAULT 'unknown',
 country_code char(2), incorporation_number text, current_status text NOT NULL DEFAULT 'under_review',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS company_identifiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 identifier_type text NOT NULL, identifier_value text NOT NULL, country_code char(2),
 valid_from date, valid_to date, source_document_id uuid, UNIQUE(identifier_type,identifier_value,company_id)
);
CREATE INDEX IF NOT EXISTS idx_company_identifiers_value ON company_identifiers(identifier_type,identifier_value);
CREATE TABLE IF NOT EXISTS company_aliases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 alias text NOT NULL, valid_from date, valid_to date, source_document_id uuid
);
CREATE TABLE IF NOT EXISTS source_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id),
 source_url text, document_title text NOT NULL, issuer text, source_category text NOT NULL,
 published_at timestamptz, retrieved_at timestamptz NOT NULL DEFAULT now(),
 sha256_hash text, storage_key text, access_class text NOT NULL DEFAULT 'public',
 verification_status text NOT NULL DEFAULT 'unverified', review_notes text,
 CHECK (source_category IN ('official_filing','third_party','company_provided','user_submitted','calculated','other'))
);
CREATE TABLE IF NOT EXISTS source_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 document_id uuid NOT NULL REFERENCES source_documents(id), claim_type text NOT NULL, claim_value jsonb NOT NULL,
 unit text, reporting_period_start date, reporting_period_end date, currency char(3),
 page_reference text, verification_status text NOT NULL DEFAULT 'unverified',
 valid_from timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
 reviewed_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_source_claims_company_type ON source_claims(company_id,claim_type);
CREATE TABLE IF NOT EXISTS source_conflicts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 first_claim_id uuid NOT NULL REFERENCES source_claims(id), second_claim_id uuid NOT NULL REFERENCES source_claims(id),
 status text NOT NULL DEFAULT 'open', resolution text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS securities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 security_type text NOT NULL, share_class text, isin text, shares_outstanding numeric(30,8),
 effective_date date, source_claim_id uuid REFERENCES source_claims(id)
);
CREATE TABLE IF NOT EXISTS listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), security_id uuid NOT NULL REFERENCES securities(id),
 exchange_code text NOT NULL, ticker text NOT NULL, listed_at date, delisted_at date,
 source_claim_id uuid REFERENCES source_claims(id)
);
CREATE TABLE IF NOT EXISTS market_prices (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, security_id uuid NOT NULL REFERENCES securities(id),
 price numeric(30,8) NOT NULL CHECK(price>=0), currency char(3) NOT NULL,
 observed_at timestamptz NOT NULL, provider text NOT NULL, provider_license text,
 source_claim_id uuid REFERENCES source_claims(id), UNIQUE(security_id,observed_at,provider)
);
CREATE TABLE IF NOT EXISTS financial_facts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 metric_code text NOT NULL, metric_value numeric(30,8) NOT NULL, currency char(3), unit text,
 period_start date, period_end date NOT NULL, financial_basis text, source_claim_id uuid REFERENCES source_claims(id),
 recorded_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_financial_facts_company_metric ON financial_facts(company_id,metric_code,period_end DESC);
CREATE TABLE IF NOT EXISTS corporate_relationships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_company_id uuid NOT NULL REFERENCES companies(id),
 child_company_id uuid NOT NULL REFERENCES companies(id), relationship_type text NOT NULL,
 ownership_fraction numeric(8,6) CHECK(ownership_fraction>=0 AND ownership_fraction<=1),
 valid_from date, valid_to date, source_claim_id uuid NOT NULL REFERENCES source_claims(id),
 CHECK(parent_company_id<>child_company_id)
);
CREATE TABLE IF NOT EXISTS corporate_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 action_type text NOT NULL, status text NOT NULL DEFAULT 'reported',
 effective_date date, announced_date date, description text, source_claim_id uuid REFERENCES source_claims(id),
 CHECK(status IN ('reported','proposed','definitive_agreement','approvals_pending','completed','terminated'))
);
CREATE TABLE IF NOT EXISTS valuation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id),
 model_type text NOT NULL, model_version text NOT NULL, scenario text NOT NULL,
 assumption_json jsonb NOT NULL, result_json jsonb NOT NULL,
 as_of_date date NOT NULL, outcome_status text NOT NULL DEFAULT 'draft',
 created_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS valuation_sources (
 valuation_run_id uuid NOT NULL REFERENCES valuation_runs(id) ON DELETE CASCADE,
 claim_id uuid NOT NULL REFERENCES source_claims(id), PRIMARY KEY(valuation_run_id,claim_id)
);
CREATE TABLE IF NOT EXISTS intelligence_scores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id),
 score numeric(5,2),confidence numeric(5,2),component_scores jsonb NOT NULL,
 methodology_version text NOT NULL,as_of_date date NOT NULL,
 status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(score IS NULL OR (score>=0 AND score<=100)), CHECK(confidence IS NULL OR (confidence>=0 AND confidence<=100))
);
CREATE TABLE IF NOT EXISTS research_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid REFERENCES companies(id),
 slug text NOT NULL UNIQUE,title text NOT NULL,body text NOT NULL,
 publication_status text NOT NULL DEFAULT 'draft',
 source_ids uuid[] NOT NULL DEFAULT '{}',editorial_conflicts jsonb NOT NULL DEFAULT '[]',
 published_at timestamptz,revision integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id text,action text NOT NULL,object_type text NOT NULL,object_id text,
 before_state jsonb,after_state jsonb,reason text,at timestamptz NOT NULL DEFAULT now()
);
COMMIT;