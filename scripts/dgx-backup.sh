#!/usr/bin/env bash
# Encrypted, streamed PostgreSQL off-host backup. Run by an approved DGX operator.
# No plaintext dump is written to disk. Require a restore test before relying on it.
set -euo pipefail
if [[ -z "${DGX_BACKUP_RECIPIENT:-}" || -z "${DGX_BACKUP_REMOTE:-}" ]]; then
  echo 'Encrypted off-host backup requires DGX_BACKUP_RECIPIENT and DGX_BACKUP_REMOTE.' >&2
  exit 2
fi
if [[ "$DGX_BACKUP_RECIPIENT" != age1* || "$DGX_BACKUP_REMOTE" != *:* ]]; then
  echo 'Backup encryption recipient or rclone remote is invalid.' >&2
  exit 2
fi
for command in docker age rclone; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required backup tool: $command" >&2
    exit 2
  fi
done
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
if [[ ! -f .env.dgx ]]; then
  echo 'Missing operator-owned .env.dgx file.' >&2
  exit 2
fi
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${DGX_BACKUP_REMOTE%/}/creqor-postgres-$stamp.dump.age"
# pipefail ensures that pg_dump, age encryption or offsite upload failure fails
# the job. The remote must apply immutability/retention and access restrictions.
docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml \
  exec -T postgres pg_dump -U creqor -d creqor -Fc -Z 3 |
  age -r "$DGX_BACKUP_RECIPIENT" |
  rclone rcat "$destination"
echo "CREQOR encrypted backup successfully uploaded to configured remote ($stamp)."
