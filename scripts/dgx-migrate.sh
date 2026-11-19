#!/usr/bin/env bash
# Apply CREQOR SQL migrations in order, exactly once, inside the private Postgres
# container. Each file runs in ONE transaction together with its ledger row, so a
# failed migration leaves no partial schema and no ledger entry. A previously
# applied file whose checksum changed aborts the run (migrations are immutable).
#
#   scripts/dgx-migrate.sh            # apply pending migrations
#   scripts/dgx-migrate.sh --status   # list applied / pending, change nothing
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
[[ -f .env.dgx ]] || { echo 'Missing operator-owned .env.dgx' >&2; exit 2; }
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
psql_owner=("${compose[@]}" exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U creqor -d creqor)

"${psql_owner[@]}" -c "CREATE TABLE IF NOT EXISTS public.cq_schema_migrations (
  version text PRIMARY KEY CHECK (version ~ '^[0-9]{3}_[a-z0-9_]+\$'),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}\$'),
  applied_at timestamptz NOT NULL DEFAULT now())" >/dev/null

status_only=false
[[ "${1:-}" == "--status" ]] && status_only=true

for file in db/migrations/[0-9][0-9][0-9]_*.sql; do
  version="$(basename "$file" .sql)"
  [[ "$version" =~ ^[0-9]{3}_[a-z0-9_]+$ ]] || { echo "Bad migration name: $file" >&2; exit 2; }
  sum="$(sha256sum "$file" | cut -d' ' -f1)"
  applied="$("${psql_owner[@]}" -At -c "SELECT sha256 FROM public.cq_schema_migrations WHERE version='$version'")"
  applied="${applied//[[:space:]]/}"
  if [[ -n "$applied" ]]; then
    if [[ "$applied" != "$sum" ]]; then
      echo "Checksum mismatch for applied migration $version; refusing to continue." >&2
      exit 3
    fi
    echo "applied  $version"
    continue
  fi
  if $status_only; then echo "pending  $version"; continue; fi
  # Strip the file's own BEGIN/COMMIT and wrap file + ledger row in one transaction.
  {
    echo 'BEGIN;'
    grep -v -x -E 'BEGIN;|COMMIT;' "$file"
    echo "INSERT INTO public.cq_schema_migrations(version,sha256) VALUES ('$version','$sum');"
    echo 'COMMIT;'
  } | "${psql_owner[@]}" >/dev/null
  echo "migrated $version"
done
