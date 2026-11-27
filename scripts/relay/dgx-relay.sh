#!/usr/bin/env bash
# Operator relay for a DGX whose network blocks public-record sources, package
# registries and container registries (e.g. a DNS security filter). Runs on an
# operator workstation that CAN reach the official sources, and moves only
# verified official artefacts to the DGX over SSH. It never alters DGX firewall
# or DNS policy.
#
#   CREQOR_DGX_SSH=user@host CREQOR_DGX_DIR=~/creqor-platform scripts/relay/dgx-relay.sh sync
#   ... dgx-relay.sh image              # build linux/arm64 engine image, load on DGX
#   ... dgx-relay.sh gleif [limit|all]  # official Golden Copy -> verify -> DGX import
#   ... dgx-relay.sh level2             # official RR + REPEX Golden Copy -> verify -> DGX import
#   ... dgx-relay.sh reports <inbox-dir> # annual-report PDFs listed in <inbox>/manifest.csv -> DGX extraction
#       manifest.csv columns: lei,file,source_url,fiscal_year,published_at (published_at may be empty)
#
# Requires: docker (arm64 builder), curl, python3, ssh/rsync.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${CREQOR_DGX_SSH:?Set CREQOR_DGX_SSH=user@host}"
dgx_dir="${CREQOR_DGX_DIR:-creqor-platform}"
work="${CREQOR_RELAY_WORK:-${TMPDIR:-/tmp}/creqor-relay}"
mkdir -p "$work"
remote(){ ssh -o BatchMode=yes "$CREQOR_DGX_SSH" "$@"; }
# Imports land where the running stack mounts them (CREQOR_DATA_DIR in .env.dgx, e.g. the
# encrypted volume), not a guessed path.
data_dir(){ remote "v=\$(grep -E '^CREQOR_DATA_DIR=' $dgx_dir/app/.env.dgx | tail -1 | cut -d= -f2-); echo \${v:-\$HOME/$dgx_dir/data}"; }
fsize(){ stat -f %z "$1" 2>/dev/null || stat -c %s "$1"; }
# fetch_golden <kind>: download the latest official publication of one Golden Copy kind,
# check URL origin and published byte size; prints "<file> <sha256> <publish date>".
fetch_golden(){
  local kind="$1" meta="$work/$1-latest.json" url size publish name
  curl -sSf -m 30 "https://goldencopy.gleif.org/api/v2/golden-copies/publishes/$kind/latest" -o "$meta"
  read -r url size publish < <(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]))["data"];c=d["full_file"]["csv"];print(c["url"],c["size"],d["publish_date"].replace(" ","T"))' "$meta")
  [[ "$url" =~ ^https://goldencopy\.gleif\.org/storage/golden-copy-files/ ]] || { echo 'untrusted archive URL' >&2; return 2; }
  name="$(basename "$url")"
  if [[ ! -f "$work/$name" || "$(fsize "$work/$name")" != "$size" ]]; then
    curl -sSfL -m 3600 -o "$work/$name.partial" "$url" && mv "$work/$name.partial" "$work/$name"
  fi
  [[ "$(fsize "$work/$name")" == "$size" ]] || { echo "size mismatch for $name" >&2; return 2; }
  echo "$name $(shasum -a 256 "$work/$name" | cut -d' ' -f1) $publish"
}

case "${1:-}" in
  sync)
    rsync -az --delete --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
      --exclude .vercel --exclude test-results --exclude playwright-report \
      "$repo_root/" "$CREQOR_DGX_SSH:$dgx_dir/app/"
    echo "synced repository to $dgx_dir/app" ;;
  image)
    tag="${CREQOR_RELEASE:-local}"
    docker build --platform linux/arm64 -f "$repo_root/infrastructure/dgx/Dockerfile" -t "creqor-engine:$tag" "$repo_root"
    docker save "creqor-engine:$tag" | gzip -1 | remote 'gunzip | docker load'
    remote "docker image inspect creqor-engine:$tag --format '{{.Architecture}} {{.Id}}'" ;;
  gleif)
    limit="${2:-all}"
    read -r name sha publish < <(fetch_golden lei2)
    imports="$(data_dir)/imports"
    retrieved="$(date -u +%FT%TZ)"
    remote "mkdir -p '$imports'"
    rsync -a --partial --inplace "$work/$name" "$work/lei2-latest.json" "$CREQOR_DGX_SSH:$imports/"
    remote "cd $dgx_dir/app && sha256sum '$imports/$name' | grep -q '^$sha ' && \
      docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml --profile jobs run --rm -T ingest \
      scripts/gleif-golden-copy.ts --archive=/var/creqor/imports/$name --metadata=/var/creqor/imports/lei2-latest.json \
      --expected-sha256=$sha --retrieved-at=$retrieved --limit=$limit --resume"
    echo "{\"publication\":\"$publish\",\"archive\":\"$name\",\"sha256\":\"$sha\",\"retrievedAt\":\"$retrieved\"}" ;;
  level2)
    imports="$(data_dir)/imports"
    remote "mkdir -p '$imports'"
    for kind in rr repex; do
      read -r name sha publish < <(fetch_golden "$kind")
      retrieved="$(date -u +%FT%TZ)"
      rsync -a --partial --inplace "$work/$name" "$work/$kind-latest.json" "$CREQOR_DGX_SSH:$imports/"
      remote "cd $dgx_dir/app && sha256sum '$imports/$name' | grep -q '^$sha ' && \
        docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml --profile jobs run --rm -T ingest \
        scripts/gleif-level2.ts --kind=$kind --archive=/var/creqor/imports/$name --metadata=/var/creqor/imports/$kind-latest.json \
        --expected-sha256=$sha --retrieved-at=$retrieved"
      echo "{\"kind\":\"$kind\",\"publication\":\"$publish\",\"archive\":\"$name\",\"sha256\":\"$sha\"}"
    done ;;
  reports)
    inbox="${2:?inbox directory with manifest.csv}"
    [[ -f "$inbox/manifest.csv" ]] || { echo "no $inbox/manifest.csv" >&2; exit 2; }
    reports="$(data_dir)/imports/reports"
    remote "mkdir -p '$reports'"
    mkdir -p "$inbox/processed"
    tail -n +2 "$inbox/manifest.csv" | while IFS=, read -r lei file url fy published; do
      [[ -z "$lei" ]] && continue
      [[ "$lei" =~ ^[A-Z0-9]{20}$ && "$url" =~ ^https://[A-Za-z0-9._~:/?#@!\&+,=%-]+$ && "$fy" =~ ^[0-9]{4}$ && ( -z "$published" || "$published" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ) && "$file" =~ ^[A-Za-z0-9._-]+\.pdf$ && -f "$inbox/$file" ]] || { echo "skipped invalid row: $lei $file" >&2; continue; }
      [[ "$(head -c 5 "$inbox/$file")" == "%PDF-" ]] || { echo "not a PDF: $file" >&2; continue; }
      sha="$(shasum -a 256 "$inbox/$file" | cut -d' ' -f1)"
      rsync -a --partial "$inbox/$file" "$CREQOR_DGX_SSH:$reports/$sha.pdf"
      remote "cd $dgx_dir/app && docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml --profile jobs run --rm -T ingest \
        scripts/annual-report-ingest.ts --lei=$lei --file=/var/creqor/imports/reports/$sha.pdf --source-url=$(printf %q "$url") \
        --fiscal-year=$fy --retrieved-at=$(date -u +%FT%TZ) ${published:+--published-at=$published}" </dev/null \
        && mv "$inbox/$file" "$inbox/processed/"
    done ;;
  *) echo "usage: $0 sync|image|gleif [limit|all]|level2|reports <inbox>" >&2; exit 2 ;;
esac
