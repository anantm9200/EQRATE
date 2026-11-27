# Decisions

| Date | Decision | By | Rationale |
|---|---|---|---|
| 2026-11-19 | Data relayed via operator Mac; DGX firewall/DNS untouched | user | FortiGuard SDNS blocks sources; no bypass |
| 2026-11-19 | Public gateway = Tailscale Funnel path `/creqor-engine`, bearer token | user | no new paid service |
| 2026-11-19 | SEC collection OFF; India focus | user | — |
| 2026-11-20 | Live data on LUKS file volume `/srv/creqor-secure`; manual unlock after reboot (no TPM) | user (operator-run) | encryption at rest |
| 2026-11-27 | Standing approval: commit/PR/merge after release gates; ask before DB deletion, credential rotation, paid services, DGX host changes | user | completion mandate |
| 2026-11-27 | India financials from company annual-report PDFs via relay; store facts + page citations only, never republish PDFs; review status tracked | user | exchange XBRL terms restrict automation; MCA is paid |
| 2026-11-27 | Accounts: Auth.js on Vercel, user/workspace data in DGX Postgres via engine, row-level tenant isolation | user | no new cost; accepts DGX dependency |
| 2026-11-27 | SEC remains OFF | user | reconfirmed |
| 2026-11-27 | Work from fresh clone `~/Projects/CREQOR`; `~/Documents/CREQOR` legacy (file-sync duplicates) | engineering | reproducibility |
