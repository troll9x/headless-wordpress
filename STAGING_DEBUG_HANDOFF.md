# STAGING DEBUG HANDOFF

Updated 2026-10-12 (Asia/Saigon). Branch `fix/staging-stabilization-20261012`, base `0d96903`. Existing user edits to `docs/TLU-PROD-UNBLOCK-01.md`, `.tmp-capture-har.mjs`, and `prompt-tlu-dieu-tra-va-go-production.md` are untouched. No commit or deployment yet.

## Search (current group)
Confirmed in Chrome: typing Vietnamese and Enter led to empty `/tim-kiem` despite published CMS articles. Headless and WPX search returned `items:[]`; CMS `wp/v2/search` returned posts 57004 (VI) and 54691/54592 (EN) with `X-WP-Total`. Authenticated CMS terminal at 116.101.70.243 showed `headless-api` installed, no `wpx-ft` plugin. `release/headless-api/includes/Services/SearchService.php` dispatches missing WPX route to a remote backend, explaining the data mismatch with the CMS snapshot. CMS terminal was read-only; production untouched.

Local changes: live search resets stale requests, separates empty/error, Enter opens full results until a result is explicitly selected; server search and page share CMS core REST search with locale, published content, exact pagination headers, safe post paths, excerpt; `/api/search` retains local rate limiting. `STAGING_FULL_DEBUG_REPORT.md` has issue detail. New targeted Playwright in `university-next/tests/e2e/staging-stability.spec.ts`. Lint, typecheck and build passed. Staging still original release `0d96903`; original bug remains there.

## Language switch (next group, code in progress)
Baseline Playwright on staging confirms VI→EN permanently disables checkbox. Local route-keyed state, bounded translation lookup, CMS category translations, spinner/retry and reduced-motion support prepared. Not yet verified on staging.

## Homepage, category, performance (later)
Baseline HTTP samples in `artifacts/staging-debug/before-http.json` showed HTML TTFB 5–16.6 s and loopback `/en` 6.2 s. CMS options ~2.4 s, homepage snapshot ~7.5 s. Public Headless menu endpoint HTML 404 and core menu endpoint 401 add serial overhead; local Header uses its existing fallback directly. Homepage extras now start alongside snapshot; snapshot has timeout and schema validation; taxonomy list reuses cache. Navigation progress prepared. Mobile drawer previously lacked search; added it and verified locally. Staging verification remains.

## Immediate next steps
1. Finish targeted local E2E and existing regression, repair any failures.
2. Commit only task files on current branch. Keep preexisting edits uncommitted.
3. Push working branch (not main), create isolated staging worktree, preserve current service override/release, build as www, switch service to new SHA, smoke in Chrome.
4. Run Search real-data tests and benchmarks. Record results; only mark FIXED if staging passes.
5. Continue language, content, performance; run full regression and final report.

Acceptance: warm navigation/search p95 <=2 s, cold document p95 <=5 s, complete content. Never report ready for production until separate data/backup/cutover gates pass.
