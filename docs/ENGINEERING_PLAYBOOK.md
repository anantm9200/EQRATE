# CREQOR engineering playbook

_Last reviewed: 2026-11-18. This is an execution standard, not a claim that every future subsystem is implemented._

## Product contract

CREQOR is an evidence-led research and valuation workspace for listed and unlisted companies. A computed estimate is not an observed market price; a research screen is not an authenticated company record, a credit rating, a fraud finding, or investment advice.

Never convert user-supplied data into a verified fact just because the application can calculate it. Any material output needs an identifiable input, applicable measurement unit, period, currency, source status, calculation version, and limitation.

## Daily engineering loop

1. Inspect `main`, recent Vercel production deploys, open pull requests, recent failures and product status; record the starting commit SHA.
2. Choose one bounded task from the highest unfinished milestone. Prefer correctness, safety, working data, and speed over visual novelty.
3. Work on a new branch from current `main`. No direct pushes to `main` and no automatic production promotion for unreviewed or untested changes.
4. Implement feature, regression tests, safe error states, documentation and rollback plan together. Keep features available without optional paid providers.
5. Run `npm test`, `npm run typecheck`, `npm run build`; run Playwright UI tests where a browser is available. Where they cannot run, say so plainly.
6. Confirm Vercel preview deployment reaches READY and inspect build logs. Check `/api/health` and the affected route. Distinguish build success from real data correctness and browser QA.
7. Open a concise PR with changed files, evidence, known limits, test status and preview URL. Only merge after gates pass; never hide a failed test.
8. Report what actually changed and what remains blocked. Do not manufacture numbers, sources, coverage, timings or test results.

## Release gates

- **Numerical correctness**: deterministic tests for every changed formula, currency, unit and date edge case.
- **Entity safety**: distinguish global LEIs from jurisdiction-scoped registration IDs. Never merge solely on company name.
- **Provenance**: preserve URL, as-of date, source type, verification status and reviewer actions; an HTTPS URL is not authenticated evidence.
- **Security**: validate imported content, protect credentials server-side, no public inference endpoint without auth and abuse limits, fail closed on external provider errors.
- **Interaction quality**: stable hover hitboxes, focus visibility, keyboard usability, 320px–1440px responsive coverage, reduced-motion behaviour.
- **Performance**: avoid continuous pointer-driven repaints, huge blur layers, unbounded searches and gratuitous network calls. Measure before claiming improvements.
- **Deployment**: reproduce tests, inspect preview, stage migration separately; no silent production DB changes.
- **Editorial / compliance**: label illustrative, analyst-supplied, unverified and provider-confirmed data distinctly. No unsourced buy/sell signals or published credit ratings.

## Ordered delivery programme

1. **Provenance and cross-company intelligence**: company-id resolution, reused URLs, source-host concentration, valuation divergence, draft time comparisons and explicitly unverified flags (local-first).
2. **Secure persistence**: provision an authorised Postgres instance, apply reviewed versioned migrations, private organisation accounts, MFA, RBAC, audit logs and tenancy isolation. Existing `db/schema.sql` is a blueprint, not an applied migration.
3. **Ingestion and freshness**: source-specific adapters for lawful public registries and filings, versioned snapshots, content hash, retry/backoff, provenance and as-of timestamps. Licensing check before any exchange-price feed. Do not treat a generic scrape as trusted data.
4. **Financial fact normalization**: GAAP / IFRS reporting basis, fiscal period alignment, consolidation boundaries, currency, units, restatements and security class; peer sector classification and contradictions.
5. **Model quality**: sector-appropriate methods, documented WACC, scenario sensitivity, out-of-sample backtests, comparison of method disagreement, independent audit trails. No fake confidence percentages.
6. **Research assistance**: retrieval from licensed/official documents with exact citations, evidence-first claims, contradiction checking, and human sign-off on publishable assessments.
7. **Institutional operations**: workspaces, approvals, API permissions, billing only after actual entitlements exist, monitoring, recovery drills, data quality dashboards and cost controls.

## Known dependencies and limits

- LocalStorage research is browser-local, not secure multi-user persistence.
- Portfolio intelligence detects **candidate** relationships from at most 30 locally saved assessments. It does not fetch or authenticate the documents; source-host overlap is not proof of shared ownership.
- DGX remains off unless authenticated secure HTTPS gateway and access controls are explicitly configured. No private DGX or NUC commands from application code.
- SEC access needs a compliant `SEC_USER_AGENT`; market prices and private-company accounts require licensed/authorised providers.
- The repository intentionally does not use GitHub Actions; do not add workflows without an explicit platform decision.
- A Vercel READY state means the app built and deployed, not that Playwright ran or provider data is correct.

## Definition of done

A task is done when its exact scope is committed, tests are green, preview is READY, failure states and limitations are disclosed, its PR/commit is linked, and the next dependency is recorded. Otherwise report `in progress` or `blocked`.
