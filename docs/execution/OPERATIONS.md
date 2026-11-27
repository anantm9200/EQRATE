# Operations

## Scheduled jobs
| Where | Job | Schedule | What |
|---|---|---|---|
| DGX (systemd user) | creqor-health | every 15 min | DB, engine, model, disk, memory, backup age |
| DGX | creqor-backup | 02:30 daily | age-encrypted pg_dump to `/srv/creqor-secure/backups` |
| DGX | creqor-quality | 06:30 daily | invalid rows, provenance gaps, stale records, publication age |
| Operator Mac (launchd) | com.creqor.refresh | 05:15 daily | `scripts/relay/scheduled-refresh.sh`: GLEIF LEI + RR + REPEX relay, backup pull + checksum |

## Runbooks
- Full DGX runbook: `docs/DGX_PLATFORM.md`.
- After a DGX reboot: `sudo ~/creqor-platform/app/infrastructure/dgx/encrypted-volume.sh unlock`.
- Deploy engine code: `scripts/relay/dgx-relay.sh sync` → on DGX `scripts/dgx-migrate.sh` → `docker build -f infrastructure/dgx/Dockerfile.code-update -t creqor-engine:local .` → `docker compose … up -d engine`.
- Restore drill: `scripts/relay/restore-test.sh` (Mac, Docker).

## Recovery objectives (current, measured where stated)
- RPO: 24 h (nightly logical dump). RTO: ~10 min restore of a 1.6 GB dump (measured 242 s restore on 2026-11-19) plus re-import time if needed.
- PITR: not yet. Plan: WAL archiving (`archive_command` with age encryption to the encrypted volume, pulled off-host with backups) → RPO ≤ 15 min. Needs a Postgres restart (maintenance window) — see MASTER_PLAN O3.
