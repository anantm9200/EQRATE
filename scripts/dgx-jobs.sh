#!/usr/bin/env bash
# Supervised CREQOR DGX jobs. Each run is recorded in public.cq_job_runs.
#   scripts/dgx-jobs.sh health    # service, disk, memory, model and backup-age checks
#   scripts/dgx-jobs.sh quality   # data-quality and source-freshness checks
#   scripts/dgx-jobs.sh backup    # encrypted backup (delegates to dgx-backup.sh)
# Exit code: 0 ok, 1 failed, 3 warning (so timers/alerting can distinguish).
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
[[ -f .env.dgx ]] || { echo 'Missing .env.dgx' >&2; exit 2; }
set -a; source .env.dgx; set +a
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
psql_owner=("${compose[@]}" exec -T postgres psql -X -q -At -v ON_ERROR_STOP=1 -U creqor -d creqor)
job="${1:-}"
record(){ # job status detail_json [error]
  local err="${4:-}"
  "${psql_owner[@]}" -c "INSERT INTO public.cq_job_runs(job,status,finished_at,detail,error_code) VALUES ('$1','$2',now(),'$3'::jsonb,NULLIF('$err',''))" >/dev/null
}
case "$job" in
  backup) exec "$repo_root/scripts/dgx-backup.sh" ;;
  health)
    status=ok; problems=()
    pg=false; "${compose[@]}" exec -T postgres pg_isready -U creqor -d creqor >/dev/null 2>&1 && pg=true || { status=failed; problems+=(POSTGRES_DOWN); }
    port="${DGX_ENGINE_PORT:-8196}"
    engine=false; curl -fsS -m 5 "http://127.0.0.1:$port/health" >/dev/null 2>&1 && engine=true || { status=failed; problems+=(ENGINE_DOWN); }
    model_url="${DGX_VLLM_ENDPOINT%/chat/completions}/models"
    model=false; curl -fsS -m 5 "$model_url" >/dev/null 2>&1 && model=true || { [[ "$status" == ok ]] && status=warning; problems+=(MODEL_UNREACHABLE); }
    disk_pct="$(df --output=pcent "$CREQOR_DATA_DIR" | tail -1 | tr -dc '0-9')"
    disk_free_gb="$(df --output=avail -BG "$CREQOR_DATA_DIR" | tail -1 | tr -dc '0-9')"
    [[ "$disk_pct" -ge 85 ]] && { [[ "$status" == ok ]] && status=warning; problems+=(DISK_ABOVE_85_PERCENT); }
    mem_avail_mb="$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)"
    [[ "$mem_avail_mb" -lt 4096 ]] && { [[ "$status" == ok ]] && status=warning; problems+=(LOW_MEMORY); }
    backup_age_h="$("${psql_owner[@]}" -c "SELECT COALESCE(floor(extract(epoch FROM now()-max(finished_at))/3600)::int,-1) FROM public.cq_job_runs WHERE job='backup' AND status='ok'")"
    if [[ "$backup_age_h" -lt 0 || "$backup_age_h" -gt 36 ]]; then [[ "$status" == ok ]] && status=warning; problems+=(BACKUP_OLDER_THAN_36H); fi
    db_bytes="$("${psql_owner[@]}" -c "SELECT pg_database_size('creqor')")"
    detail="{\"postgres\":$pg,\"engine\":$engine,\"model\":$model,\"diskUsedPct\":$disk_pct,\"diskFreeGB\":$disk_free_gb,\"memAvailableMB\":$mem_avail_mb,\"lastBackupAgeHours\":$backup_age_h,\"databaseBytes\":$db_bytes,\"problems\":\"${problems[*]:-}\"}"
    ;;
  quality)
    status=ok
    detail="$("${psql_owner[@]}" <<'SQL'
WITH latest AS (
  SELECT id,source_publish_date,source_reported_records,rows_valid,rows_rejected,status
  FROM public.cq_bulk_source_runs WHERE source='GLEIF_GOLDEN_COPY' ORDER BY id DESC LIMIT 1),
complete AS (SELECT id FROM public.cq_bulk_source_runs WHERE source='GLEIF_GOLDEN_COPY' AND status='complete' ORDER BY id DESC LIMIT 1)
SELECT json_build_object(
 'leiEntities',(SELECT count(*) FROM public.cq_lei_catalogue),
 'leiBadCountry',(SELECT count(*) FROM public.cq_lei_catalogue WHERE country_code IS NOT NULL AND country_code !~ '^[A-Z]{2}$'),
 'leiEmptyName',(SELECT count(*) FROM public.cq_lei_catalogue WHERE btrim(legal_name)=''),
 'leiWithoutProvenanceRun',(SELECT count(*) FROM public.cq_lei_catalogue WHERE last_seen_run_id IS NULL),
 'leiStaleNotInLatestComplete',(SELECT count(*) FROM public.cq_lei_catalogue c, complete WHERE c.last_seen_run_id IS DISTINCT FROM complete.id),
 'latestRunStatus',(SELECT status FROM latest),
 'latestPublishDate',(SELECT source_publish_date FROM latest),
 'officialRecords',(SELECT source_reported_records FROM latest),
 'latestRunValid',(SELECT rows_valid FROM latest),
 'latestRunRejected',(SELECT rows_rejected FROM latest),
 'publicationAgeHours',(SELECT floor(extract(epoch FROM now()-(source_publish_date||'Z')::timestamptz)/3600)::int FROM latest),
 'secIssuers',(SELECT count(DISTINCT cik) FROM public.cq_sec_issuers),
 'secFacts',(SELECT count(*) FROM public.cq_sec_financial_facts),
 'secFactsNonUsdUnits',(SELECT count(*) FROM public.cq_sec_financial_facts WHERE unit NOT IN ('USD','shares')),
 'researchUnreviewed',(SELECT count(*) FROM public.cq_ai_research_audit WHERE review_state='unreviewed'))
SQL
)"
    detail="$(echo "$detail" | head -1)"
    bad="$(echo "$detail" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(int(d["leiBadCountry"] or 0)+int(d["leiEmptyName"] or 0))')"
    age="$(echo "$detail" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["publicationAgeHours"] if d["publicationAgeHours"] is not None else -1)')"
    [[ "$bad" -gt 0 ]] && status=failed
    if [[ "$status" == ok && ( "$age" -lt 0 || "$age" -gt 72 ) ]]; then status=warning; fi
    ;;
  *) echo "usage: $0 health|quality|backup" >&2; exit 2 ;;
esac
record "$job" "$status" "$detail" "$([[ "$status" == ok ]] || echo "${job^^}_$status")"
echo "{\"job\":\"$job\",\"status\":\"$status\",\"detail\":$detail}"
case "$status" in ok) exit 0;; warning) exit 3;; *) exit 1;; esac
