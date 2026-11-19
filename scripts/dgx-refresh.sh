#!/usr/bin/env bash
# Operator-scheduled CREQOR public-records refresh executed ON the DGX.
# Uses the least-privilege `ingest` job container. Each source is attempted only when
# it is reachable from the host; on networks that block official sources use
# scripts/relay/dgx-relay.sh from an operator workstation instead.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
[[ -f .env.dgx ]] || { echo 'Missing .env.dgx. Public source refresh not started.' >&2; exit 2; }
set -a; source .env.dgx; set +a
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
job=("${compose[@]}" --profile jobs run --rm -T ingest)
reachable(){ curl -fsS -o /dev/null -m 10 "$1" 2>/dev/null; }
if reachable https://goldencopy.gleif.org/api/v2/golden-copies/publishes/lei2/latest; then
  "${job[@]}" scripts/gleif-golden-copy.ts --limit=all --resume
else
  echo 'GLEIF Golden Copy not reachable from this host; use scripts/relay/dgx-relay.sh gleif all' >&2
fi
if [[ -n "${SEC_USER_AGENT:-}" ]]; then
  "${job[@]}" scripts/sec-issuer-catalogue.ts
  "${job[@]}" scripts/sec-financial-backfill.ts --limit=500 --delay-ms=650
else
  echo 'SEC_USER_AGENT not configured: SEC issuer and companyfacts refresh skipped (SEC fair-access policy).' >&2
fi
echo 'CREQOR DGX public-records refresh finished.'
