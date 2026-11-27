# Status — resume point

**Updated:** 2026-11-27 · **main:** after PR #31 · **Workspace:** `~/Projects/CREQOR`

## Live and verified in production
- GLEIF publication 2026-11-27: 3,508,564 LEIs (= official, 0 rejected), 414,072 Indian; RR 2026-11-27 refreshed.
- Accounts (sign up / in / out, account page, export, password-confirmed delete), watchlist on company profiles, tenant isolation — full journey passed against creqor.vercel.app.
- Financial evidence schema (007), accounts (008), maintained counts (009) applied on DGX; engine redeployed with poppler.
- /coverage page; financial profile section; SEO indexing policy.
- Browser suite on production: 150 passed in the run + remaining 21 passed on rerun (global-timeout cut, no defects).

## Pass 2 (PR #33, merged and verified)
- Two-factor sign-in (TOTP + recovery codes), watchlist alerts, PITR (WAL archive + weekly encrypted base backup timer), npm audit 0 vulnerabilities.
- Production: accounts / engine / layout suites 46/46 after deploy.
- PITR activation is automatic: `~/creqor-platform/bin/enable-pitr-after-import.sh` (DGX, nohup) waits for the REPEX import, restarts PostgreSQL with archive_mode=on and takes the first base backup. Log: `~/creqor-platform/data/logs/enable-pitr.log`.
- CREQOR_MFA_KEY lives in `.env.dgx` only; keep a copy with your secrets (losing it disables TOTP codes; recovery codes still work).

## Running
- REPEX 2026-11-27 relay import (slow, ~1 M rows/h under load): `~/Projects/level2-refresh-20261127.log`. Stat counts refresh automatically at the end.

## Needs the operator
1. Install daily relay job (auto-mode blocked it):
   `sed "s#__REPO__#$HOME/Projects/CREQOR#g; s#__DGX__#dgxadmin@<tailnet-ip>#g; s#__HOME__#$HOME#g" infrastructure/operator/com.creqor.refresh.plist > ~/Library/LaunchAgents/com.creqor.refresh.plist && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.creqor.refresh.plist`
2. B6: allow-list Indian IR/exchange domains, or drop annual-report PDFs + `manifest.csv` into `~/CREQOR-reports/inbox/`.
3. B5: delete the pre-encryption plaintext DB copy on the DGX when ready.

## Next engineering
Indian financial coverage once B6 is resolved (parser validation on real reports); export pagination; Next 16 upgrade; formal threat model and p50/p95 latency baselines.
