# CREQOR DGX private intelligence platform

_Implementation status: deployable architecture, not evidence that the DGX host was remotely configured or that a public endpoint is connected._

## System boundary

**Vercel:** user-facing Next.js website, public GLEIF discovery, authentication for analyst-only research, a server-side DGX client, read-only search and status. Vercel never receives the PostgreSQL password or unrestricted access to local vLLM ports.

**DGX Spark:** Ubuntu 24.04-based ARM64 system with existing vLLM inference. A separate CPU-limited Node service handles authenticated company queries and source-backed analysis. PostgreSQL 17 on **encrypted durable SSD/NVMe** stores official GLEIF identities, SEC issuer records, per-period XBRL facts and research audit traces. GPU memory is reserved for inference, not for persistent company storage.

**Connectivity:** both the API and PostgreSQL bind only to 127.0.0.1, as does the model gateway. Deploy a separately managed, audited HTTPS reverse tunnel (e.g., Cloudflare Tunnel + Access service-token policy) to the API *only*. Vercel sends a service-token header pair and an independent 32+ character Bearer token. Never expose TCP 5432, 8001 or 8188 directly to the internet, and never accept a user-supplied destination URL.

**Reliability:** a single DGX is a single point of failure. Keep off-host encrypted Postgres base backups/WAL archiving, immutable snapshots, restore drills and available disk monitoring. A local SSD is not an offsite backup. Separate ingestion from GPU compute; container memory caps apply to the API and PostgreSQL, but the existing vLLM service must be independently sized.

## Deployment preconditions

1. From the DGX itself, verify host OS/architecture, actual free capacity on the target SSD, vLLM localhost reachability, network and power reliability. Don't assume the NVMe has enough room for millions of change-history rows and SEC facts.
2. Use an encrypted dedicated volume, prepare `/srv/creqor/postgres` (or a configured alternate path), filesystem ownership appropriate to the PostgreSQL container, and an independent encrypted backup destination.
3. Install Docker Engine and Compose supported on Ubuntu ARM64; verify the selected `postgres:17-bookworm` and `node:22-bookworm-slim` images resolve for `linux/arm64`.
4. Clone the reviewed CREQOR repo and create the repository-root `.env.dgx` from `infrastructure/dgx/.env.dgx.example`. Set **real** cryptographically generated, independent `CREQOR_DB_PASSWORD` (URL-safe hex), `DGX_ENGINE_TOKEN` and exact `DGX_MODEL`; never commit them. No real host credentials were generated or set by this commit.
5. The stack is built from `infrastructure/dgx/compose.yaml`. From the repo root, run a reviewed `docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml up -d --build` on the DGX and validate that both services are healthy. The API only accepts loopback binding.
6. Apply the existing three migrations **in order**, using the local database container and an approved administrative role: `001_lei_catalogue.sql`, `002_official_sec_issuers.sql`, `003_dgx_intelligence.sql`. No migration runs automatically at build/deploy time.
7. Ingest public LEI/SEC records using operator-controlled jobs:
   - `npm run catalogue:golden-copy -- --dry-run --limit=500` (verify live Golden Copy archive first).
   - `npm run catalogue:golden-copy -- --limit=100000` (initial real-index milestone).
   - `npm run catalogue:golden-copy -- --limit=all --batch-size=750` (scale within disk and maintenance limits).
   - `npm run catalogue:sec-issuers` (requires a compliant real `SEC_USER_AGENT`).
   - `npm run catalogue:sec-financials -- --limit=50 --delay-ms=600` (paced XBRL backfill; rerun to advance).
   The scripts should run on the DGX or a controlled worker with direct secure database access; never run large ZIP imports in Vercel.
8. Check `http://127.0.0.1:8188/health` locally and authenticated `/v1/status` and `/v1/search?q=...`. Verify counts reflect real imported records, including sample checks against the original GLEIF/SEC endpoints. Check sample financial histories against SEC accession IDs and fiscal periods.
9. Configure an authenticated **HTTPS** gateway to localhost port 8188, protected by a service-token policy and strict rate limiting. Do not enable a public anonymous bypass route. Permit only server-to-server Vercel traffic where technically feasible.
10. In Vercel project environment settings, add `DGX_ENGINE_HTTPS_URL` (an HTTPS origin with trailing `/`), `DGX_ENGINE_TOKEN`, optionally the paired `DGX_ACCESS_CLIENT_ID`/`DGX_ACCESS_CLIENT_SECRET`. Analyst-only research uses the **existing** `CREQOR_ANALYST_ACCESS_TOKEN`. Do not set `DATABASE_URL` in Vercel for this architecture. Verify `/api/engine/status` and `/engine` before advertising availability.

## API

| Method | Path | Grounded behaviour |
| --- | --- | --- |
| GET | `/health` | Only loopback server liveness, no sensitive counts |
| GET | `/v1/status` | Authenticated actual PostgreSQL row counts and model configuration flag |
| GET | `/v1/search?q=NAME&country=US&limit=30` | Authenticated LEI and SEC source-linked identities, never an inferred company merge |
| GET | `/v1/financials/0000320193` | Authenticated XBRL facts and comparable annual series |
| POST | `/v1/research` | Authenticated source-grounded deterministic analysis, optional local vLLM explanation and explicitly assumed DCF |

Requests to the private API require `Authorization: Bearer <DGX_ENGINE_TOKEN>`. The public website uses only the Next.js routes `/api/engine/status`, `/api/engine/search`, and analyst-authorized `/api/engine/research` through the protected server-side gateway.

## Data provenance and financial integrity

- **GLEIF**: names, LEIs, country, jurisdiction and registration status are only legal-entity reference facts. No automatic ownership relationships, trade eligibility or market cap.
- **SEC**: CIK/ticker associations may include multiple securities for a single filer. SEC companyfacts are issuer-reported observations, not independently guaranteed truth.
- **History**: facts preserve fiscal period, unit, form, accession, filing date and source URL; repetitions/restatements remain version-identifiable.
- **Calculations**: FCF is derived only when operating cash flow and capex from the same annual period are both available. DCF requires separately disclosed analyst assumptions for growth, discount, terminal growth, share count and net debt; never report it as observed market cap.
- **AI**: the locally served model receives only stored source figures and references with strict no-fabrication instructions. Results are labelled model-assisted, saved to an audit table and fall back to deterministic sourced summaries if inference is unavailable. Model reasoning is not a regulated rating.
- **Security**: user-submitted arbitrary URLs, unrestricted SQL, executable instructions and raw filesystem access are never permitted by the API. No banking or sensitive private documents should be ingested into the public catalogue.

## Capacity/recovery gates

Before importing millions of entities, verify storage allocation, migration performance, index build time, ingestion costs, backups, restore time, SSD wear, and DGX GPU/CPU contention. The DGX alone is **not** a high-availability production database. An offsite mirror or restore strategy is required before depending on it for business continuity.

## Current code verification versus real deployment

New files, scripts, migrations, backend API, tests and UI can be validated in the repository. Direct SSH control of the user's DGX, its local filesystem/volumes, vLLM process and HTTPS tunnel were **not available** to this chat. Therefore no claim of live DGX indexing or model serving can be made without an explicit on-host deployment and end-to-end smoke test.
