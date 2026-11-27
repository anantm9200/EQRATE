# Test results

Each entry: date · scope · command · result (PASSED / FAILED / SKIPPED / NOT EXECUTED).

| Date | Scope | Command | Result |
|---|---|---|---|
| 2026-11-27 | Risk models (Altman Z/Z'/Z'', Piotroski F, Beneish M) against independently computed reference values | `npx tsx --test tests/risk-scores.test.ts` | PASSED 5/5 |
| 2026-11-27 | Confidence methodology v1 | `npx tsx --test tests/confidence.test.ts` | PASSED 6/6 |
| 2026-11-27 | Migrations 001–007 on throwaway PostgreSQL 17, re-applied for idempotency; 007 point-in-time, restatement, pending-leak, unit/NULL/HTTPS constraints, role privileges | `scripts/test-db.sh` | PASSED |
| 2026-11-27 | Annual-report parser on synthetic Schedule III pages | `tests/annual-report-parser.test.ts` | PASSED 5/5 |
| 2026-11-27 | Parser end-to-end on a generated PDF inside the engine image (pdftotext, no network) | docker run creqor-engine:local | PASSED (3 statement pages, 50 figures, 10/10 validations) |
| 2026-11-27 | Annual-report extraction on real company reports | — | NOT EXECUTED (blocker B6) |
| 2026-11-27 | Migrations 008 (tenant isolation under creqor_app, account deletion) and 009 (maintained counts) | `scripts/test-db.sh` | PASSED |
| 2026-11-27 | Engine integration: accounts, workspace isolation, versioning, export/delete, financial profile point-in-time | `scripts/test-integration.sh` | PASSED 5/5 |
| 2026-11-27 | Unit suite | `npm test` | PASSED 133/133 |
| 2026-11-27 | Browser suite against local build connected to production DGX (incl. full account journey) | `PLAYWRIGHT_BASE_URL=http://localhost:3417 npx playwright test` | PASSED 162/162 (one pre-existing flaky directory test seen once; passed on rerun) |

Reference values (risk models): fixture A (CA 500, CL 300, TA 2000, RE 400, EBIT 250, TL 1000, MVE 1500, BE 1000, Sales 2400) → Z 2.912, Z' 2.247, Z'' 3.198. Fixture B (two years) → Beneish M −1.891; Piotroski F 7/9.
