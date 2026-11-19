# CREQOR public-records ingestion — source-by-source activation

_Updated 18 November 2026. This is executable code and an operator procedure, not proof of a populated production database._

## Verified official sources

**GLEIF (global LEI):** https://goldencopy.gleif.org/api/v2/golden-copies/publishes/lei2/latest  
Official release observed 2026-11-18 08:00 UTC reported **3,497,788 legal-entity records** and a **510,204,340-byte compressed CSV archive**. Public source count is not a count of records yet ingested into CREQOR. The GLEIF API supplies live source records independently of the bulk catalogue. The official Golden Copy feed has full and delta files; use full initially and deltas or periodic full refreshes afterward. Scope is legal-entity identity and registration status, not share-price or independent creditworthiness verification.

**SEC (US-listed ticker associations):** https://www.sec.gov/files/company_tickers_exchange.json  
Official file observed 2026-11-18 included **10,400 ticker/CIK/exchange associations** for **7,996 unique CIKs** in our operator discovery check. These are ticker associations, NOT necessarily 10,400 distinct companies, market prices or current listing guarantees. The SEC requires compliant automated access; configure `SEC_USER_AGENT` with a genuine monitored organization/contact email. See https://www.sec.gov/search-filings/edgar-application-programming-interfaces and https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data.

## What is already working without persistent storage

- `/directory` and GLEIF entity detail search the official global source on demand (60 legal entities per page).
- `/api/public-records/coverage` fetches and caches published global source coverage and **separately** states how many records are stored locally. This endpoint must never present source coverage as imported local company profiles.
- Home and directory public-records panels expose the difference between official source reach and local ingestion.
- `/issuers` is prepared for source-attributed SEC issuer research and shows honest unconfigured messaging until its index is available.

## Preconditions for a large index

1. Select an authorized dedicated Postgres workspace with sufficient disk/headroom for millions of records, indexes and immutable observations. Do not reuse an unrelated company's private database.
2. Review and apply `db/migrations/001_lei_catalogue.sql` and `002_official_sec_issuers.sql` in order. Use a migration/admin role distinct from the restricted application role.
3. Add restricted, TLS-verified `DATABASE_URL` to Vercel and operator environment; do not commit any credential. Confirm `/api/catalogue/status` reports ready.
4. For SEC imports, set `SEC_USER_AGENT` to **real organisation name and monitored contact email** in the authorised operator environment; never invent an address and never bypass SEC access controls.
5. Configure backups, connection limits, retention policy, source update schedule, monitoring and restoration testing before ingesting millions of records.
6. Keep the full GLEIF bulk job on an operator-controlled machine/worker with reliable network/disk; do NOT download a half-gigabyte archive on each Vercel deployment or inside a browser request.

## Operator commands (once storage is approved)

```bash
# Dry run validates the official Golden Copy release/archive and first 500 data rows.
npm run catalogue:golden-copy -- --dry-run --limit=500

# Import the first 100,000 real LEI identities with exact provenance and deduplication.
npm run catalogue:golden-copy -- --limit=100000

# Import all current LEI identities. This job is significantly larger; reserve capacity.
npm run catalogue:golden-copy -- --limit=all --batch-size=750

# Reprocess an already-downloaded original ZIP without another source download:
npm run catalogue:golden-copy -- --archive=/secure/path/official-golden-copy.csv.zip --limit=all

# Ingest official SEC CIK/ticker/exchange associations, separate from LEIs.
# Requires real SEC_USER_AGENT contact email and DATABASE_URL.
npm run catalogue:sec-issuers
```

The GLEIF CSV importer validates required headers, downloads only allowlisted official HTTPS archive locations, checks archive size, reads one CSV entry via streaming unzip, rejects invalid LEIs, writes at most 1,000 entities per transaction, and retains source-hash observations when records change. Source failures abort rather than invent replacement companies.

SEC ingestion stores ticker associations in `cq_sec_issuers` without merging legal entities by name. Distinct share classes can share a CIK. Do not infer cross-registry LEI↔CIK identity without an authoritative mapping.

## Operational verification

- Check official source publication date and content count first.
- Validate imports with `SELECT count(*) FROM cq_lei_catalogue;` and `SELECT count(DISTINCT cik) FROM cq_sec_issuers;` (read-only).
- Spot-check a sample of records against GLEIF LEI pages and SEC EDGAR links. Preserve as-of time, source URL and registration status.
- Compare source coverage, actually indexed count, duplicates, invalid-record rate and source freshness separately.
- The source may contain withdrawn/lapsed/retires entities; do not imply all LEIs describe active businesses.
- Do not label these records as audited financial profiles, investment recommendations, current market capitalizations, fraud findings or published ratings.

## Future enrichment sources

After the identity index and data quality checks are operational, integrate official SEC submission histories and XBRL companyfacts for eligible filers (using a compliant SEC identity), followed by other national public registries subject to their individual terms and data licensing. Keep jurisdictions, fiscal dates, measurement units, share classes and consolidation scope separate. Validate every calculation before publishing.

**Known infrastructure blocker as of this code change:** CREQOR's production Vercel project has no `DATABASE_URL` or `SEC_USER_AGENT` configured. The source catalogue import commands are implemented, but no bulk database import has been executed. Choosing an authorised workspace and approving capacity are required to activate persistent indexing.
