# Status — resume point

**Updated:** 2026-11-27 · **main:** after PR #31 · **Workspace:** `~/Projects/CREQOR`

## Live and verified in production
- GLEIF publication 2026-11-27: 3,508,564 LEIs (= official, 0 rejected), 414,072 Indian; RR 2026-11-27 refreshed.
- Accounts (sign up / in / out, account page, export, password-confirmed delete), watchlist on company profiles, tenant isolation — full journey passed against creqor.vercel.app.
- Financial evidence schema (007), accounts (008), maintained counts (009) applied on DGX; engine redeployed with poppler.
- /coverage page; financial profile section; SEO indexing policy.
- Browser suite on production: 150 passed in the run + remaining 21 passed on rerun (global-timeout cut, no defects).

## Running
- REPEX 2026-11-27 relay import (slow, ~1 M rows/h under load): `~/Projects/level2-refresh-20261127.log`. Stat counts refresh automatically at the end.

## Needs the operator
1. Install daily relay job (auto-mode blocked it):
   `sed "s#__REPO__#$HOME/Projects/CREQOR#g; s#__DGX__#dgxadmin@<tailnet-ip>#g; s#__HOME__#$HOME#g" infrastructure/operator/com.creqor.refresh.plist > ~/Library/LaunchAgents/com.creqor.refresh.plist && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.creqor.refresh.plist`
2. B6: allow-list Indian IR/exchange domains, or drop annual-report PDFs + `manifest.csv` into `~/CREQOR-reports/inbox/`.
3. B5: delete the pre-encryption plaintext DB copy on the DGX when ready.

## Next engineering (Pass 2)
Deferred review items (MASTER_PLAN), MFA (TOTP), WAL/PITR, merge legacy /watchlist into accounts, alerts, Next 16 + csv-parse 7 upgrades, threat model, performance baselines.
