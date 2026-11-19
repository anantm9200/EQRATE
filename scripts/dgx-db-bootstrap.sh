#!/usr/bin/env bash
# Enable LOGIN for CREQOR's least-privilege runtime roles and (re)set their
# passwords from .env.dgx. Idempotent; also used for password rotation.
# Passwords are passed through stdin-interpreted psql variables, never argv, and
# statement logging is disabled for this session so they never reach server logs.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
[[ -f .env.dgx ]] || { echo 'Missing operator-owned .env.dgx' >&2; exit 2; }
set -a; source .env.dgx; set +a
for name in CREQOR_APP_DB_PASSWORD CREQOR_INGEST_DB_PASSWORD; do
  value="${!name:-}"
  if [[ ! "$value" =~ ^[A-Za-z0-9]{32,128}$ ]]; then
    echo "$name must be 32-128 URL-safe alphanumeric characters." >&2; exit 2
  fi
done
# Values travel via the docker CLI environment (-e NAME without =value), not argv.
export APP_PW="$CREQOR_APP_DB_PASSWORD" INGEST_PW="$CREQOR_INGEST_DB_PASSWORD"
docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml exec -T \
  -e APP_PW -e INGEST_PW postgres \
  sh -c 'psql -X -q -v ON_ERROR_STOP=1 -U creqor -d creqor -v app_pw="$APP_PW" -v ingest_pw="$INGEST_PW"' <<'SQL'
SET log_statement = 'none';
SET log_min_duration_statement = -1;
ALTER ROLE creqor_app WITH LOGIN PASSWORD :'app_pw' CONNECTION LIMIT 16;
ALTER ROLE creqor_ingest WITH LOGIN PASSWORD :'ingest_pw' CONNECTION LIMIT 8;
ALTER ROLE creqor_app SET statement_timeout = '15s';
ALTER ROLE creqor_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE creqor_ingest SET idle_in_transaction_session_timeout = '10min';
SQL
echo 'CREQOR runtime roles enabled (creqor_app, creqor_ingest).'
