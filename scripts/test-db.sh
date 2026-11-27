#!/usr/bin/env bash
# Database integration tests: apply every migration to a throwaway PostgreSQL 17 container,
# then run tests-db/*.sql. Never touches the DGX database.
set -euo pipefail
cd "$(dirname "$0")/.."
name="creqor-db-test-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" -e POSTGRES_PASSWORD="$(openssl rand -hex 12)" -e POSTGRES_DB=creqor -e POSTGRES_USER=creqor postgres:17-bookworm >/dev/null
for _ in $(seq 1 60); do docker exec "$name" pg_isready -U creqor -d creqor >/dev/null 2>&1 && break; sleep 1; done
sleep 2
psql_(){ docker exec -i "$name" psql -X -q -v ON_ERROR_STOP=1 -U creqor -d creqor "$@"; }
for f in db/migrations/*.sql; do psql_ < "$f" >/dev/null; echo "applied $(basename "$f")"; done
for f in db/migrations/*.sql; do psql_ < "$f" >/dev/null; done; echo 'migrations re-applied (idempotent)'
for t in tests-db/*.sql; do psql_ -At < "$t"; done
