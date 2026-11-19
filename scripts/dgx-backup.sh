#!/usr/bin/env bash
# Encrypted CREQOR PostgreSQL backup, run on the DGX (manually or by the systemd timer).
#  * pg_dump custom format streamed straight into age public-key encryption:
#    no plaintext dump ever touches disk.
#  * The age PRIVATE key lives off the DGX (operator workstation / vault), so a
#    compromised DGX cannot decrypt its own backups.
#  * Encrypted files are staged in DGX_BACKUP_DIR with a SHA-256 manifest and
#    pruned to DGX_BACKUP_KEEP; an off-host copy is pulled by
#    scripts/relay/pull-backups.sh (or pushed with rclone if DGX_BACKUP_REMOTE is set).
#  * A staged backup is not a tested backup: run scripts/relay/restore-test.sh.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
[[ -f .env.dgx ]] || { echo 'Missing operator-owned .env.dgx file.' >&2; exit 2; }
set -a; source .env.dgx; set +a
age_bin="${AGE_BIN:-$(command -v age || true)}"
[[ -z "$age_bin" && -x "$repo_root/../bin/age" ]] && age_bin="$repo_root/../bin/age"
[[ -x "$age_bin" ]] || { echo 'age binary not found (set AGE_BIN).' >&2; exit 2; }
[[ "${DGX_BACKUP_RECIPIENT:-}" =~ ^age1[a-z0-9]{58}$ ]] || { echo 'DGX_BACKUP_RECIPIENT must be an age public recipient.' >&2; exit 2; }
backup_dir="${DGX_BACKUP_DIR:-${CREQOR_DATA_DIR}/backups}"
keep="${DGX_BACKUP_KEEP:-14}"
[[ "$keep" =~ ^[0-9]+$ && "$keep" -ge 2 ]] || { echo 'DGX_BACKUP_KEEP must be >= 2' >&2; exit 2; }
mkdir -p "$backup_dir"; chmod 700 "$backup_dir"
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
psql_owner=("${compose[@]}" exec -T postgres psql -X -q -At -v ON_ERROR_STOP=1 -U creqor -d creqor)

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$backup_dir/creqor-postgres-$stamp.dump.age"
partial="$final.partial"
started="$(date -u +%FT%TZ)"
job_id="$("${psql_owner[@]}" -c "INSERT INTO public.cq_job_runs(job,status) VALUES ('backup','running') RETURNING id" | head -1 | tr -d '[:space:]')"
fail(){
  rm -f "$partial"
  "${psql_owner[@]}" -c "UPDATE public.cq_job_runs SET status='failed',finished_at=now(),error_code='$1' WHERE id=$job_id" >/dev/null || true
  echo "CREQOR backup failed: $1" >&2; exit 1
}
trap 'fail BACKUP_PIPELINE_ERROR' ERR
umask 077
"${compose[@]}" exec -T postgres pg_dump -U creqor -d creqor -Fc -Z 6 | "$age_bin" -r "$DGX_BACKUP_RECIPIENT" > "$partial"
trap - ERR
size="$(stat -c %s "$partial")"
[[ "$size" -gt 1024 ]] || fail BACKUP_TOO_SMALL
head -c 21 "$partial" | grep -q 'age-encryption.org/v1' || fail BACKUP_NOT_AGE_ENCRYPTED
mv "$partial" "$final"
sha="$(sha256sum "$final" | cut -d' ' -f1)"
echo "$sha  $(basename "$final")" > "$final.sha256"
counts="$("${psql_owner[@]}" -c "SELECT json_build_object('leiEntities',(SELECT count(*) FROM public.cq_lei_catalogue),'leiVersions',(SELECT count(*) FROM public.cq_lei_observations),'secIssuers',(SELECT count(*) FROM public.cq_sec_issuers),'secFacts',(SELECT count(*) FROM public.cq_sec_financial_facts),'researchAudits',(SELECT count(*) FROM public.cq_ai_research_audit))" | head -1)"
echo "$counts" > "$final.counts.json"
# Retention: newest $keep encrypted dumps (and their manifests) are kept.
ls -1t "$backup_dir"/creqor-postgres-*.dump.age 2>/dev/null | tail -n +"$((keep+1))" | while read -r old; do
  rm -f "$old" "$old.sha256" "$old.counts.json"
done
uploaded=false
if [[ -n "${DGX_BACKUP_REMOTE:-}" ]] && command -v rclone >/dev/null 2>&1; then
  rclone copyto "$final" "${DGX_BACKUP_REMOTE%/}/$(basename "$final")" && \
  rclone copyto "$final.sha256" "${DGX_BACKUP_REMOTE%/}/$(basename "$final").sha256" && uploaded=true
fi
"${psql_owner[@]}" -c "UPDATE public.cq_job_runs SET status='ok',finished_at=now(),detail=jsonb_build_object('file','$(basename "$final")','bytes',$size,'sha256','$sha','counts','$counts'::jsonb,'rcloneUploaded',$uploaded,'startedAtUtc','$started') WHERE id=$job_id" >/dev/null
echo "{\"backup\":\"$(basename "$final")\",\"bytes\":$size,\"sha256\":\"$sha\",\"counts\":$counts,\"rcloneUploaded\":$uploaded}"
