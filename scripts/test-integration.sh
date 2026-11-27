#!/usr/bin/env bash
# Engine integration tests: throwaway PostgreSQL 17 + every migration + the real engine
# process running as the least-privilege creqor_app role. Never touches the DGX.
set -euo pipefail
cd "$(dirname "$0")/.."
name="creqor-int-$$"; port=$((20000+RANDOM%20000)); eport=$((40000+RANDOM%20000))
cleanup(){ [[ -n "${engine:-}" ]] && kill "$engine" 2>/dev/null; docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
apw="$(openssl rand -hex 16)"
opw="$(openssl rand -hex 12)"
docker run -d --name "$name" -p 127.0.0.1:$port:5432 -e POSTGRES_PASSWORD="$opw" -e POSTGRES_DB=creqor -e POSTGRES_USER=creqor postgres:17-bookworm >/dev/null
for _ in $(seq 1 60); do docker exec "$name" pg_isready -U creqor -d creqor >/dev/null 2>&1 && break; sleep 1; done; sleep 2
for f in db/migrations/*.sql; do docker exec -i "$name" psql -X -q -v ON_ERROR_STOP=1 -U creqor -d creqor < "$f" >/dev/null; done
docker exec "$name" psql -X -q -U creqor -d creqor -c "ALTER ROLE creqor_app LOGIN PASSWORD '$apw'" >/dev/null
export CREQOR_MFA_KEY="$(openssl rand -hex 32)" DGX_ENGINE_TOKEN="$(openssl rand -hex 32)" DGX_ENGINE_PORT=$eport DGX_AI_ENABLED=false \
 DATABASE_URL="postgresql://creqor_app:$apw@127.0.0.1:$port/creqor"
npx tsx services/dgx/server.ts > /tmp/creqor-int-engine.log 2>&1 & engine=$!
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$eport/health" && break; sleep 1; done
OWNER_DATABASE_URL="postgresql://creqor:$opw@127.0.0.1:$port/creqor" ENGINE_URL="http://127.0.0.1:$eport" npx tsx --test tests-integration/*.test.ts
