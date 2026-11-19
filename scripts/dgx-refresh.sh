#!/usr/bin/env bash
# Operator-scheduled CREQOR public-records refresh on the private DGX.
# Run only after the database and SEC identity have been configured.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
if [[ ! -f .env.dgx ]]; then
  echo 'Missing .env.dgx. Public source refresh not started.' >&2
  exit 2
fi
compose=(docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml)
if ! "${compose[@]}" ps --status running --services | grep -qx engine; then
  echo 'CREQOR DGX engine is not running. Public data refresh aborted.' >&2
  exit 2
fi
# Full archive import is a separate capacity-planned operator action.
# This incremental cycle refreshes SEC ticker associations, a bounded
# country slice, then eligible SEC companyfacts, always with source provenance.
"${compose[@]}" exec -T engine npm run catalogue:sec-issuers
"${compose[@]}" exec -T engine npm run catalogue:backfill -- --batches=1 --pages=3
"${compose[@]}" exec -T engine npm run catalogue:sec-financials -- --limit=500 --delay-ms=650
echo 'CREQOR DGX public-records refresh completed successfully.'
