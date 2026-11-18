# CREQOR visual and company catalogue contract

Updated 2026-11-18.

## Identity and density

CREQOR uses a reserved, institutional visual language: navy `#18283B` for primary text and analytical panels, blue `#305FB9` for actions/links and small purposeful accents, white `#FFFFFF` for primary surfaces, subtle blue-grey `#F7F9FC` for section differentiation and `#E3E9F0` for hairlines. Montserrat for headings and Inter for controls/body. No gradient page backgrounds, no hover-induced layout movement, and no unsupported stock-price or rating visuals.

- Navigation/header/footer/prefooter horizontal gutter: **1.5%** of viewport.
- All page heroes and content sections: **3%** horizontal gutter.
- Page hero vertical padding: `--cq-hero-space` (27–40 px desktop / 27–29 px mobile).
- Analytical application sections: `--cq-app-space` (22–37 px desktop / 18–22 px mobile).
- Editorial sections: `--cq-section-space` (44–64 px desktop / 38–42 px mobile).
- Backgrounds: solid surfaces only; gradients on small icons, chart marks and progress indicators may remain.
- No duplicate tall tool-page introduction; meaningful controls and records should appear early on desktop.
- Preserve compact controls and left-aligned financial tables. Centered editorial headings do not justify centering tabular data.

The final shared override lives in `app/creqor-blue-compact.css`, imported after the older source styles. If refactoring the old stylesheets, keep these design tokens and reduce repeated selectors. **Do not introduce another competing theme layer.**

## Company population

The global directory is NOT a static set of made-up companies.

- GLEIF identity records are retrieved using the existing official public API adapter, with 60 source-linked results per directory page, paginated and filterable by country or name.
- The homepage/directory featured area resolves known search targets to **exact** GLEIF legal names; a nonmatching subsidiary must not silently stand in for a parent.
- The API may return fewer records than requested when the official registry has no exact match or temporarily fails.
- Each shown LEI record links to its live source-backed CREQOR record. Company identity does not verify stock listing, financial statements, current prices, historical prices, enterprise value, beneficial ownership, or ratings.
- The research desk contains user-saved drafts by design; it must not be populated with fictional saved assessments.

## Quality gates

Build, unit tests and typechecking must pass on the preview. Execute Playwright `tests-ui/compact-blue-universe.spec.ts`, `tests-ui/unified-design.spec.ts`, and directory/navigation suites in a browser before claiming comprehensive visual validation. Vercel READY alone does **not** confirm upstream GLEIF data retrieval or browser testing.

Next foundation milestone: source-attributed, versioned persistent entity data with secure access, deduplication, historical updates, provenance and permissioned financial enrichment—not synthetic financial estimates for real companies.
