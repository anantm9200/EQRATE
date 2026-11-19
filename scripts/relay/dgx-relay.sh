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
#
# Requires: docker (arm64 builder), curl, python3, ssh/rsync.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${CREQOR_DGX_SSH:?Set CREQOR_DGX_SSH=user@host}"
dgx_dir="${CREQOR_DGX_DIR:-creqor-platform}"
work="${CREQOR_RELAY_WORK:-${TMPDIR:-/tmp}/creqor-relay}"
mkdir -p "$work"
remote(){ ssh -o BatchMode=yes "$CREQOR_DGX_SSH" "$@"; }

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
    meta="$work/lei2-latest.json"
    curl -sSf -m 30 https://goldencopy.gleif.org/api/v2/golden-copies/publishes/lei2/latest -o "$meta"
    read -r url size publish < <(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]))["data"];c=d["full_file"]["csv"];print(c["url"],c["size"],d["publish_date"].replace(" ","T"))' "$meta")
    [[ "$url" =~ ^https://goldencopy\.gleif\.org/storage/golden-copy-files/ ]] || { echo 'untrusted archive URL' >&2; exit 2; }
    name="$(basename "$url")"
    if [[ ! -f "$work/$name" || "$(stat -f %z "$work/$name" 2>/dev/null || stat -c %s "$work/$name")" != "$size" ]]; then
      curl -sSfL -m 3600 -o "$work/$name.partial" "$url" && mv "$work/$name.partial" "$work/$name"
    fi
    actual="$(stat -f %z "$work/$name" 2>/dev/null || stat -c %s "$work/$name")"
    [[ "$actual" == "$size" ]] || { echo "size mismatch: $actual != $size" >&2; exit 2; }
    sha="$(shasum -a 256 "$work/$name" | cut -d' ' -f1)"
    retrieved="$(date -u +%FT%TZ)"
    remote "mkdir -p $dgx_dir/data/imports"
    rsync -a --partial --inplace "$work/$name" "$meta" "$CREQOR_DGX_SSH:$dgx_dir/data/imports/"
    remote "cd $dgx_dir/app && sha256sum ../data/imports/$name | grep -q '^$sha ' && \
      docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml --profile jobs run --rm -T ingest \
      scripts/gleif-golden-copy.ts --archive=/var/creqor/imports/$name --metadata=/var/creqor/imports/lei2-latest.json \
      --expected-sha256=$sha --retrieved-at=$retrieved --limit=$limit --resume"
    echo "{\"publication\":\"$publish\",\"archive\":\"$name\",\"sha256\":\"$sha\",\"retrievedAt\":\"$retrieved\"}" ;;
  *) echo "usage: $0 sync|image|gleif [limit|all]" >&2; exit 2 ;;
esac
