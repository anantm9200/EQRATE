#!/usr/bin/env bash
# Pull CREQOR's age-encrypted backups from the DGX to an off-host directory and
# verify each file against its SHA-256 manifest. The files stay encrypted; the
# decryption key is never sent to the DGX.
#   CREQOR_DGX_SSH=user@host scripts/relay/pull-backups.sh [dest]
set -euo pipefail
: "${CREQOR_DGX_SSH:?Set CREQOR_DGX_SSH=user@host}"
src="${CREQOR_DGX_DIR:-creqor-platform}/data/backups/"
dest="${1:-$HOME/CREQOR-backups/dumps}"
mkdir -p "$dest"; chmod 700 "$dest"
rsync -a --partial --timeout=120 --include 'creqor-postgres-*' --exclude '*.partial' --exclude '*' "$CREQOR_DGX_SSH:$src" "$dest/"
cd "$dest"
verified=0
for manifest in creqor-postgres-*.dump.age.sha256; do
  [[ -f "$manifest" ]] || continue
  expected="$(cut -d' ' -f1 "$manifest")"; file="${manifest%.sha256}"
  actual="$(shasum -a 256 "$file" | cut -d' ' -f1)"
  [[ "$expected" == "$actual" ]] || { echo "CHECKSUM MISMATCH: $file" >&2; exit 1; }
  verified=$((verified+1))
done
echo "{\"offHostDir\":\"$dest\",\"verifiedEncryptedBackups\":$verified,\"latest\":\"$(ls -1t creqor-postgres-*.dump.age 2>/dev/null | head -1)\"}"
