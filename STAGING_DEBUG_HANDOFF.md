# STAGING DEBUG HANDOFF

Updated 2026-10-12 (Asia/Saigon). Branch `fix/staging-stabilization-20261012`; first code commit `6130cd5` pushed to origin, locale correction commit `fe132bd` prepared. Existing user edits to `docs/TLU-PROD-UNBLOCK-01.md`, `.tmp-capture-har.mjs`, and `prompt-tlu-dieu-tra-va-go-production.md` are untouched.

## Search (current group)
Confirmed in Chrome: typing Vietnamese and Enter led to empty `/tim-kiem` despite published CMS articles. Headless and WPX search returned `items:[]`; CMS `wp/v2/search` returned posts 57004 (VI) and 54691/54592 (EN) with `X-WP-Total`. Authenticated CMS terminal at 116.101.70.243 showed `headless-api` installed, no `wpx-ft` plugin. `release/headless-api/includes/Services/SearchService.php` dispatches missing WPX route to a remote backend, explaining the data mismatch with the CMS snapshot. CMS terminal was read-only; production untouched.

Local changes: live search resets stale requests, separates empty/error, Enter opens full results until a result is explicitly selected; server search and page share CMS core REST search with safe source-locale filtering, local post paths and excerpt; `/api/search` retains local rate limiting. Core search does not register `lang`, so its total count is cross-locale and exact per-locale pagination needs CMS work. `STAGING_FULL_DEBUG_REPORT.md` has detail. New targeted Playwright in `university-next/tests/e2e/staging-stability.spec.ts`. Lint, typecheck and build passed. The 12 targeted cases passed across the original run and focused reruns after corrections. Staging currently runs original release `0d96903`; original bug remains there.

## Language switch (next group, code in progress)
Baseline Playwright on staging confirms VI→EN permanently disables checkbox. Local route-keyed state, bounded translation lookup, CMS category translations, spinner/retry and reduced-motion support prepared. Not yet verified on staging.

## Homepage, category, performance (later)
Baseline HTTP samples in `artifacts/staging-debug/before-http.json` showed HTML TTFB 5–16.6 s and loopback `/en` 6.2 s. CMS options ~2.4 s, homepage snapshot ~7.5 s. Public Headless menu endpoint HTML 404 and core menu endpoint 401 add serial overhead; local Header uses its existing fallback directly. Homepage extras now start alongside snapshot; snapshot has timeout and schema validation; taxonomy list reuses cache. Navigation progress prepared. Mobile drawer previously lacked search; added it and verified locally. Staging verification remains.

## Deployment attempt and blocker
Fetched exact commit `6130cd5` to frontend VPS and built as `www` in isolated `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-6130cd5`. Saved old systemd override in `/www/wwwroot/dev.nguyenhongson.vn-app/backups/staging-20261012-6130cd5/override.conf`; old release directory remains intact. Switched `tlu-next-staging` to the new worktree, but smoke of homepage and `/api/search` timed out at 30 seconds. Direct CMS REST `/wp/v2/search` from the frontend VPS timed out at 12 seconds, as did frontend loopback search. CMS aaPanel showed load average ~305 initially, ~248 PHP-FPM processes, 21/23 GiB RAM used and swap 3.5/3.8 GiB. This is an upstream availability blocker, not evidence that the frontend fix failed. Immediately restored the saved override and restarted the old release; `systemctl` confirms active `0d96903`. Old release `/en` also timed out at 20 seconds while CMS remained overloaded. No CMS or production writes.

After CMS search briefly recovered (200 in 2.77 s), deployed `6130cd5` again and saw the new Search API return five EN results. Chrome then exposed mixed-language core search results because CMS ignores `lang`; temporarily restored `0d96903` and added source-permalink language validation in commit `fe132bd`. New local build and 3 focused real-data E2E passed. The follow-up commit has not yet been deployed.

## Immediate next steps
1. CMS operator investigates PHP-FPM load/traffic, access/error logs, slow requests and database pressure using read-only diagnostics first. Do not restart shared MariaDB or alter CMS without separate authorization.
2. Push `fe132bd` and docs checkpoint, build a new isolated worktree at the final SHA, and switch staging only when CMS core search responds reliably. The saved systemd override remains the rollback path.
3. Run staging real-data E2E, Chrome VI/EN/mobile checks, HTTP/Web Vitals benchmarks and full regression. Mark FIXED only after those pass; use `STAGING_FINAL_STABILITY_REPORT.md` for results.

Acceptance: warm navigation/search p95 <=2 s, cold document p95 <=5 s, complete content. Never report ready for production until separate data/backup/cutover gates pass.
