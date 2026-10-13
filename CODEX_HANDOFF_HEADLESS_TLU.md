# Headless TLU checkpoint — 2026-10-13

## State

- Branch: `fix/staging-stabilization-20261012`; starting HEAD for this continuation: `6b40afb053ab5e434aaf96848349cda41978aa00`. Targeted hotfix and checkpoint commit: `0e27e22`, pushed to `origin`; see `git log -1` for any later documentation update.
- Frontend staging: release `2970f7b` on `tlu-next-staging`; it retains the React #441 fallback and replaces the top navigation bar with a centered circular spinner. CMS timeouts can still interrupt content. Production `tlu.edu.vn` was not changed.
- CMS: installed Headless API **2.1.0** at `/www/wwwroot/cms.tlu.edu.vn/wp-content/plugins/headless-api`; local plugin tree is **2.0.9**, so do not deploy the full tree. CMS plugin remains unchanged.
- CMS backup: `/home/admintlu/headless-api-2.1.0-20261012.tgz`, SHA-256 `cddc5b4a5720e7c5c219380c2e28ce0f33653e1badce5819809953cd51c6e68`.
- Preserve unrelated pre-existing work: `docs/TLU-PROD-UNBLOCK-01.md`, `.tmp-capture-har.mjs`, `artifacts/staging-debug/baseline-language/`, `prompt-tlu-dieu-tra-va-go-production.md`.

## Prepared changes, not deployed

- `release/headless-api/includes/Services/SearchService.php`: VI/EN search now puts Polylang `lang` in the `WP_Query` before pagination, constrains results to published, unprotected `post`, and returns actual `found_posts`/`max_num_pages`. `page` is excluded under the existing plugin visibility policy. Unscoped requests retain the legacy WPX backend. This changes VI/EN search ranking/matching from WPX FULLTEXT to native WordPress search; compare results on live data before approval.
- `release/headless-api/includes/endpoints/class-search.php`: supports `per_page` alias and rejects unsupported languages.
- `release/headless-api/includes/endpoints/class-seo.php`: propagates `WP_Error` rather than indexing it as an array; passes language to ID lookup. CMS error log showed a fatal on this route at line 64.
- `scripts/test-cms-language-search.php`, `scripts/test-cms-seo-error.php`: local contract tests. `scripts/build-cms-search-overlay.py`: reproducible targeted overlay builder.
- `artifacts/cms-search-hotfix/headless-api-2.1.0-search-seo-overlay.zip`, SHA-256 `f7ec478d422e45d53af0ba9b9df26bf8d57e1a07838249b3546f9ee6de274771`. Its manifest contains expected installed and payload hashes. It is **not** a plugin ZIP for WordPress updater.
- `CMS_SEARCH_AND_PERFORMANCE_FIX_REPORT.md`: evidence and limits.

## Verification and blocker

- Both local PHP contract tests passed; PHP lint passed on the three changed plugin files and two tests. ZIP entries match manifest hashes. Live search, language, pagination, cache separation, SEO, and staging E2E are **not yet verified**.
- CMS REST was unstable: a bounded small `/wp/v2/posts` request timed out after 8 s, a homepage snapshot request logged 499, and Nginx logged PHP-FPM upstream connection resets on ordinary routes. The CMS recently had very high load during an attack; load was falling but swap/PHP-FPM process count remained high. No comparable homepage before/after p95 or step-level SQL/PHP profile exists. Do not infer a homepage code root cause or deploy while this persists.
- The installed 2.1 `HomepageSnapshotService.php` runs multiple internal REST handlers serially, including `_embed` post queries and ACF fields; this is a profiling lead only.

## Exact next steps

1. Administrator restores sustained PHP 8.4 FPM/origin REST capacity, checks FPM queue/reset logs and MariaDB health, then confirms a small `/wp-json/wp/v2/posts/56168` and search request respond consistently without edge challenge. Do not run load tests while the server is under attack.
2. Under stable conditions, compare native `WP_Query` VI/EN matching/ranking with the intended FULLTEXT behavior and real CMS posts. Verify totals and multilingual pagination with accented and unaccented terms, no-result query, password/draft exclusion, and VI/EN cache keys. Adjust the patch if it loses valid content or materially changes search semantics.
3. Before CMS deployment, verify every installed target file still matches `original_sha256` in the overlay manifest, verify backup extraction and per-file rollback, then replace only those three files on **cms.tlu.edu.vn**. Do not overwrite the installed 2.1.0 plugin with local 2.0.9.
4. Run live API checks for VI/EN search, pagination, cache HIT/MISS, SEO error propagation, homepage content, then frontend staging browser E2E. Only then mark Search FIXED.
5. Profile homepage endpoint phases, PHP-FPM queue, slow SQL, and cache under comparable healthy conditions. Optimize the proven bottleneck, retest content completeness, and measure against warm navigation/search p95 ≤ 2 s and cold document p95 ≤ 5 s.

No CMS deployment, Cloudflare rule, database change, MariaDB restart, or production change was made in this continuation.

## Navigation loading follow-up — 2026-10-13

- User identified the thin line at the top of staging as the wrong loading affordance. `university-next/src/components/layout/NavigationProgress.tsx` now displays a centered circular spinner during client navigation; the existing delayed warning/retry behavior remains.
- Source commit `2970f7b` was pushed. Local ESLint, TypeScript check and production build passed. An isolated release was built on the FE VPS and `tlu-next-staging` was switched to it; previous override saved at `/tmp/tlu-next-staging-2970f7b.rollback.conf`, old release retained.
- `systemctl show` reported active/running with `TLU_RELEASE_ID=2970f7b`; public HTTPS `/robots.txt?probe=2970f7b` returned 200 and `X-TLU-Release: 2970f7b`. Browser reload followed by an internal click showed the centered spinner, then a populated homepage. CMS search and homepage performance gates remain open.

## Short CMS preflight — 2026-10-13 ~10:08 ICT

- Git HEAD `207febe` on `fix/staging-stabilization-20261012`, tracking origin. Preserved untouched pre-existing changes: `docs/TLU-PROD-UNBLOCK-01.md`, `.tmp-capture-har.mjs`, `artifacts/staging-debug/baseline-language/`, `prompt-tlu-dieu-tra-va-go-production.md`.
- CMS read-only sample: load `5.42/5.07/11.15`; RAM 10/23 GiB used, 12 GiB available; swap 2.3/3.8 GiB used; 111 `php-fpm: pool www` processes. One bounded public core post REST request returned 200 in 2.05 s; one Headless EN search request returned 200 in 2.59 s (29 bytes). These two samples do not establish sustained capacity or correct search results.
- **READY — artifact and rollback material:** installed plugin header says 2.1.0. Backup `/home/admintlu/headless-api-2.1.0-20261012.tgz` still has SHA-256 `cddc5b4a5720e7c5c219380c2e28ce0f33653e1badce5819809953cd51c6e68`; tar lists 109 entries and contains all three target files. Each archived file hash equals its live installed hash and the overlay manifest `original_sha256`: SearchService `7997acfc…`, class-search `9904e7b9…`, class-seo `cfdba764…`. Local overlay ZIP SHA-256 is `f7ec478d422e45d53af0ba9b9df26bf8d57e1a07838249b3546f9ee6de274771`; all three ZIP payload hashes match its manifest. Rollback plan is to restore only these three files from the verified tar, after taking a fresh per-file copy immediately before any future deployment. No extraction or write was performed now.
- **BLOCKED — deployment:** swap/PHP-FPM pressure remains substantial, REST stability was sampled only twice, and the native WP search path has not been compared with live FULLTEXT results. No plugin deploy, service restart, database change, or load benchmark in this preflight.
- **Next read-only commands after CMS has settled:** `uptime`, `free -h`, `pgrep -fc 'php-fpm: pool www'`; then a few sequential bounded `curl --max-time 8` calls to `/wp-json/wp/v2/posts/56168?_fields=id,slug` and `/wp-json/headless/v1/search?q=water&lang=en&per=2&page=1`. Inspect response bodies for language/relevance and compare intended FULLTEXT semantics before deciding whether this overlay is deployable. Recheck backup and the three installed SHA-256 hashes immediately before any future file replacement.
