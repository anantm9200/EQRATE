-- CREQOR migration 009: maintained exact counts.
-- Public status pages must not run full-table counts on multi-million-row tables per
-- request (they time out under import load and amplify traffic). Exact counts are
-- computed by cq_refresh_stat_counts() after each import and on a schedule, stored with
-- their computation time, and read instantly by the engine.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cq_stat_counts (
  name text PRIMARY KEY CHECK (name ~ '^[a-zA-Z]{2,60}$'),
  value bigint,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.cq_refresh_stat_counts()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = 0 AS $$
DECLARE latest bigint; t timestamptz := now();
BEGIN
  -- One refresh at a time; concurrent callers return immediately.
  IF NOT pg_try_advisory_xact_lock(hashtext('cq_refresh_stat_counts')) THEN RETURN NULL; END IF;
  SELECT id INTO latest FROM cq_bulk_source_runs WHERE source='GLEIF_GOLDEN_COPY' AND status='complete' AND row_limit IS NULL ORDER BY id DESC LIMIT 1;
  INSERT INTO cq_stat_counts (name,value,computed_at) VALUES
   ('leiEntities',(SELECT count(*) FROM cq_lei_catalogue),t),
   ('leiSourceVersions',(SELECT count(*) FROM cq_lei_observations),t),
   ('leiCountries',(SELECT count(DISTINCT country_code) FROM cq_lei_catalogue),t),
   ('leiRelationships',(SELECT count(*) FROM cq_lei_relationships),t),
   ('leiReportingExceptions',(SELECT count(*) FROM cq_lei_reporting_exceptions),t),
   ('indiaEntities',(SELECT count(*) FROM cq_india_entities),t),
   ('indiaIssued',(SELECT count(*) FROM cq_india_entities WHERE registration_status='ISSUED'),t),
   ('staleNotInLatestPublication',CASE WHEN latest IS NULL THEN NULL ELSE (SELECT count(*) FROM cq_lei_catalogue WHERE last_seen_run_id IS DISTINCT FROM latest) END,t)
  ON CONFLICT (name) DO UPDATE SET value=EXCLUDED.value, computed_at=EXCLUDED.computed_at;
  RETURN t;
END$$;
REVOKE ALL ON FUNCTION public.cq_refresh_stat_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cq_refresh_stat_counts() TO creqor_app, creqor_ingest;
GRANT SELECT ON public.cq_stat_counts TO creqor_app, creqor_ingest;

COMMIT;
