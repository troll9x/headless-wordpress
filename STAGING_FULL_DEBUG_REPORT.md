# STAGING FULL DEBUG REPORT

Date: 2026-10-12 (Asia/Saigon). Working branch: `fix/staging-stabilization-20261012`.
Baseline release: `0d969039f2efe509ce6d7342585859e0a104cc6c`.
Scope: frontend staging only. Existing user changes in `docs/TLU-PROD-UNBLOCK-01.md` and untracked prompt/HAR script preserved.
Acceptance agreed: warm navigation/search p95 <= 2 s; cold document p95 <= 5 s; complete content.

## FE-001 — Search returns false empty results
Reproduction: Chrome homepage query `thủy lợi`, Enter -> `/tim-kiem?q=...` -> no results. Direct Headless and WPX queries for `water`, `Thuyloi`, `Nguyễn Trung Việt` return `{items:[]}`. Core CMS REST search returns real English water articles including 54691 and 54592.
Evidence: registered REST index confirms `/headless/v1/search`, `/wpx-ft/v1/search`, `/wp/v2/search`. CMS aaPanel shows `headless-api` installed but no `wpx-ft` plugin. `release/headless-api/includes/Services/SearchService.php` delegates to the legacy remote backend when WPX is absent, then filters those IDs against the CMS snapshot. This explains the false-empty result. Core `/wp/v2/search` on the actual CMS returns published posts and pagination headers, but its registered schema has no `lang` argument and mixed-language results were reproduced for `water` and `thủy lợi`.
Fix: frontend search and results page now use the actual CMS core endpoint, validate original CMS permalink locale before constructing a local path, and separate upstream/schema errors from empty results. CMS and production were not changed. Core `X-WP-Total` is only a cross-locale upper bound; exact per-locale totals and fully dense pagination remain blocked on a CMS search endpoint that applies Polylang inside the query.
Tests: real VI/EN data, pagination, article navigation, cross-locale leak rejection and injected failures passed locally and on staging.
Staging verification: after a rollback during severe CMS overload and a source-locale correction, release `9c094fc` is active. Real VI/EN search flows passed in Chrome and Playwright. Status: FRONTEND FIX VERIFIED; exact per-locale totals remain CMS-blocked.

## FE-002 — Search UX, errors and pagination
Root cause: LiveSearch initialized activeIndex=0 so Enter selected first result; hid valid empty results; results page caught all API exceptions as empty arrays. headless-search requested perPage+1 but dropped item 11 before requesting next page at offset 11, skipping one result per page.
Fix: explicit keyboard selection, visible empty/error states, immediate stale-result invalidation, schema rejection and consistent source page size. Per-locale totals require CMS support as noted above.
Files: LiveSearch.tsx, SearchResultsPage.tsx, services/search.ts, headless-search.ts.
Tests: fixture cases for delayed response/clear, malformed schema, 502; real VI/EN navigation tests added.
Staging verification: active release `9c094fc`, targeted search tests passed. Status: VERIFIED within the CMS locale limitation.

## FE-003 — Language switch locks permanently
Reproduction: Chrome VI search -> EN -> checkbox remains disabled. Playwright baseline fails toBeEnabled after 10 s (trace retained).
Root cause: isSwitching never reset in persistent header. Hardcoded category paths differ from actual CMS translations; unknown slugs blindly prefixed /en. 503 was silently treated as missing translation.
Fix: route-keyed state, useTransition and immediate spinner, click lock, bounded lookup, retry error, CMS term translations, safe homepage for genuine missing translations, query retained only for search, reduced motion CSS.
Files: ChuyenNgonNgu.tsx, chuyen-ngon-ngu.css, api/translation/route.ts.
Tests: baseline failure confirmed; new bidirectional, category, article and injected failure E2E.
Staging verification: VI↔EN, category translation, query preservation, fallback and retry passed on active staging. Status: VERIFIED.

## FE-004 — Homepage and navigation latency
Evidence: artifacts/staging-debug/before-http.json: 3 sequential samples x 8 routes; observed HTML response 5.1–16.6 s. These are first-observed/repeat samples, NOT proof of cold origin caches. Loopback staging /en TTFB 6.212 s proves delay exists inside Next/CMS chain. Cache directories owned www:www, mode 775. CMS API ~2.4–9.4 s. Logs show taxonomy cache refresh AbortError. Public API search warm ~0.14–0.17 s returns empty, so speed does not imply correctness.
Root causes confirmed: homepage optional integrations start only after snapshot; snapshot has no deadline or complete schema validation. Header attempts public Headless menu then authenticated core menus, which returned HTML 404 then 401. Full CMS-side cause pending.
Fix: independent homepage calls started together; snapshot deadline/schema validation; reuse cached taxonomy across tree/sidebar. Navigation progress with bounded wait/retry implemented.
Files: homepage-snapshot.ts, services/homepage.ts, categories.ts, NavigationProgress.tsx, layout.tsx.
Staging verification: three-sample after benchmark is in `artifacts/staging-debug/after-http.json`. Category/article/search pages improved substantially, but VI homepage remained ~10.47 s. Direct CMS homepage snapshot returned 200 after 11.41 s, exceeding the frontend's 10 s deadline and triggering fallback. Status: PERFORMANCE GATE FAILED.

## FE-005 — Mobile search unavailable
Local 390px Playwright reproduction: opening the mobile navigation exposed no search combobox. `Topbar.tsx` hides its SearchBox below 1025px and `MobileNav.tsx` had no equivalent.
Fix: a full-width LiveSearch in the mobile drawer. Mobile search and EN switch passed locally.
Staging verification: mobile search and language switch passed on active staging. Status: VERIFIED.

## FE-006 — CMS availability blocks staging validation
During the `6130cd5` deploy smoke, `/` and `/api/search` exceeded 30 seconds. Frontend VPS loopback `/api/search` and direct CMS core search both exceeded 12 seconds. CMS host load average reached ~305, PHP-FPM processes ~248, RAM 21/23 GiB and swap 3.5/3.8 GiB. Read-only follow-up showed load ~65, >200 workers in pool `www`, nine processes in D state and >300 established TCP connections; the exact traffic/query source is not yet confirmed. The old frontend release `/en` also exceeded 20 seconds after rollback. No CMS setting/service/database was changed.
Fix: requires CMS operator investigation; frontend-only changes cannot repair upstream saturation. CMS subsequently responded enough for all staging tests, but the homepage snapshot is still >11 s. Status: UPSTREAM ISSUE OPEN.

## Checkpoint
Frontend aaPanel terminal available: 103.149.253.223, root, `tlu-next-staging`, www, port 3001. Active WorkingDirectory is `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-9c094fc/university-next`; old `0d96903` remains for rollback. Saved override at `/www/wwwroot/dev.nguyenhongson.vn-app/backups/staging-20261012-6130cd5/override.conf`. CMS panel on 116.101.70.243 was used only for read-only diagnostics; no production/database changes performed. Active staging passed 12/12 targeted and 15/15 public-site regression tests. See `STAGING_FINAL_STABILITY_REPORT.md` for release gate and measurements.
