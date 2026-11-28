-- CREQOR migration 011: directory ordering indexes for the private global directory.
-- /v1/directory lists ISSUED registrations first, then legal name, with bounded offsets
-- (at most page 200 of 60). These indexes let that ordering be read without sorting the
-- multi-million-row catalogue on every request, worldwide and per country.
BEGIN;
CREATE INDEX IF NOT EXISTS cq_lei_directory_order_idx
  ON public.cq_lei_catalogue ((registration_status <> 'ISSUED'), lower(legal_name), lei);
CREATE INDEX IF NOT EXISTS cq_lei_directory_country_order_idx
  ON public.cq_lei_catalogue (country_code, (registration_status <> 'ISSUED'), lower(legal_name), lei);
ANALYZE public.cq_lei_catalogue;
COMMIT;
