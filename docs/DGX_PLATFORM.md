# CREQOR DGX private intelligence platform

_Operational runbook for the private CREQOR backend on an NVIDIA DGX Spark (Ubuntu 24.04, arm64).
Host names, IPs and credentials are intentionally not recorded in this repository._

## System boundary

| Layer | Where | Exposure |
| --- | --- | --- |
| Next.js website | Vercel | Public. Holds only `DGX_ENGINE_HTTPS_URL`, `DGX_ENGINE_TOKEN`, `CREQOR_ANALYST_ACCESS_TOKEN`. Never a database URL. |
| HTTPS gateway | Tailscale Funnel path `/creqor-engine` on the DGX's existing `*.ts.net` HTTPS listener (or Cloudflare Tunnel + Access) | Public TLS endpoint that forwards **only** to the engine's loopback port. |
| CREQOR engine (`services/dgx/server.ts`) | Docker, host network, `127.0.0.1:8196` | Loopback only. Bearer token (96 hex chars) on every `/v1` route; global rate limits; unauthenticated-request throttle. |
| PostgreSQL 17 | Docker, `127.0.0.1:5432` | Loopback only. scram-sha-256, data checksums, DDL/connection logging. |
| vLLM (existing, not managed by CREQOR) | host, port 8002 | CREQOR calls it on loopback only (`DGX_VLLM_ENDPOINT`), max 2 concurrent requests. |

Port 8188 is used by another service on shared hosts, so the engine defaults to **8196** (`DGX_ENGINE_PORT`).

## Database roles (least privilege)

| Role | Used by | Rights |
| --- | --- | --- |
| `creqor` | migrations, backups, job ledger | owner (superuser in the official image; never given to the engine) |
| `creqor_app` | engine | `SELECT` on public records, `INSERT` on `cq_ai_research_audit`; `statement_timeout=15s` |
| `creqor_ingest` | import jobs | `INSERT/UPDATE` on source tables and job/run ledgers; no `DELETE`, no DDL |

Roles are created `NOLOGIN` by migration 004 and enabled by `scripts/dgx-db-bootstrap.sh`, which reads passwords from `.env.dgx` via psql variables with statement logging disabled. Re-run it to rotate passwords. Containers receive only the variables they need (no shared `env_file`): the engine never sees the owner or ingest passwords.

## Deploy / upgrade

```bash
# On an operator workstation that can reach the public sources
export CREQOR_DGX_SSH=user@dgx-host CREQOR_DGX_DIR=creqor-platform
scripts/relay/dgx-relay.sh sync     # repo -> $CREQOR_DGX_DIR/app (never .env*)
scripts/relay/dgx-relay.sh image    # build linux/arm64 engine image, docker load on the DGX
# On the DGX
cd ~/creqor-platform/app
cp infrastructure/dgx/.env.dgx.example .env.dgx && chmod 600 .env.dgx   # fill with `openssl rand -hex 32` values
docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml up -d postgres
scripts/dgx-migrate.sh              # ordered, checksummed, one transaction per file
scripts/dgx-db-bootstrap.sh         # enable creqor_app / creqor_ingest
docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml up -d engine
tailscale funnel --bg --https=443 --set-path=/creqor-engine http://127.0.0.1:8196
```

Remove only the CREQOR route with `tailscale funnel --https=443 --set-path=/creqor-engine off`
(**never** `tailscale funnel --https=443 off`, which removes every route on that listener).

Vercel: set `DGX_ENGINE_HTTPS_URL=https://<host>.ts.net/creqor-engine/` (trailing slash), `DGX_ENGINE_TOKEN` (same value as `.env.dgx`) and `CREQOR_ANALYST_ACCESS_TOKEN`.

## Restricted networks (operator relay)

Some DGX networks run DNS security filtering that blocks GLEIF, SEC, Companies House, npm, Docker Hub and OS mirrors. CREQOR does not modify firewall or DNS policy. Instead `scripts/relay/dgx-relay.sh` runs on a workstation that can reach the official sources and:

* downloads the official GLEIF Golden Copy archive and its publish metadata, checks the published byte size, computes SHA-256, copies both to the DGX and runs the importer with `--archive --metadata --expected-sha256 --retrieved-at --resume`;
* builds the engine image for `linux/arm64` and loads it on the DGX;
* the run ledger records `retrieval_path='operator-relay'`.

Allow-listing these domains on the DGX network enables direct, unattended refresh: `goldencopy.gleif.org`, `api.gleif.org`, `www.sec.gov`, `data.sec.gov`, `registry.npmjs.org`, `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com`.

## Ingestion

```bash
# Inside the DGX stack (ingest role, bounded memory/CPU)
docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml --profile jobs run --rm -T ingest \
  scripts/gleif-golden-copy.ts --archive=/var/creqor/imports/<file>.csv.zip \
  --metadata=/var/creqor/imports/lei2-latest.json --expected-sha256=<hex> --limit=100000   # milestone A
#   ... --limit=all --resume                                                                  # full publication
```

Every run writes `cq_bulk_source_runs` (publication date, official record count, archive SHA-256 and size, retrieval time and path, rows read / valid / rejected / inserted / changed, status). Per entity: `first_seen_run_id`, `last_changed_run_id`, `last_seen_run_id`, `source_published_at`; every distinct source version is kept in `cq_lei_observations`. After a complete full-file run, records absent from that publication are counted as stale — never deleted. Checkpoints are written after every committed batch, so `--resume` continues an interrupted run. Unchanged records are only re-confirmed (HOT update), so daily re-imports do not create new versions.

SEC issuers (`scripts/sec-issuer-catalogue.ts`) and companyfacts (`scripts/sec-financial-backfill.ts`) require `SEC_USER_AGENT` with a real organisation and monitored contact email (SEC fair-access policy). Leave it empty to keep SEC collection disabled.

## Engine API (all `/v1` routes require `Authorization: Bearer <DGX_ENGINE_TOKEN>`)

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/health` | liveness only |
| GET | `/v1/status` | exact stored counts, DB size, GLEIF run freshness, stale count, job states, model reachability |
| GET | `/v1/search?q=&country=&limit=` | LEI exact → name prefix → substring/name-variant (pg_trgm) → SEC issuers; each result labelled with its match type |
| GET | `/v1/lei/:lei` | source record, provenance, version history, deterministic identity leads, missing fields, exact-name SEC candidates (explicitly "name match only") |
| POST | `/v1/lei/:lei/research` | deterministic summary + optional local-model interpretation; audited |
| GET | `/v1/financials/:cik` | stored companyfacts + `lib/financial-analysis.ts` ratios, trends and signals |
| POST | `/v1/valuation/:cik` | `lib/valuation-scenarios.ts` bear/base/bull DCF, sensitivity, multiples, NAV — assumptions must be explicit |
| POST | `/v1/research` | SEC research: deterministic analysis + optional model interpretation; audited |

Analytical responses are split into `verifiedSource`, `deterministicCalculations`, `analystAssumptions`, `aiInterpretation` and `missingOrUnverified`. Model output that cites an accession number or LEI not present in the supplied evidence is discarded (deterministic answer returned, reason recorded). Source documents are passed to the model as untrusted data. Every analysis is written to `cq_ai_research_audit` with subject, question, source versions, assumptions, model id, prompt version, latency and review state (`unreviewed` by default — nothing is auto-published).

## Supervised jobs (systemd user timers, lingering enabled)

| Timer | Schedule | Script |
| --- | --- | --- |
| `creqor-health.timer` | every 15 min | `scripts/dgx-jobs.sh health` — Postgres, engine, model, disk ≥ 85 %, memory < 4 GB, backup age > 36 h |
| `creqor-quality.timer` | daily 06:30 | `scripts/dgx-jobs.sh quality` — invalid rows, provenance gaps, stale records, publication age > 72 h |
| `creqor-backup.timer` | daily 02:30 | `scripts/dgx-backup.sh` |

Install: `cp infrastructure/dgx/systemd/* ~/.config/systemd/user/ && systemctl --user daemon-reload && systemctl --user enable --now creqor-{health,quality,backup}.timer`. Results land in `cq_job_runs` and are shown on `/engine`. Exit code 3 = warning.

## Backups and recovery

* `scripts/dgx-backup.sh`: `pg_dump -Fc` streamed into `age` public-key encryption (no plaintext on disk), SHA-256 manifest, row-count manifest, retention `DGX_BACKUP_KEEP`. The **age private key is kept off the DGX**.
* `scripts/relay/pull-backups.sh`: copies encrypted dumps to an off-host directory and verifies checksums.
* `scripts/relay/restore-test.sh`: decrypts the newest dump off-host, restores into a throwaway PostgreSQL 17 container and compares row counts with the backup manifest.
* Logical dumps are not point-in-time recovery. For production continuity add WAL archiving / PITR to an off-site object store.

## Known limitations

* The DGX root filesystem is plain ext4 (no LUKS). Encryption at rest for the live database requires a root-provisioned LUKS volume; backups are encrypted.
* A single DGX is a single point of failure; recovery depends on off-host encrypted backups.
* Tailscale Funnel enforces TLS but not identity; authentication is the engine bearer token plus rate limiting. Cloudflare Access service tokens are the stronger option where available.
* Ingestion and model inference share the host; containers are CPU/memory capped and model calls are concurrency-limited, but vLLM itself is managed outside CREQOR.
