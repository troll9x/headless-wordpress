# STAGING FULL DEBUG REPORT

Date: 2026-10-12 (Asia/Saigon). Working branch: `fix/staging-stabilization-20261012`.
Baseline release: `0d969039f2efe509ce6d7342585859e0a104cc6c`.
Scope: frontend staging only. Existing user changes in `docs/TLU-PROD-UNBLOCK-01.md` and untracked prompt/HAR script preserved.
Acceptance agreed: warm navigation/search p95 <= 2 s; cold document p95 <= 5 s; complete content.

## FE-001 — Search returns false empty results
Reproduction: Chrome homepage query `thủy lợi`, Enter -> `/tim-kiem?q=...` -> no results. Direct Headless and WPX queries for `water`, `Thuyloi`, `Nguyễn Trung Việt` return `{items:[]}`. Core CMS REST search returns real English water articles including 54691 and 54592.
Evidence: registered REST index confirms `/headless/v1/search`, `/wpx-ft/v1/search`, `/wp/v2/search`. CMS aaPanel shows `headless-api` installed but no `wpx-ft` plugin. `release/headless-api/includes/Services/SearchService.php` delegates to the legacy remote backend when WPX is absent, then filters those IDs against the CMS snapshot. This explains the false-empty result. Core `/wp/v2/search` on the actual CMS returns published, locale-filtered posts and exact pagination headers.
Fix: frontend search and results page now use the actual CMS core endpoint, with safe local paths and error/schema validation. CMS and production were not changed.
Tests: real VI/EN data, pagination, article navigation and injected failures passed locally; staging pending.
Staging verification: original failure confirmed. Status: CODE FIXED — STAGING PENDING.

## FE-002 — Search UX, errors and pagination
Root cause: LiveSearch initialized activeIndex=0 so Enter selected first result; hid valid empty results; results page caught all API exceptions as empty arrays. headless-search requested perPage+1 but dropped item 11 before requesting next page at offset 11, skipping one result per page.
Fix: explicit keyboard selection, visible empty/error states, immediate stale-result invalidation, schema rejection, consistent page size and exact pagination metadata from CMS core headers.
Files: LiveSearch.tsx, SearchResultsPage.tsx, services/search.ts, headless-search.ts.
Tests: fixture cases for delayed response/clear, malformed schema, 502; real VI/EN navigation tests added.
Staging verification: pending deploy. Status: BLOCKED (local fix, not yet accepted).

## FE-003 — Language switch locks permanently
Reproduction: Chrome VI search -> EN -> checkbox remains disabled. Playwright baseline fails toBeEnabled after 10 s (trace retained).
Root cause: isSwitching never reset in persistent header. Hardcoded category paths differ from actual CMS translations; unknown slugs blindly prefixed /en. 503 was silently treated as missing translation.
Fix: route-keyed state, useTransition and immediate spinner, click lock, bounded lookup, retry error, CMS term translations, safe homepage for genuine missing translations, query retained only for search, reduced motion CSS.
Files: ChuyenNgonNgu.tsx, chuyen-ngon-ngu.css, api/translation/route.ts.
Tests: baseline failure confirmed; new bidirectional, category, article and injected failure E2E.
Staging verification: pending deploy. Status: BLOCKED (local fix).

## FE-004 — Homepage and navigation latency
Evidence: artifacts/staging-debug/before-http.json: 3 sequential samples x 8 routes; observed HTML response 5.1–16.6 s. These are first-observed/repeat samples, NOT proof of cold origin caches. Loopback staging /en TTFB 6.212 s proves delay exists inside Next/CMS chain. Cache directories owned www:www, mode 775. CMS API ~2.4–9.4 s. Logs show taxonomy cache refresh AbortError. Public API search warm ~0.14–0.17 s returns empty, so speed does not imply correctness.
Root causes confirmed: homepage optional integrations start only after snapshot; snapshot has no deadline or complete schema validation. Header attempts public Headless menu then authenticated core menus, which returned HTML 404 then 401. Full CMS-side cause pending.
Fix: independent homepage calls started together; snapshot deadline/schema validation; reuse cached taxonomy across tree/sidebar. Navigation progress with bounded wait/retry implemented.
Files: homepage-snapshot.ts, services/homepage.ts, categories.ts, NavigationProgress.tsx, layout.tsx.
Staging verification: pending deploy. Status: BLOCKED (local fix).

## FE-005 — Mobile search unavailable
Local 390px Playwright reproduction: opening the mobile navigation exposed no search combobox. `Topbar.tsx` hides its SearchBox below 1025px and `MobileNav.tsx` had no equivalent.
Fix: a full-width LiveSearch in the mobile drawer. Mobile search and EN switch passed locally.
Staging verification: pending deploy. Status: CODE FIXED — STAGING PENDING.

## Checkpoint
Frontend aaPanel terminal available: 103.149.253.223, root, `tlu-next-staging`, www, port 3001. Active WorkingDirectory `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-0d96903/university-next`. Main server repo HEAD cbb6d31 differs; deploy must create separate worktree at new exact SHA and preserve current service override for rollback. CMS is on another host; user is opening authenticated CMS panel. No production/database changes performed.
