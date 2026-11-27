-- Integration checks for migration 007. Runs in a throwaway database; every block must succeed.
\set ON_ERROR_STOP 1
BEGIN;
INSERT INTO cq_lei_catalogue(lei,legal_name,source_url,source_payload,source_sha256)
VALUES ('335800ZJKU9GPQRE2U66','TATA CONSULTANCY SERVICES LIMITED','https://search.gleif.org/#/record/335800ZJKU9GPQRE2U66','{}',repeat('a',64));
INSERT INTO cq_financial_documents(lei,source_id,document_type,fiscal_year,source_url,retrieval_path,retrieved_at,published_at,sha256,bytes,content_type,storage_path)
VALUES ('335800ZJKU9GPQRE2U66','COMPANY_ANNUAL_REPORT','annual_report',2025,'https://example.invalid/ar.pdf','operator-relay',now(),'2025-05-20',repeat('b',64),1000,'application/pdf','docs/b.pdf');

-- 1. Original and restated revenue: point-in-time must return what was known at each date.
INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_start,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,page,extraction_method,extraction_confidence,review_status,known_at)
VALUES ('335800ZJKU9GPQRE2U66',1,'Revenue from operations','revenue','income','annual','2024-04-01','2025-03-31',2025,'consolidated','INR','crore',10000000,255324,2553240000000,12,'deterministic_table',0.98,'accepted','2025-05-20');
INSERT INTO cq_financial_documents(lei,source_id,document_type,fiscal_year,source_url,retrieval_path,retrieved_at,published_at,sha256,bytes,content_type,storage_path)
VALUES ('335800ZJKU9GPQRE2U66','COMPANY_ANNUAL_REPORT','annual_report',2026,'https://example.invalid/ar26.pdf','operator-relay',now(),'2026-05-20',repeat('c',64),1000,'application/pdf','docs/c.pdf');
INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_start,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,page,extraction_method,extraction_confidence,review_status,restates_observation_id,known_at)
VALUES ('335800ZJKU9GPQRE2U66',2,'Revenue from operations (restated)','revenue','income','annual','2024-04-01','2025-03-31',2025,'consolidated','INR','crore',10000000,255400,2554000000000,40,'deterministic_table',0.97,'accepted',1,'2026-05-20');
DO $$BEGIN
 IF (SELECT source_value FROM cq_financials_as_of('335800ZJKU9GPQRE2U66','2025-12-31') WHERE normalized_concept='revenue')<>255324 THEN RAISE EXCEPTION 'as-of 2025 must return the original figure'; END IF;
 IF (SELECT source_value FROM cq_financials_as_of('335800ZJKU9GPQRE2U66','2026-06-30') WHERE normalized_concept='revenue')<>255400 THEN RAISE EXCEPTION 'as-of 2026 must return the restatement'; END IF;
 IF EXISTS (SELECT 1 FROM cq_financials_as_of('335800ZJKU9GPQRE2U66','2025-01-01')) THEN RAISE EXCEPTION 'nothing was public before publication'; END IF;
END$$;

-- 2. Pending figures are never served as usable data.
INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,extraction_method,extraction_confidence,known_at)
VALUES ('335800ZJKU9GPQRE2U66',1,'Profit for the year','netIncome','income','annual','2025-03-31',2025,'consolidated','INR','crore',10000000,48553,485530000000,'model_proposed',0.7,'2025-05-20');
DO $$BEGIN IF EXISTS (SELECT 1 FROM cq_financials_as_of('335800ZJKU9GPQRE2U66') WHERE normalized_concept='netIncome') THEN RAISE EXCEPTION 'pending figure leaked'; END IF; END$$;
COMMIT;

-- 3. Constraints reject inconsistent units, missing values and non-HTTPS sources.
DO $$BEGIN
 BEGIN INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,extraction_method,extraction_confidence,known_at)
  VALUES ('335800ZJKU9GPQRE2U66',1,'x','cash','balance','instant','2025-03-31',2025,'consolidated','INR','crore',10000000,1,1,'manual_entry',1,now());
  RAISE EXCEPTION 'unit mismatch accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,extraction_method,extraction_confidence,known_at)
  VALUES ('335800ZJKU9GPQRE2U66',1,'x','cash','balance','instant','2025-03-31',2025,'consolidated','INR','crore',10000000,NULL,NULL,'manual_entry',1,now());
  RAISE EXCEPTION 'missing value accepted'; EXCEPTION WHEN not_null_violation THEN NULL; END;
 BEGIN INSERT INTO cq_financial_documents(lei,source_id,document_type,source_url,retrieval_path,retrieved_at,sha256,bytes,content_type,storage_path)
  VALUES ('335800ZJKU9GPQRE2U66','COMPANY_ANNUAL_REPORT','annual_report','http://insecure.invalid/a.pdf','operator-relay',now(),repeat('d',64),1,'application/pdf','x');
  RAISE EXCEPTION 'http source accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END$$;

-- 4. Least privilege: the app role reads but cannot write evidence.
DO $$BEGIN
 IF has_table_privilege('creqor_app','cq_financial_observations','INSERT') THEN RAISE EXCEPTION 'creqor_app can insert observations'; END IF;
 IF NOT has_table_privilege('creqor_ingest','cq_financial_observations','INSERT') THEN RAISE EXCEPTION 'creqor_ingest cannot insert'; END IF;
 IF has_table_privilege('creqor_ingest','cq_financial_observations','DELETE') THEN RAISE EXCEPTION 'creqor_ingest can delete'; END IF;
END$$;
SELECT 'migration 007 checks passed';
