# CREQOR technical architecture

## Status: stage-one application, not a finished institutional platform

CREQOR is the product brand; the existing repository remains named EQRATE. Frontend is Next.js App Router + TypeScript + CSS. Styling uses Poppins and Inter, a dark-green gradient system, compact headings, glass panels and full-screen hamburger navigation. No external image dependencies are needed for the visual system.

## Trust architecture

1. **Identity:** the SEC search adapter queries the official US company ticker/exchange registry. Company pages load official SEC issuer submissions, matched by ten-digit CIK. No ticker alone becomes an inferred legal identity.
2. **Market cap:** the formula in `lib/valuation.ts` takes a documented price and matching applicable share count. The product does not claim to have a licensed live price feed.
3. **Private equity:** DCF output is an **estimated equity valuation**, never an observed public market cap. The interactive lab begins with visibly labelled hypothetical inputs. Its formula is deterministic, testable and separate from AI.
4. **Research:** external notes are untrusted. No AI output or company statement becomes verified solely by appearing on screen.
5. **Persistence:** `db/schema.sql` defines companies, identifiers, source documents, claim-level verification, market prices, financial facts, corporate actions, valuations, scores and audit events. Database connection, migrations and permission layers require implementation before write workflows can go live.

## DGX integration

Vercel (or a self-hosted app server) calls a **private HTTPS gateway** via a server-only `DGX_OPENAI_BASE_URL` ending in `/v1`. The gateway should securely route to an OpenAI-compatible inference endpoint backed by the DGX. Keep model hosts and ports private; do not forward vLLM's port directly to the Internet. For a Vercel deployment, use an authenticated outbound relay or zero-trust gateway with HTTPS and egress controls; private Tailscale machine IPs alone are not reachable from Vercel.

The analyst route:
- is disabled by default;
- requires a server-configured bearer access token provided by an authorised analyst;
- checks timeouts, input limits, HTTPS and basic process-local rate limiting;
- sets strict research instructions, treats pasted evidence as untrusted, and refuses to fabricate financial evidence;
- does **not** yet perform source-backed retrieval from filings; actual RAG and multi-agent validation remain roadmap items.

`CREQOR_ANALYST_ACCESS_TOKEN` is a private shared access credential in this stage, **not user authentication**. Do not turn on broadly for the public without identity, distributed rate limiting, abuse prevention, observability and usage budgets.

## Status and launch plan

Implemented: site shell, pages, responsive visuals, SEC adapter (needs SEC_USER_AGENT), issuer identity and XBRL financial highlights, issuer comparison with reporting-period labels, browser-local watchlist (no alerts or cloud sync), DCF and market-cap library, tests, research methodology, guarded inference gateway, SEO metadata/robots/sitemap.

Not yet implemented: production PostgreSQL application access and migrations, MFA and RBAC, global registry connectors, licensed market-price feeds, claim-ingestion, document malware scanning, material company scoring, score publishing, proper acquisition monitoring, research editorial workflows, secure public multi-user AI, advanced valuation models, watchlists, alerts, distributed rate limiting and automated company indexing.

## Vercel deployment

Import `anantm9200/EQRATE`, framework Next.js, root directory `./`. Run `npm install`, then `npm run build`. Set `SEC_USER_AGENT` and other server-side environment variables as required. Set `NEXT_PUBLIC_SITE_URL` only when the public canonical production domain is decided. Until that point, robots disallows indexing. Test `/api/health`, `/explore`, `/lab`, and `/analyst` before launch.

No domain, hosting deployment, database, SEC user agent, private DGX gateway credentials or licensed data subscriptions have been configured by this commit.