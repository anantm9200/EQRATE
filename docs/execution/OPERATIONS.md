# Operations

## Scheduled jobs
| Where | Job | Schedule | What |
|---|---|---|---|
| DGX (systemd user) | creqor-health | every 15 min | DB, engine, model, disk, memory, backup age |
| DGX | creqor-backup | 02:30 daily | age-encrypted pg_dump to `/srv/creqor-secure/backups` |
| DGX | creqor-basebackup | Sun 03:30 | encrypted pg_basebackup for PITR |
| DGX | creqor-quality | 06:30 daily | invalid rows, provenance gaps, stale records, publication age |
| Operator Mac (launchd) | com.creqor.refresh | 05:15 daily | `scripts/relay/scheduled-refresh.sh`: GLEIF LEI + RR + REPEX relay, backup pull + checksum |

## Runbooks
- Timers install/update: `cp infrastructure/dgx/systemd/* ~/.config/systemd/user/ && systemctl --user daemon-reload && systemctl --user enable --now creqor-{health,quality,backup,basebackup}.timer`.
- Before the first PostgreSQL start with WAL archiving: `scripts/dgx-provision-wal.sh`.
- Full DGX runbook: `docs/DGX_PLATFORM.md`.
- After a DGX reboot: `sudo ~/creqor-platform/app/infrastructure/dgx/encrypted-volume.sh unlock`.
- Deploy engine code: `scripts/relay/dgx-relay.sh sync` → on DGX `scripts/dgx-migrate.sh` → `docker build -f infrastructure/dgx/Dockerfile.code-update -t creqor-engine:local .` → `docker compose … up -d engine`.
- Restore drill: `scripts/relay/restore-test.sh` (Mac, Docker).

## Recovery objectives (current, measured where stated)
- RPO: 24 h (nightly logical dump). RTO: ~10 min restore of a 1.6 GB dump (measured 242 s restore on 2026-11-19) plus re-import time if needed.
- PITR: WAL archived to `/srv/creqor-secure/wal-archive` (encrypted volume, hourly forced segment → local RPO ≤ 1 h) + weekly age-encrypted base backup (`creqor-basebackup.timer`, Sun 03:30; two kept; older WAL pruned). Off-host copies: nightly dumps + weekly base backups (pulled by the Mac relay). WAL itself stays on the DGX, so off-host RPO remains 24 h.
- PITR restore: decrypt the base backup off-host or on the DGX (`age -d -i key base.tar.gz.age | tar -xz -C <empty data dir>`), set `restore_command='cp /var/lib/postgresql/wal-archive/%f %p'` and `recovery_target_time='<UTC>'`, create `recovery.signal`, start PostgreSQL 17 on that directory, verify counts, then promote.
