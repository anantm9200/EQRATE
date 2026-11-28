# CREQOR

**Discover intelligently. Value scientifically. Verify independently.**

CREQOR is a new evidence-led company research and valuation application. Its first-stage code is in the existing [anantm9200/EQRATE](https://github.com/anantm9200/EQRATE) repository.

## What's working in the code

- White-first institutional navy/blue design, Montserrat + Inter, compact shared spacing, accessible keyboard interactions and source-backed company browsing
- Landing, company explorer, issuer profile, comparison, local watchlist, valuation lab, market intelligence, private AI analyst, research, verification and methodology pages
- Official US SEC entity discovery, issuer identity and annual financial highlights **when** `SEC_USER_AGENT` is configured
- Deterministic market-cap and DCF computations with input checks and unit tests
- Live-updating hypothetical DCF scenarios and sensitivity table, explicitly labelled as illustrative
- Server-only DGX inference gateway with access token, off by default, and request constraints
- Structured PostgreSQL database schema for future evidence-backed write workflows
- SEO and social metadata, sitemap and robots, safe preview noindex default

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev
npm test
npm run typecheck
```

Set `SEC_USER_AGENT` to a responsible application identifier and real contact email for permitted SEC access. The app works without it, but company search correctly reports that the registry is not configured.

For DGX, configure `DGX_ENGINE_HTTPS_URL`, `DGX_ENGINE_TOKEN` (and the optional Cloudflare Access pair) plus `CREQOR_ANALYST_ACCESS_TOKEN`. Every AI feature, including the `/analyst` desk, calls the private DGX engine, which owns the model configuration (`DGX_AI_ENABLED`, `DGX_MODEL`, loopback vLLM) and audits each answer. The browser requests analyst access keys directly from authorised users and never receives the server's DGX credentials.

See [architecture and known limits](docs/ARCHITECTURE.md) and [schema](db/schema.sql).

## Important

CREQOR is **not** presenting itself as a licensed credit rating agency. No live trading prices, source-backed private valuations, company scores, M&A events or fabricated financial stories are included. Live market-data coverage, verified financial facts, regulated research, subscriptions and multi-agent RAG remain future implementation stages. Do not publish unsupported market-cap, ranking, or acquisition claims.

CREQOR is deployed on Vercel at https://creqor.vercel.app. Production readiness is confirmed per release; source-provider and database connectivity are separate.
## Research workflows (November 2026)

- **Global company discovery:** GLEIF legal entity search with company identity prefill for the assessment workspace; no claim of financial verification from LEI status
- **Company workbench:** six deterministic valuation methods, listed-market-cap arithmetic for entered price/share inputs, source claim register with editing, draft scoring and report printing
- **Analysis cockpit:** WACC/terminal-growth 5×5 sensitivity grid, bear/base/bull scenarios, analyst-applied adjustments, method divergence and data-completeness review; exportable DCF matrix CSV
- **Research desk:** up to 30 local assessment drafts, search, filters, sorting, duplication, reopening, two-company comparison, JSON bundle backup/import and CSV index
- **Reports:** editable assumptions, analyst source links, open risks and caveats; browser Print can save PDF
- **Runtime:** Vercel Cron invokes `/api/ops/smoke` hourly using `CRON_SECRET` (server setting). Review Vercel production logs for `CREQOR_HOURLY_SMOKE` or failures

### Build and validation

`npm run build` runs `npm test` before `next build`. Vercel Git deployments therefore run deterministic numerical, data-provider and import-safety tests before releasing a build. Playwright tests in `tests-ui/` may be run separately using `npm run test:ui` with a local server; these are not automatically run by the Vercel build.

**No GitHub Actions:** This repository intentionally contains no `.github/workflows` files. Do not recreate them.

### Important limits

Browser localStorage is not a secure encrypted repository, shared workspace or account system. Uploaded evidence files are not accepted; only HTTPS source references and claims are stored locally. Global exchange prices, audited private-company datasets, secure team persistence, independent company ratings, and the private DGX AI service all require separately authorised providers or infrastructure. A method calculation, subjective draft score or registered LEI record is not a verified valuation, credit rating or investment recommendation.

### Data foundation and cross-company intelligence (November 2026)

- **Global company catalogue:** live GLEIF legal-entity browsing with 60 records/page; when configured, an independent versioned PostgreSQL entity index is exposed at `/catalogue` and `/api/catalogue`, with immutable source-fingerprint observations.
- **Authenticated ingestion:** `/api/ops/catalogue-sync` requires `CRON_SECRET`, ingests 3 bounded GLEIF pages from one country per hour and rotates between 16 markets. It returns a disabled status when `DATABASE_URL` is absent. Manual admin requests can specify 1–8 pages per country. A country cursor advances only after all requested pages succeeded.
- **Migration:** `db/migrations/001_lei_catalogue.sql` must be applied to an approved dedicated Postgres 15+ instance with restricted credentials. It has not been applied by the repository or by Vercel.
- **Evidence intelligence:** `/intelligence` compares up to 30 browser-local assessments for repeated URLs, name/identifier conflicts, source-host concentration and large between-draft changes. Local registration numbers are jurisdiction-scoped. Results are **research leads, not independently verified relationships or risk ratings.**
- **Status:** `/status` and `/api/catalogue/status` distinguish an active index from an unconfigured database; no invented count is displayed.
- **Validation:** Vercel runs deterministic tests and Next.js build. Playwright checks require an executable browser session; Vercel build success does not mean those UI tests ran.
- **Not yet provided:** secure organisation accounts, central storage of private research, compliant licensed market pricing, historical audited financial datasets, backtested regulated credit ratings, or a production DGX inference endpoint. These require separate authorisation, credentials and infrastructure.

See [engineering gates](docs/ENGINEERING_PLAYBOOK.md), [design/data sourcing rules](docs/DESIGN_AND_CATALOGUE.md) and [catalogue runbook](docs/CATALOGUE_RUNBOOK.md).

## Official public-records ingestion (18 November 2026)

CREQOR can search live GLEIF legal-entity reference data. The global coverage panel on the homepage and directory reads **official GLEIF Golden Copy publication metadata** and explicitly distinguishes global source coverage from the number actually stored in CREQOR. The latest verified GLEIF source release reported 3,497,788 records (2026-11-18 08:00 UTC); this is **not** a local indexed count.

The Golden Copy CSV importer is implemented at `scripts/gleif-golden-copy.ts` and was exercised against the real official 510,204,340-byte ZIP: 500 of the first 500 rows parsed, 0 invalid in its operator dry run. It streams the archive, handles source schema validation, preserves original LEI provenance, and writes idempotent batches to the existing Postgres catalogue when configured. Never run the huge archive job inside a Vercel request or make it part of a routine Next.js build.

The SEC ticker/CIK/exchange association importer uses the official `company_tickers_exchange.json` file and stores securities associations independently from LEIs. Its source was observed to contain 10,400 ticker associations across 7,996 unique CIKs on 2026-11-18. Its `/issuers` browsing page remains in an honest unconfigured state until Postgres and a genuine `SEC_USER_AGENT` containing a monitored contact email are supplied.

**No production Postgres database is connected and the bulk imports have not been committed to a persistent company index.** The existing live directory remains available; no fictional record, market quote or rating is substituted. See `docs/OFFICIAL_PUBLIC_RECORDS.md` for source citations, migration order, safe operator commands, capacity, validation and rollback.

## DGX private intelligence platform

CREQOR's private backend runs on an NVIDIA DGX Spark (arm64) next to the existing local vLLM service. The Vercel website stays public-facing and reaches the DGX only through an authenticated HTTPS gateway.

- **Database**: PostgreSQL 17 (loopback only, data checksums, scram-sha-256) with ordered, checksummed migrations `001`–`005` (`scripts/dgx-migrate.sh`) and least-privilege runtime roles `creqor_app` / `creqor_ingest` (`scripts/dgx-db-bootstrap.sh`).
- **Ingestion**: the official GLEIF Golden Copy with per-publication provenance (publish date, archive SHA-256, retrieval time, read/valid/rejected/inserted/changed counts), per-entity first/last-seen runs, version history, checkpoints and `--resume`. SEC issuer and companyfacts collection is available once a compliant `SEC_USER_AGENT` is configured.
- **Restricted networks**: `scripts/relay/dgx-relay.sh` moves verified official archives and the arm64 engine image to a DGX whose network blocks public sources and registries, without touching firewall policy.
- **Calculations**: `lib/financial-analysis.ts` (margins, returns, liquidity, leverage, cash conversion, FCF, EBITDA, growth, CAGR, volatility, restatement and deterioration signals; missing never becomes zero) and `lib/valuation-scenarios.ts` (bear/base/bull DCF, EV-to-equity bridge, sensitivity matrix, multiples, NAV; every input labelled source or assumption).
- **Identity intelligence**: `lib/identity-intelligence.ts` deterministic LEI screening leads (lapsed/duplicate/annulled registrations, overdue renewal, stale or self-validated data, shared legal names, successors, absence from the latest publication).
- **AI**: the existing local vLLM model interprets only supplied source data and deterministic results; output citing unknown filings/LEIs is discarded; every analysis is audited (`cq_ai_research_audit`) and falls back to a deterministic answer.
- **Operations**: systemd user timers for health, data quality and age-encrypted backups (`scripts/dgx-jobs.sh`); off-host pull and restore drill in `scripts/relay/`.
- **India**: `/india` hub over every Indian LEI registration (CIN/GSTIN decoded, states, company classes, incorporation history, corporate groups from GLEIF Level 2) and rich `/lei/:lei` profiles with group trees and analyst research.
- **UI**: `/engine` shows real stored counts, source freshness, backend/model health, LEI evidence panels and analyst-gated research; it falls back to live GLEIF search when the DGX is unreachable.

See the [DGX platform runbook](docs/DGX_PLATFORM.md).
