\set ON_ERROR_STOP 1
SET ROLE creqor_app;
SELECT public.cq_refresh_stat_counts() IS NOT NULL AS refreshed;
RESET ROLE;
DO $$BEGIN
 IF (SELECT value FROM cq_stat_counts WHERE name='leiEntities')<>(SELECT count(*) FROM cq_lei_catalogue) THEN RAISE EXCEPTION 'maintained LEI count differs from exact count'; END IF;
 IF (SELECT count(*) FROM cq_stat_counts)<>8 THEN RAISE EXCEPTION 'expected 8 maintained counts'; END IF;
END$$;
SELECT 'migration 009 checks passed';
