#!/usr/bin/env bash
# Create the WAL archive directory on the data volume, owned by the container's postgres
# user (uid 999), before PostgreSQL starts with archive_mode=on. Idempotent; no sudo needed.
set -euo pipefail
cd "$(dirname "$0")/.."; set -a; source .env.dgx; set +a
docker run --rm --network none -v "$CREQOR_DATA_DIR:/d" postgres:17-bookworm \
  sh -c 'mkdir -p /d/wal-archive && chown 999:999 /d/wal-archive && chmod 700 /d/wal-archive && ls -ld /d/wal-archive'
