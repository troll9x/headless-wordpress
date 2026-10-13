# CMS search and staging performance checkpoint — 2026-10-13

## Status

The CMS search fix and homepage benchmark are **blocked by CMS overload**. The staging React #441 incident has a separate frontend fallback fix in commit `fa55fee70a06fd7144881740ab9f881a4bcc6340`; the fallback does not restore CMS data. Do not label search or the article route fixed until the CMS API and staging checks below pass.

## CMS plugin and search findings

- The installed plugin at `/www/wwwroot/cms.tlu.edu.vn/wp-content/plugins/headless-api` reports version **2.1.0**. It is not a Git checkout. The local `release/headless-api` source is version **2.0.9** and differs from the installed files. The public [Headless-API repository](https://github.com/troll9x/Headless-API) could not be treated as an exact replacement for the installed 2.1.0 release.
- Before any change, a copy of the installed plugin was saved on the CMS server as `/home/admintlu/headless-api-2.1.0-20261012.tgz`. No CMS plugin file or database table has been changed.
- Installed `SearchService` handles `/wpx-ft/v1/search` and `/suggest`, dispatching to WPX when available or a configured legacy remote search backend otherwise. The installed Headless endpoint handles `/headless/v1/search` and `/suggest` and calls this service.
- The observed service filters IDs for visibility and `pll_get_post_language()` **after** backend pagination. This can produce empty or sparse pages and makes returned totals unsuitable for language-specific pagination. A backend query constrained by Polylang before pagination, with matching `found_posts`/`total_pages`, is required. The source of the empty upstream search result is not yet isolated; the remote backend and cache also need inspection under healthy server conditions.
- One bounded public baseline request to `/wp-json/headless/v1/search?q=water&per=2&page=1&lang=en` returned HTTP 200 in 2.83 s with `{"items":[],"page":1,"per":2}`. This single response does not establish expected result counts or correctness.
- Plugin version after: **2.1.0 unchanged**. Backend source files changed: **none**. VI/EN search, pagination, cache HIT/MISS, and post-language verification: **not run**. Search E2E after backend update: **not run**.

## CMS load and homepage

The CMS was reported under attack while administrators adjusted Cloudflare. A prior sample showed load around 305 and approximately 248 PHP-FPM workers. On 2026-10-12, direct aaPanel inspection showed load about 16.79/16.11/21.9 on 16 cores, 117 PHP-FPM processes and 2.6/3.8 GiB swap in use. On 2026-10-13 around 09:18 ICT, the CMS aaPanel dashboard still reported **Overloaded**, with load averages **35.74/110.41/151.88** on 16 cores. Thus it is unsafe to deploy a CMS plugin or draw a code-level performance conclusion from current timings.

The earlier homepage VI request took about 10.47 s and the CMS snapshot about 11.41 s, against a 10 s Next.js snapshot timeout. No comparable before/after benchmark was run under stable conditions. The homepage snapshot callback, PHP-FPM queue, WP_Query/ACF/Polylang work, MariaDB queries, serialization, and edge/origin behavior remain to be traced once the CMS has recovered. No Cloudflare rule, timeout, production site, or MariaDB setting was changed.

## Staging React #441 incident

An article request at `https://dev.nguyenhongson.vn/truong-dai-hoc-thuy-loi-to-chuc-le-khai-giang-nam-hoc-2026-2027-56168` displayed the global React #441 error. React's [error reference](https://react.dev/errors/441) identifies it as a Server Components render failure whose production message is hidden. `journalctl -u tlu-next-staging` recorded `WordPressResponseError: WordPress API request timed out` for `/wp/v2/posts/56168`, digest `965977767`, with timeouts also recorded for another post and categories. A bounded direct request to the CMS post endpoint timed out without response. The primary incident cause is therefore upstream CMS API timeout, not the text of the React error.

`university-next/src/app/global-error.tsx` was changed in commit `fa55fee` to show a useful VI/EN unavailable message, the error digest, a retry action, and a homepage link instead of exposing `error.message`. Local lint, TypeScript check, and production build passed. This mitigates the user-facing error screen while leaving the article dependent on CMS recovery.

The isolated release built successfully on the frontend VPS and `tlu-next-staging` was switched to it. The prior service override is preserved at `/tmp/tlu-next-staging-fa55fee.rollback.conf`, with the prior release directory left intact. The service is active. Public HTTPS returned HTTP 200 with `X-TLU-Release: fa55fee` for the article URL with a probe query. A subsequent browser reload displayed the complete article, including body and related articles. This proves the article can load when the CMS responds; it does not prove the upstream timeout is gone. A homepage request to the new service still exceeded an 8 s bounded health check. One unparameterized `robots.txt` response carried an older `a8ab8b7` cache header while a probe query returned `fa55fee`, so public cache consistency is not fully established.

## Release and follow-up

- Frontend staging before this incident: release `9c094fc` on `tlu-next-staging`. The previous 12/12 stability and 15/15 regression results apply to that release, not to a CMS search fix.
- Frontend staging now: release `fa55fee` on `fix/staging-stabilization-20261012`; service active, public article HTTP 200 and visible in the browser. Full regression was not repeated because only the global error fallback changed and CMS load remained high.
- Server administrators need to restore sustained CMS capacity and confirm `/wp-json/wp/v2/posts/56168` and `/wp-json/wp/v2/search` respond reliably without edge blocks. Provide a maintenance window or stable-load signal for a bounded search test and homepage trace.
- Once stable, obtain the exact installed 2.1.0 plugin source as a version-controlled artifact, implement Polylang filtering in the backend query before pagination, lint/test it, and deploy to **cms.tlu.edu.vn only** with the existing backup and rollback. Verify VI/EN totals, pages, article language, cache separation, and staging E2E before declaring FIXED. Do not substitute the local 2.0.9 or public older release for installed 2.1.0.
