# Headless TLU checkpoint — 2026-10-13

## State

- Branch: `fix/staging-stabilization-20261012`; starting HEAD for this continuation: `6b40afb053ab5e434aaf96848349cda41978aa00`. See `git log -1` for the commit containing this checkpoint.
- Frontend staging: release `fa55fee` on `tlu-next-staging`; the React #441 fallback is deployed, but CMS timeouts can still interrupt content. Production `tlu.edu.vn` was not changed.
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
