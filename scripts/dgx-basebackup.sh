#!/usr/bin/env bash
# Weekly physical base backup for point-in-time recovery (with the WAL archive).
# Streams pg_basebackup (tar, gzip) straight into age public-key encryption; keeps the two
# newest base backups and prunes archived WAL older than the oldest kept base backup.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$repo_root"
set -a; source .env.dgx; set +a
age_bin="${AGE_BIN:-$(command -v age || true)}"
[[ -z "$age_bin" && -x "$repo_root/../bin/age" ]] && age_bin="$repo_root/../bin/age"
[[ -x "$age_bin" ]] || { echo 'age binary not found (set AGE_BIN).' >&2; exit 2; }
[[ "${DGX_BACKUP_RECIPIENT:-}" =~ ^age1[a-z0-9]{58}$ ]] || { echo 'DGX_BACKUP_RECIPIENT must be an age public recipient.' >&2; exit 2; }
backup_dir="${DGX_BACKUP_DIR:-${CREQOR_DATA_DIR}/backups}"; wal_dir="${CREQOR_DATA_DIR}/wal-archive"
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
[[ "$("${compose[@]}" exec -T postgres psql -X -At -U creqor -d creqor -c 'SHOW archive_mode')" == "on" ]] || { echo 'WAL_ARCHIVING_NOT_ACTIVE: a base backup without WAL cannot provide PITR' >&2; exit 2; }
stamp="$(date -u +%Y%m%dT%H%M%SZ)"; final="$backup_dir/creqor-postgres-base-$stamp.tar.gz.age"; partial="$final.partial"
trap 'rm -f "$partial"' EXIT
"${compose[@]}" exec -T postgres pg_basebackup -U creqor -D - -Ft -z -X none --checkpoint=spread -l "creqor-base-$stamp" \
  | "$age_bin" -r "$DGX_BACKUP_RECIPIENT" > "$partial"
head -c 21 "$partial" | grep -q 'age-encryption.org/v1' || { echo 'BASE_BACKUP_NOT_AGE_ENCRYPTED' >&2; exit 1; }
[[ "$(stat -c %s "$partial")" -gt 1000000 ]] || { echo 'BASE_BACKUP_TOO_SMALL' >&2; exit 1; }
mv "$partial" "$final"; sha256sum "$final" | sed "s#  .*/#  #" > "$final.sha256"; chmod 600 "$final" "$final.sha256"
# Retention: two base backups; WAL older than the oldest kept base backup is no longer needed.
ls -1t "$backup_dir"/creqor-postgres-base-*.tar.gz.age | tail -n +3 | while read -r old; do rm -f "$old" "$old.sha256"; done
oldest="$(ls -1t "$backup_dir"/creqor-postgres-base-*.tar.gz.age | tail -1)"
# Remove only WAL older than the start of the oldest kept base backup, using its backup-history file.
label="creqor-base-$(basename "$oldest" | sed -E 's/^creqor-postgres-base-(.*)\.tar\.gz\.age$/\1/')"
history="$(grep -l "LABEL: $label" "$wal_dir"/*.backup 2>/dev/null | head -1 || true)"
[[ -n "$history" ]] && "${compose[@]}" exec -T postgres pg_archivecleanup /var/lib/postgresql/wal-archive "$(basename "$history")"
"${compose[@]}" exec -T postgres psql -X -q -U creqor -d creqor -c \
 "INSERT INTO cq_job_runs (job,status,started_at,finished_at,detail) VALUES ('basebackup','ok',now(),now(),jsonb_build_object('file','$(basename "$final")'))" >/dev/null 2>&1 || true
echo "{\"baseBackup\":\"$(basename "$final")\",\"bytes\":$(stat -c %s "$final")}"
