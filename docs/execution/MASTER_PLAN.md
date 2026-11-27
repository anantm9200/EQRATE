# CREQOR completion programme — master backlog

Single authoritative backlog. Statuses: NOT STARTED · IN PROGRESS · IMPLEMENTED · TESTED · DEPLOYED · VERIFIED · BLOCKED.
Implemented ≠ deployed ≠ verified. Evidence lives in `TEST_RESULTS.md`; blockers in `BLOCKERS.md`; decisions in `DECISIONS.md`.

Pass 1 = complete the product. Pass 2 = break, fix, harden, release.

## P0 — data freshness and operational baseline

| ID | Requirement | Status | Depends on | Acceptance | Evidence / limits |
|---|---|---|---|---|---|
| D1 | Latest GLEIF LEI publication imported | VERIFIED (2026-11-27: 3,508,564 = official, 0 rejected) | relay | run complete in `cq_bulk_source_runs`, publishDate = latest, rejected = 0 or explained | 2026-11-27 relay run started |
| D2 | Latest GLEIF RR + REPEX imported | IN PROGRESS (RR 2026-11-27 complete; REPEX running) | D1 | both runs complete for same publish date | — |
| D3 | Relay + backup-pull scripts follow `CREQOR_DATA_DIR` (encrypted volume) | TESTED | — | relay works without symlinks; test | symlinks in place as interim (C8) |
| D4 | `dgx-relay.sh level2` subcommand (RR + REPEX) | VERIFIED (used for 2026-11-27 refresh) | — | one command refreshes Level 2 with SHA-256 verification | manual steps today |
| D5 | Scheduled refresh from the operator Mac (launchd), since DGX DNS blocks sources | IMPLEMENTED (install after merge) | D3, D4 | daily job, logged, job ledger row on DGX | DGX-direct refresh blocked (BLOCKERS B1) |
| O1 | Committed lockfile, reproducible install | IMPLEMENTED | — | `package-lock.json` committed; `npm ci` passes | repo had none |
| O2 | Off-host backup pull + restore drill re-run on encrypted layout | NOT STARTED | D3 | pull verifies checksums; restore counts match | last drill 2026-11-19 |
| O3 | Point-in-time recovery strategy documented (WAL archiving plan) | NOT STARTED | — | documented RPO/RTO, decision recorded | logical dumps only |

## P1 — financial data engine (India first, annual reports, facts only)

| ID | Requirement | Status | Depends on | Acceptance |
|---|---|---|---|---|
| F1 | Schema: source documents, financial observations with full provenance + point-in-time + restatements + review status | TESTED (throwaway PG17; not yet applied on DGX) | — | migration 007; tests for invariants (no zero-for-missing, unit/currency required) |
| F2 | Source registry (owner, access, terms, permitted use, redistribution, rate limits) | TESTED (seeded in 007) | — | `cq_source_registry` + doc; every observation references a registry row |
| F3 | Annual-report document pipeline: relay fetch → hash → store privately (never republished) → text + page map | BLOCKED (B6) for fetching; schema done | F1, F2 | idempotent by SHA-256; malicious-PDF safe (no script exec) |
| F4 | Deterministic table/number extraction with page citations; LLM only proposes, validators accept | TESTED on synthetic layouts; real reports BLOCKED (B6) | F3 | each fact has page ref + confidence; accounting identity checks |
| F5 | Review queue (pending/accepted/rejected) | NOT STARTED | F4 | only reviewed or validator-passed facts feed engines, labelled |
| F6 | Milestone A: 100 Indian listed companies, multi-year | NOT STARTED | F3–F5 | counts in DATA_COVERAGE by category |

## P1 — intelligence engines (deterministic first)

| ID | Engine | Status | Acceptance |
|---|---|---|---|
| E1 | Identity (LEI/CIN/GSTIN, groups, leads) | DEPLOYED | existing; extend identifier crosswalk (ISIN/ticker) when sourced |
| E2 | Financial ratios (performance, health, DuPont, cash conversion) | IMPLEMENTED (SEC-shaped) | generalise to normalized observations; reference-case tests |
| E3 | Value: FCFF/FCFE (kept separate), DDM, residual income, multiples, NAV, sensitivity | PARTIAL | reference-case tests; no invented market inputs |
| E4 | Risk: Altman Z variants (applicability-gated), Piotroski F, liquidity/leverage | TESTED (lib/risk-scores.ts; awaits financial data) | published definitions; sector gating (banks/insurers excluded) |
| E5 | Forensics: Beneish M (applicability-gated), accruals, CFO/NI divergence, restatements | PARTIAL (Beneish TESTED) | labelled screening, never findings |
| E6 | Governance (from disclosures in reports) | NOT STARTED | depends on F4 |
| E7 | Confidence: source quality, completeness, timeliness, consistency — separate from risk | TESTED (lib/confidence.ts) | missing data lowers confidence only |

## P1 — accounts and private research

| ID | Requirement | Status | Acceptance |
|---|---|---|---|
| A1 | Auth.js on Vercel; users/orgs/memberships/sessions on DGX via engine | TESTED (e2e against production DGX) | login, logout, session expiry; no secrets client-side |
| A2 | Postgres row-level security per org for saved research, valuations, watchlists | TESTED | cross-tenant tests fail closed |
| A3 | Server-side saved assessments (replace localStorage-only) with export/delete | NOT STARTED | migration from local drafts on opt-in |
| A4 | Watchlists + change alerts (in-app) | PARTIAL (account watchlist done; alerts not started; legacy local /watchlist to merge) | depends on A1/A2 |
| A5 | API keys, quotas, audit history | NOT STARTED | — |

## P2 — product surfaces

| ID | Feature | Status |
|---|---|---|
| P1 | Company profile: identity + group + India (done) + financials/value/risk/confidence tabs | PARTIAL |
| P2 | Screener (jurisdiction, state, class, listing, status; financial filters when data exists) | PARTIAL (India filters) |
| P3 | Relationship explorer (interactive group graph) | PARTIAL (tree) |
| P4 | Comparison lab on normalized observations | PARTIAL (SEC-only) |
| P5 | Research terminal (grounded Q&A, evidence inspection) | PARTIAL (LEI research) |
| P6 | Exports (CSV/PDF with methodology) | PARTIAL (workbench) |
| P7 | Data coverage explorer (public, honest category counts) | IMPLEMENTED (/coverage) |
| P8 | Protected ops console | NOT STARTED |
| P9 | SEO: profile indexing policy, structured data, sitemap segmentation | IMPLEMENTED (index only valuable profiles; JSON-LD; canonical host fixed) |

## Pass 2 — hardening

Threat model, dependency/container scans, tenant-isolation and gateway tests, performance baselines (p50/p95/p99), recovery drills (DB restore, interrupted ingestion, model down, DGX unreachable), AI eval expansion, visual regression, accessibility (WCAG 2.2 AA).

## Incidents
- 2026-11-27 ~10:40 UTC: after an engine restart during the REPEX import, `/v1/status` full-table counts exceeded the 15 s role timeout → public site showed "not connected" for ~10 min. Fix: migration 009 maintained exact counts + background refresh; status never runs multi-million-row counts per request. Verified recovered 10:48 UTC.
