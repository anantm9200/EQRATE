#!/usr/bin/env bash
# Unattended official-data refresh from the operator workstation (the DGX network blocks
# the sources; see docs/NETWORK_ALLOWLIST.md). Run by launchd daily; safe to re-run.
# Holds a lock so two runs never overlap; logs to ~/Library/Logs/creqor-refresh.log.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export CREQOR_DGX_SSH="${CREQOR_DGX_SSH:?Set CREQOR_DGX_SSH in the launchd job}" CREQOR_DGX_DIR="${CREQOR_DGX_DIR:-creqor-platform}"
lock="${TMPDIR:-/tmp}/creqor-refresh.lock"
# A lock older than 12 h belongs to a crashed run.
[[ -d "$lock" && -n "$(find "$lock" -maxdepth 0 -mmin +720 2>/dev/null)" ]] && rmdir "$lock"
if ! mkdir "$lock" 2>/dev/null; then echo "$(date -u +%FT%TZ) refresh already running; skipped"; exit 0; fi
trap 'rmdir "$lock"' EXIT
echo "$(date -u +%FT%TZ) refresh start"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$CREQOR_DGX_SSH" true || { echo 'DGX unreachable; skipped'; exit 75; }
"$repo/scripts/relay/dgx-relay.sh" gleif all
"$repo/scripts/relay/dgx-relay.sh" level2
inbox="${CREQOR_REPORTS_INBOX:-$HOME/CREQOR-reports/inbox}"
[[ -f "$inbox/manifest.csv" ]] && "$repo/scripts/relay/dgx-relay.sh" reports "$inbox"
"$repo/scripts/relay/pull-backups.sh"
echo "$(date -u +%FT%TZ) refresh done"
