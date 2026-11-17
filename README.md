# CREQOR

**Discover intelligently. Value scientifically. Verify independently.**

CREQOR is a new evidence-led company research and valuation application. Its first-stage code is in the existing [anantm9200/EQRATE](https://github.com/anantm9200/EQRATE) repository.

## What's working in the code

- Premium, responsive dark-green and gradient design, custom SVG logo, Poppins + Inter, full-screen navigation, motion and glassmorphism
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

No Vercel project was created or deployed by this commit. The GitHub repository is ready for later import.