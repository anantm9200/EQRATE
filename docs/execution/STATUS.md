# Status — resume point

**Updated:** 2026-11-27 · **Branch:** `feature/completion-pass1-20261127` (from main 6446765) · **Workspace:** `~/Projects/CREQOR`

## Verified baseline (production /api/engine/status, 2026-11-27)
3,498,919 LEI · 3,498,919 source versions · 235 countries · 411,587 Indian (339,523 issued) · 490,196 relationships · 6,490,996 reporting exceptions · DB 14.74 GB · model qwen3.6-35b-a3b reachable · 3 research runs · SEC 0 (by policy).
DGX: encrypted volume mounted; health/backup/quality timers active; nightly backup 2026-11-26T22:35Z on encrypted volume; uptime 32 days.

## Running
- GLEIF LEI relay refresh started 2026-11-27 (`~/Projects/gleif-refresh-20261127.log`).

## Done this session (commit 95202c6, branch pushed)
- E4/E5 risk models, E7 confidence engine, migration 007 + DB integration tests, ledger, lockfile.
- C8 symlinks on DGX (relay now writes to the encrypted volume).

## Next (in order)
1. When D1 (LEI relay, started 13:29 +04) completes: D2 Level 2 relay; verify counts; DATA_COVERAGE.
2. After imports finish: relay `sync`, apply migration 007 on DGX (`scripts/dgx-migrate.sh`), code-update image.
3. D3/D4 relay script changes (do NOT edit dgx-relay.sh while a relay run is executing it).
4. A1/A2 accounts (Auth.js + DGX tables + RLS).
5. F3/F4 annual-report parser with `--file` ingestion — blocked on real documents (B6); needs operator-supplied PDFs.
