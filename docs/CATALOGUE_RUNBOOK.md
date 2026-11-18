# CREQOR public company catalogue — operational runbook

_Updated 2026-11-18. Code-ready; not a claim that a production database was provisioned._

## What this does

CREQOR indexes source-attributed **public GLEIF legal-entity identities**, retaining the exact registered name, LEI, country, jurisdiction, entity/registration status, source URL and retrieval-time fingerprint. An observation row is appended only when the fingerprint changes. This is not a financial statement, market-data service, beneficial ownership graph or rating.

Current public directory still uses live GLEIF results even if the persistent index is absent. The dedicated `/catalogue` and `/api/catalogue` require configured PostgreSQL. The status page distinguishes available, unconfigured and unavailable states.

## One-time setup (requires an approved database workspace)

1. Provision a **dedicated PostgreSQL 15+** instance, using a suitable region, TLS-validated connections, restricted network exposure, backup retention and least-privilege credentials. Do not share a database with personal or confidential records.
2. Apply `db/migrations/001_lei_catalogue.sql` as an approved migration. No migration runs automatically during deployment or on public requests.
3. Create a restricted application role with `SELECT/INSERT/UPDATE` on the four `cq_*` tables and `USAGE/SELECT` on their identity sequences; deny schema creation and unnecessary table/role privileges. Keep a separate migration role.
4. Add `DATABASE_URL` to Vercel **encrypted or sensitive** environment configuration and redeploy. Do not place credentials in git or `NEXT_PUBLIC_*` variables. Require remote TLS certificate verification; the code rejects `sslmode=disable` for remote hosts.
5. Keep `CRON_SECRET` private. The ingestion endpoint requires `Authorization: Bearer <CRON_SECRET>` with timing-safe comparison and accepts **only** ISO two-letter countries, safe page sizes, and pages within the official browse limit.
6. Confirm `/api/catalogue/status` reports `status:"ready"` and a real index count, initially zero. If not, inspect Vercel function logs and database permissions/migration state without sharing secrets.
7. Run a controlled ingestion of the first segment using the private operator endpoint or the operator CLI. Validate several returned LEIs by opening each original GLEIF record.
8. The background Vercel cron runs `/api/ops/catalogue-sync` hourly at minute 25. It rotates through 16 countries, fetches 3 pages per run, and advances each country's cursor only on all-page success. Without `DATABASE_URL` it exits harmlessly with `status:"disabled"`. Rate limits, API terms and data freshness must be monitored.
9. For accelerated backfill from an authorised operator machine, with its own scoped env:

   `npm run catalogue:backfill -- --country=US --batches=20 --pages=3 --sleep-ms=2500`

   Omit `--country` to cycle the configured 16 markets. Stop/retry on a source failure; deduplication and cursors make retries safe. Bulk ingestion should not run on Vercel request handlers.
10. Review `/catalogue` and `/api/catalogue`; direct GLEIF `/directory` remains an always-available alternative when upstream access works. The indexed catalogue uses prefix name matching for predictable index performance.

## Security boundaries

- No private company workbench drafts, unlisted financial data, user accounts or credentials are stored in `cq_lei_catalogue`. Browser-local research remains on the user's device.
- Public `GET /api/catalogue` is read-only; ingestion is protected with `CRON_SECRET`. Database insert/upserts use parameterised SQL; request handlers cannot choose a network host.
- Remote DB TLS is mandatory and certificates are validated. Use provider-recommended certificate roots.
- A company exists in this catalogue only after it is returned from the official GLEIF source adapter. No model, scraping substitute or analyst inference may manufacture an entity identity.
- Source fingerprint is not an authenticity guarantee; it only detects that an indexed reference payload has changed.
- GLEIF participation is not universal. A search returning no LEI does not establish a business's nonexistence. Company grouping, parentage, valuations and creditworthiness still require separate primary-source evidence.
- Retention, data portability, licensing, corporate risk methodology and private multi-tenant access remain independent future work.

## Validation and rollback

- Unit tests cover fingerprint determinism, invalid filters, jurisdiction-scoped identity matching, source failure behaviour and configuration states.
- Browser tests exist for responsive pages and the intelligence console; these need execution in a browser session. Vercel READY means build/test/typecheck passed, not the browser suite.
- Disabling/removing `DATABASE_URL` immediately reverts the indexed page to the live-directory link without removing the underlying database. To roll back the application release, revert the feature PR; preserve the DB and backup before any destructive schema migration.
