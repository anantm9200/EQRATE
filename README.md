# CREQOR

**Discover intelligently. Value scientifically. Verify independently.**

CREQOR is a new evidence-led company research and valuation application. Its first-stage code is in the existing [anantm9200/EQRATE](https://github.com/anantm9200/EQRATE) repository.

## What's working in the code

- Responsive emerald and white glass design, Montserrat + Inter typography, full-screen navigation and reduced-motion support
- Landing, company explorer, issuer profile, comparison, local watchlist, valuation lab, market intelligence, private AI analyst, research, verification and methodology pages
- Official US SEC entity discovery, issuer identity and annual financial highlights **when** `SEC_USER_AGENT` is configured
- Deterministic market-cap and DCF computations with input checks and unit tests
- Live-updating hypothetical DCF scenarios and sensitivity table, explicitly labelled as illustrative
- Server-only DGX inference gateway with access token, off by default, and request constraints
- Structured PostgreSQL database schema for future evidence-backed write workflows
- SEO and social metadata, sitemap and robots, safe preview noindex default

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev
npm test
npm run typecheck
```

Set `SEC_USER_AGENT` to a responsible application identifier and real contact email for permitted SEC access. The app works without it, but company search correctly reports that the registry is not configured.

For DGX, configure `DGX_OPENAI_BASE_URL` (ending in `/v1`, reachable privately over HTTPS), `DGX_MODEL`, optional `DGX_API_KEY`, `CREQOR_ANALYST_ACCESS_TOKEN`, and `CREQOR_AI_ENABLED=true`. The browser requests analyst access keys directly from authorised users and never receives the server's DGX credentials.

See [architecture and known limits](docs/ARCHITECTURE.md) and [schema](db/schema.sql).

## Important

CREQOR is **not** presenting itself as a licensed credit rating agency. No live trading prices, source-backed private valuations, company scores, M&A events or fabricated financial stories are included. Live market-data coverage, verified financial facts, regulated research, subscriptions and multi-agent RAG remain future implementation stages. Do not publish unsupported market-cap, ranking, or acquisition claims.

CREQOR is deployed on Vercel at https://creqor.vercel.app. The presence of a deployment does not establish that optional data providers, private inference or a production database are configured.
## Research workflows (November 2026)

- **Global company discovery:** GLEIF legal entity search with company identity prefill for the assessment workspace; no claim of financial verification from LEI status
- **Company workbench:** six deterministic valuation methods, listed-market-cap arithmetic for entered price/share inputs, source claim register with editing, draft scoring and report printing
- **Analysis cockpit:** WACC/terminal-growth 5×5 sensitivity grid, bear/base/bull scenarios, analyst-applied adjustments, method divergence and data-completeness review; exportable DCF matrix CSV
- **Research desk:** up to 30 local assessment drafts, search, filters, sorting, duplication, reopening, two-company comparison, JSON bundle backup/import and CSV index
- **Reports:** editable assumptions, analyst source links, open risks and caveats; browser Print can save PDF
- **Runtime:** Vercel Cron invokes `/api/ops/smoke` hourly using `CRON_SECRET` (server setting). Review Vercel production logs for `CREQOR_HOURLY_SMOKE` or failures

### Build and validation

`npm run build` runs `npm test` before `next build`. Vercel Git deployments therefore run deterministic numerical, data-provider and import-safety tests before releasing a build. Playwright tests in `tests-ui/` may be run separately using `npm run test:ui` with a local server; these are not automatically run by the Vercel build.

**No GitHub Actions:** This repository intentionally contains no `.github/workflows` files. Do not recreate them.

### Important limits

Browser localStorage is not a secure encrypted repository, shared workspace or account system. Uploaded evidence files are not accepted; only HTTPS source references and claims are stored locally. Global exchange prices, audited private-company datasets, secure team persistence, independent company ratings, and the private DGX AI service all require separately authorised providers or infrastructure. A method calculation, subjective draft score or registered LEI record is not a verified valuation, credit rating or investment recommendation.

### CREQOR engineering and provenance roadmap (November 2026)

See [Engineering playbook](docs/ENGINEERING_PLAYBOOK.md) for the release gates, daily build loop and ordered milestones. The cross-company portfolio engine screens locally saved assessments for reused source URLs, potential identity collisions and large differences between dated entered financial figures. **Flags are leads for investigation, never independently verified ownership, fraud findings or published credit ratings.** Its Vercel preview and build status must be checked before merging.
