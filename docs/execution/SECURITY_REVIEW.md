# Security review

## Trust boundaries
| Boundary | Control | Verified by |
|---|---|---|
| Browser → Vercel | HTTPS; Auth.js encrypted JWT session cookie (`AUTH_SECRET`); same-origin + JSON check on every cookie-authenticated mutation (`lib/api-guard.ts`); per-IP limits on registration | `tests-ui/accounts.spec.ts` (cross-site 403, anonymous 401, open-redirect) |
| Vercel → DGX engine | Tailscale Funnel TLS; 96-hex bearer token; fixed route allowlist (`DGX_ROUTE`); identity headers only on account/workspace routes; redirects refused | `tests/dgx-gateway-engine.test.ts` |
| Engine → PostgreSQL | `creqor_app` least privilege; workspace rows under FORCE row-level security keyed to `creqor.org_id` set per transaction after a membership check; account deletion via SECURITY DEFINER function only | `tests-db/008_accounts.sql`, `tests-integration/accounts.test.ts` |
| Ingestion → PostgreSQL | `creqor_ingest`: insert/update only, no delete/DDL; archives SHA-256 verified | `tests-db/007_financial_evidence.sql` |
| Engine → vLLM | loopback only, concurrency cap, untrusted-evidence prompt, citation check | `scripts/dgx-ai-evals.ts` (3/3, 2026-11-19) |
| Source documents | stored privately, never executed or republished; PDF text extraction to run in the network-less ingest container | design (F3 pending) |

## Authentication
- Passwords: scrypt (N=32768, r=8, p=1, 16-byte salt) on the DGX; the website never sees hashes.
- Policy: ≥ 12 characters (NIST 800-63B length-first), rejects trivial values and the email local part.
- Lockout: 10 consecutive failures → 15 min; global auth limit 60/min on the engine; unknown emails take the same scrypt time.
- Sessions: JWT 12 h, refreshed every 30 min; sign-out clears the cookie.
- Not yet: MFA (Auth.js credentials provider has none built in) — Pass 2 candidate (TOTP).

## Dependency audit (2026-11-27, `npm audit --omit=dev`)
| Package | Severity | Exposure | Disposition |
|---|---|---|---|
| postcss (via next 15) | high | build-time CSS processing of our own stylesheets only; no user CSS | accepted until Next 16 upgrade (Pass 2) |
| next (via postcss) | moderate | as above | as above |
| csv-parse 6 | moderate (prototype via `columns`) | parses SHA-256-verified official GLEIF archives with fixed headers | accepted; upgrade to 7 in Pass 2 |

## Open items for Pass 2
Threat model write-up per STRIDE, container image scan, TOTP MFA, CSP header review, session revocation list, load test of auth endpoints.
