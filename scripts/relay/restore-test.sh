#!/usr/bin/env bash
# Off-host restore drill: decrypt the newest pulled backup with the off-host age
# key, restore it into a throwaway PostgreSQL 17 container, and compare row counts
# with the counts recorded at backup time. Nothing is written back to the DGX.
#   scripts/relay/restore-test.sh [backup-dir] [age-identity-file]
set -euo pipefail
dir="${1:-$HOME/CREQOR-backups/dumps}"
identity="${2:-$HOME/CREQOR-backups/keys/creqor-backup.agekey}"
latest="$(ls -1t "$dir"/creqor-postgres-*.dump.age | head -1)"
[[ -f "$latest" && -f "$identity" ]] || { echo 'backup or identity missing' >&2; exit 2; }
name="creqor-restore-drill-$$"
cleanup(){ docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
pw="$(openssl rand -hex 16)"
docker run -d --name "$name" -e POSTGRES_PASSWORD="$pw" -e POSTGRES_DB=creqor -e POSTGRES_USER=creqor postgres:17-bookworm >/dev/null
for _ in $(seq 1 60); do docker exec "$name" pg_isready -U creqor -d creqor >/dev/null 2>&1 && break; sleep 1; done
# Roles referenced by GRANTs in the dump must exist for a clean restore.
docker exec "$name" psql -q -U creqor -d creqor -c "CREATE ROLE creqor_app NOLOGIN; CREATE ROLE creqor_ingest NOLOGIN;" >/dev/null
start=$(date +%s)
age -d -i "$identity" "$latest" | docker exec -i "$name" pg_restore -U creqor -d creqor --exit-on-error --no-owner
elapsed=$(( $(date +%s) - start ))
restored="$(docker exec "$name" psql -X -At -U creqor -d creqor -c "SELECT json_build_object('leiEntities',(SELECT count(*) FROM public.cq_lei_catalogue),'leiVersions',(SELECT count(*) FROM public.cq_lei_observations),'secIssuers',(SELECT count(*) FROM public.cq_sec_issuers),'secFacts',(SELECT count(*) FROM public.cq_sec_financial_facts),'researchAudits',(SELECT count(*) FROM public.cq_ai_research_audit))")"
expected="$(cat "$latest.counts.json" 2>/dev/null || echo null)"
# Source tables must match exactly. The append-only audit table may legitimately gain rows
# between pg_dump's snapshot and the manifest count, so restored <= manifest is accepted.
match="$(python3 -c '
import json,sys
a=json.loads(sys.argv[1]);b=json.loads(sys.argv[2])
ok=b is not None and all(a[k]==b[k] for k in a if k!="researchAudits") and a.get("researchAudits",0)<=b.get("researchAudits",0)
print(str(ok).lower())' "$restored" "$expected")"
echo "{\"backup\":\"$(basename "$latest")\",\"restoreSeconds\":$elapsed,\"restoredCounts\":$restored,\"countsAtBackup\":$expected,\"countsMatch\":$match}"
[[ "$match" == true ]]
