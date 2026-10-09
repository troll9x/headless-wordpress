# TLU-PROD-UNBLOCK-01 — staging investigation and release record

**Updated:** 2026-10-09 (Asia/Saigon)  
**Current decision:** **NO-GO for production**. The staging frontend is updated and the critical E2E suite passed twice, but cold latency, CMS/data readiness, verified backups, restore rehearsal and production routing evidence are still incomplete.
**Baseline:** [`TLU_FINAL_GO_PRODUCTION_REPORT.md`](../TLU_FINAL_GO_PRODUCTION_REPORT.md)
**Execution requirements:** [`prompt-tlu-dieu-tra-va-go-production.md`](../prompt-tlu-dieu-tra-va-go-production.md)

## Scope and repository identity

| Component | Verified identity |
|---|---|
| Frontend repo | `troll9x/headless-wordpress`, branch `release/tlu-production-rc-2026-10-09`, HEAD before this task-record update `e051d3980abda3d2674719ffa8564bfaff391398`. Staging application build uses source commit `df5f93c12fd83db63e33a13e979af58aa1d99821`; later E2E-only commit `e051d3980abda3d2674719ffa8564bfaff391398` changes the optional-map test, not app code. |
| Backend repo | `troll9x/Headless-API`, branch `release/tlu-headless-api-rc-2026-10-09`, commit `d6ffda9a128748fc95d58f620c5f788d2c5c03a8`. Kept separate from frontend; no CRM merge. |
| Backend candidate | Headless API 2.0.9 / schema 4.9; ZIP SHA-256 `ddaba8ebbd53b473a428551f53b866db736bc00488efdbeba8f394242bc67f78`. This artifact is **not installed** on CMS. |
| Staging | `https://dev.nguyenhongson.vn`, A record `103.149.253.223`, service `tlu-next-staging`, Node 22.22.2 / npm 10.9.7. Current systemd working directory `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-df5f93c/university-next`; public response marker `X-TLU-Release: df5f93c`. |
| CMS | `https://cms.tlu.edu.vn`; API reports Headless API 2.0.8 / schema 4.9. |
| Public production | `https://tlu.edu.vn` remains the existing WordPress site. No production code, DNS, database, vhost, plugin or route was changed. |

Untracked `.tmp-capture-har.mjs` and the user-owned prompt file were preserved and not committed.

## Findings, changes, and before/after evidence

### VI/EN raw HTML and article 56787

The historical `/en` mismatch did not recur in the current staging run. Six concurrent raw-HTML requests alternate `/` and `/en` with conflicting `Accept-Language` headers. Both localized roots returned HTTP 200 and the language from the URL. The 15-test E2E suite includes this case and the Vietnamese article ending `56787`; both passed in two consecutive runs against the same staging release.

`src/proxy.ts` sets `x-tlu-route-locale` from the URL, and `src/app/layout.tsx` uses that value for the server-rendered `<html lang>`. The evidence confirms the current behavior; it does not establish the cause of the old intermittent report, which remains **not reproduced**.

### English article raw HTML, images, and browser requests

**Confirmed implementation defect:** `sanitizeCmsHtml(value, mediaBaseUrl)` replaced the default image transform with a media-URL transform. The replacement resolved image URLs but failed to add `loading="lazy"` and `decoding="async"`. The article `Lecturers From Thuyloi University Granted Patent for New Measurement Method` returned body images without `loading`; a browser HAR showed 99 requests, 30.215 s to the `load` event and three `/Portals/` image requests failing with `net::ERR_TIMED_OUT`.

**Fix:** The media-base image transform now both resolves `src`/`srcset` and adds lazy loading/async decoding when editors did not set those attributes. The partner Swiper Virtual module was missing `enabled: true`, so it mounted all 69 images; enabling it reduced the mounted slide image count to at most 20 in E2E. The footer map iframe is created only on demand/near the viewport, but the current CMS has no `url_map` value. The E2E test now verifies the actual optional configuration instead of waiting for a nonexistent map button. Positive map loading is **not tested** until the CMS supplies a valid URL.

| Browser capture | Before | After release `df5f93c` | Result |
|---|---:|---:|---|
| English article | 99 requests; `load` 30.215 s; 3 legacy `/Portals/` image timeouts | 28 requests; DCL 193 ms; `load` 232 ms; last captured request 443 ms; no failed requests | Large improvement for the captured viewport. Below-fold `/Portals/` images are lazy and therefore their availability after scroll is still unverified. |
| Vietnamese homepage | 81–84 requests, 104 `<img>` elements in earlier captures | 47 requests; DCL 352 ms; `load` 2.334 s; last captured request 23.717 s; encoded bytes 7,883,118 | Request count and initial load improved. Nine video requests were aborted as slides changed; the complete media experience and LCP remain unverified. |

The after captures were single desktop-headless samples, not distributions. The HAR files are in the local temp directory and were not committed. Their script did not record LCP, so no LCP pass is claimed. CMS does not configure `url_map`, `footer_email` or the English footer address in the current options response; this is a content/configuration observation, not a frontend failure.

### Cold latency and request fan-out

The homepage assembles 18 data branches in `src/services/homepage.ts`; the root layout separately requests logos, footer and social options. This fan-out depends on the remote CMS during a cold Next data cache. The page uses dynamic request headers for the URL locale, so the HTML itself is not served from a static page cache.

During an early candidate check, two Next processes were running on staging ports 3001 and 3002 while tests were also hitting the same CMS. In that interval, six homepage branches logged their 30-second fallback deadlines. This was a test-induced concurrent load condition; it is not evidence of ordinary single-process CMS behavior. The temporary port-3002 process has since been stopped, leaving only the managed service on 3001.

With the single managed service, the first E2E homepage navigation took 15.1 s and the next run took 1.6 s. The unknown-path route took 14.1 s, then 5.2 s. These are one cold/warm pair from Playwright, not HTML TTFB samples or p95. They still exceed the stated cold objective and vary materially. Ten consecutive public root requests after the release transition returned HTTP 200 with `X-TLU-Release: df5f93c` and workstation-observed elapsed times of 450–649 ms; these are warm checks and do not replace cold samples. A fresh external CMS sample returned health in 2.273 s and schema in 2.003 s; the earlier all-categories query took 3.8–4.2 s in two samples. The exact cold homepage stall is **not isolated**; CMS query/DB/PHP-FPM queue metrics are unavailable.

The captured homepage HAR loads in 2.334 s but has 23.717 s until the last request finishes, largely because video requests are aborted while the carousel changes. This illustrates why a fast DOM/load event alone is not a pass for all resources. No 30-sample/two-round benchmark, formal p50/p95, browser LCP, or concurrency profile has been completed. The cold-performance release gate **fails**.

### Backend release artifact reproducibility

The backend builder previously packaged platform-dependent line endings. `tools/build_release.py` now canonicalizes CRLF to LF for both build and verification; the frontend mirror verifier uses the same normalization. Two builds of the same source produced 96 files and the exact SHA-256 in the manifest.

Checks run: `php -l headless-api.php`, `php tests/gallery-selection.php`, `php tests/options-public-fields.php`, two release builds, and `python scripts/verify-headless-release.py` all passed. This resolves artifact reproducibility only; it does not prove CMS runtime compatibility.

## Database freshness, CMS compatibility, and backup state

Current read-only endpoints returned:

- `GET /wp-json/headless/v1/health`: HTTP 200, Headless API `2.0.8`, 2.273 s from the workstation.
- `GET /wp-json/tlu/v1/schema`: HTTP 200, schema `4.9`, plugin `2.0.8`, 2.003 s.
- `GET /wp-json/headless/v1/options?key=tlu_site_footer`: HTTP 200; the current response has no `url_map`, footer email or English address.
- `GET /wp-json/headless/v1/media-gallery/home?audit_probe=20261009a`: HTTP 200, `X-Headless-Cache: BYPASS`, 14,533 bytes, 2.359 s; selected 15 images, configured limit 15, featured index 6. A normal repeat returned `HIT`, 15 images and the same IDs in 2.028 s. This was a read-only GET: the backend cache key includes query arguments and deliberately bypasses cache for unknown arguments; no shared cache was purged. The CMS 2.0.8 runtime therefore serves the expected 15-item selection for this request.
- Three direct uncached CMS search requests (`X-Headless-Cache: BYPASS`) returned HTTP 200 in 2.074–2.381 s with 0–6 results. Five unique English searches through the staging UI endpoint returned HTTP 200 with results in 3.184–6.767 s. This confirms the user-facing search still exceeds its 2 s budget; the small sample does not isolate how much time is in WordPress search versus the staging-to-CMS path.

The earlier report compared CMS latest post ID `57004` dated 2026-09-26 with old production ID `57290` dated 2026-10-09. That is evidence the CMS snapshot is stale; the current source DB has not been compared. No database import, content sync, migration, or write test was run. No plugin was installed or changed.

The CMS admin previously showed ACF Pro 6.3.11, Polylang 3.8.10, Rank Math 1.0.279, WPCode Lite 2.3.9, Permalink Manager Pro 2.5.1.3 active, and Redis Object Cache 3.0.0 inactive. The Headless API response cache is enabled at TTL 300 seconds. The CMS host's MariaDB recovery/read-only state, PHP-FPM pool, slow SQL, disk I/O and logs remain unknown.

There is no checksum-verified DB + uploads backup or restore rehearsal evidence. The CMS plugin candidate was not installed because the backup and restore path are unverified. Staging frontend rollback files do not count as a CMS or production-data backup.

## Staging verification

| Check | Result and evidence |
|---|---|
| Frontend branch and task commits | Branch `release/tlu-production-rc-2026-10-09`; app fix commit `df5f93c12fd83db63e33a13e979af58aa1d99821`; E2E config test commit `e051d3980abda3d2674719ffa8564bfaff391398`. Both pushed. |
| Lint / TypeScript | PASS on current frontend HEAD: `npm run lint`, `npm run typecheck`. |
| Frontend production build | PASS for app commit `df5f93c`, Next.js 16.3.8 / Turbopack, Node 22.22.2 on staging; compile, TypeScript, static generation and route output completed. Local production build also passed. |
| Active staging identity | PASS: `tlu-next-staging` active with working directory above; public header `X-TLU-Release: df5f93c`; staging A record resolves to `103.149.253.223`. |
| E2E run 1 | PASS 15/15 against `dev.nguyenhongson.vn` on release `df5f93c`. Includes interleaved VI/EN raw HTML, article 56787, language switch, images/carousel, search, SEO, 404, legacy redirect, responsive and unsigned revalidation. Total 59.8 s; homepage 15.1 s. |
| E2E run 2 | PASS 15/15 against the same release. Total 24.0 s; homepage 1.6 s. This demonstrates correctness stability in these two runs, not the required latency budget. |
| E2E run 3 after staging rollback attempt and restoration | PASS 15/15 on `df5f93c`; total 1.2 min; homepage test 20.8 s, optional footer map/image test 29.7 s, 404 test 10.9 s. This verifies the restored release still passes the suite; these are Playwright test durations, not TTFB measurements. |
| Article HAR | 28 requests, zero failed requests, load 232 ms, last captured request 443 ms; one run only. |
| Homepage HAR | 47 requests, load 2.334 s, last captured request 23.717 s, 7.88 MB encoded, nine aborted video requests; one run only. |
| TLS | PASS for observed public HTTPS/API calls using normal certificate validation. Local Node v26.1.0 with `NODE_TLS_REJECT_UNAUTHORIZED` unset fetched CMS health HTTP 200. No TLS bypass flags or insecure Node settings were used. Full origin/certificate-chain audit remains incomplete. |
| Dependency audit | `npm audit` reports 5 high findings in the development lint/build toolchain (`@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`); `npm audit --omit=dev` reports 0. The suggested remediation changes the ESLint Next config version and was not forced. Track the dev-toolchain findings before release. |
| 30 cold + 30 warm samples, two rounds and LCP | NOT RUN; G3 remains FAIL. |
| CMS 2.0.9 compatibility / required ACF and Polylang data | BLOCKED / NOT TESTED. Runtime remains 2.0.8. |
| Database freshness, health, sync and backup restore | BLOCKED / NOT TESTED. |
| Production vhost/Cloudflare/routing and rollback rehearsal | BLOCKED / NOT RUN. Production was not changed. |

## Release gates

| Gate | Status | Evidence still required |
|---|---|---|
| G1 — correct repos/host/release and exact artifacts | PARTIAL | FE app commit is deployed to staging and backend ZIP reproducible. Final release pin/manifest and production artifact remain incomplete. |
| G2 — locale SSR and critical flows | PASS for current staging tests | Two consecutive 15/15 E2E runs; historical mismatch cause remains unconfirmed. |
| G3 — TLS and cold/warm performance | FAIL | Cold samples exceed budget; no 30-sample/two-round distributions, browser LCP, or media-after-scroll verification. |
| G4 — CMS/API compatibility | BLOCKED | Verify plugin 2.0.8 versus 2.0.9 contract and required VI/EN fields; plugin runtime has not been upgraded or exercised on a restorable clone. |
| G5 — latest data and integrity | BLOCKED | Current production/CMS DB comparison, media inventory and non-destructive sync rehearsal are absent; CMS snapshot is known stale. |
| G6 — backups, restore, routing and rollback | BLOCKED | CMS/production backup + isolated restore, production Nginx/Cloudflare/SSL/admin checks and monitoring evidence are absent. The staging rollback attempt to `91fd080` failed to return an upstream response; restore to `df5f93c` succeeded. |

## Access needed for blocked work

The staging aaPanel terminal is available and was used only for the staging frontend (`linux5350`, `103.149.253.223`). Its `/www/wwwroot` site list has no `cms.tlu.edu.vn` directory. Current DNS resolves both `cms.tlu.edu.vn` and `tlu.edu.vn` to `116.101.70.243`, while `dev.nguyenhongson.vn` resolves to `103.149.253.223`. This does not prove whether CMS and old production share a database, but it confirms the open terminal is not the CMS/public host. CMS admin/API access cannot establish MariaDB recovery/read-only state, provide a consistent DB + uploads backup, inspect PHP-FPM/slow-query logs, or prove a restore.

To continue G4 and G6, make an authenticated aaPanel terminal available for the host that actually serves `cms.tlu.edu.vn` and confirm the CMS installation path. First actions there will be read-only host/DB/service inspection and a backup inventory. Before plugin installation or CMS writes, a checksum-verified DB + uploads + plugin/config backup and a successful restore to an isolated DB/path are required. To finish G5, make the old production WordPress data source available read-only so its current post/media state can be compared with the CMS snapshot. Do not paste credentials or keys into chat.

## Staging rollback and production cutover

Before the staging service was switched to `df5f93c`, its previous drop-in was saved at `/www/wwwroot/dev.nguyenhongson.vn-app/backups/20261009/TLU-PROD-UNBLOCK-01/systemd/override.conf.df5f93c-before`; it points to preserved release `91fd080`. A second exact copy of the active `df5f93c` drop-in was saved as `override.conf.df5f93c-active-rollback-rehearsal` before a staging-only rollback attempt. The `91fd080` directory and `.next/BUILD_ID` existed, and systemd showed that working directory after restart, but port 3001 did not return a release header during the bounded health attempts. This rollback rehearsal **failed**; the reason is not isolated. The saved active drop-in was restored, `tlu-next-staging.service` restarted, port 3001 listened, and upstream returned HTTP 200 with `X-TLU-Release: df5f93c`. Public HTTPS then returned HTTP 200 for `/` (`lang=vi`, 663 ms) and `/en` (`lang=en`, 4,632 ms), both marked `df5f93c`. Staging rollback remains unproven until the old snapshot startup issue is diagnosed and a full rollback/forward rehearsal succeeds.

Production DNS, Nginx, Cloudflare, WordPress, CMS plugin and databases remain unchanged. No production release ID exists. Once all gates pass, the deployment sequence is: freeze content; verify final data delta and media; take and checksum DB/files/config backups; validate the isolated restore; deploy the exact tested frontend/backend artifacts; validate Nginx/SSL and CMS/admin/legacy routes; switch only `tlu.edu.vn`; smoke-test VI/EN homepage, article, category, search, media, SEO and redirects; monitor errors and latency for at least 30 minutes. Roll back the public route to the preserved WordPress origin for repeated critical 5xx, incorrect locale/content/media/admin/SEO, TLS failure, DB degradation, or repeated breach of the agreed latency/error budget. Do not restore a database for a frontend-only failure.

**Current outcome:** Staging deployment and E2E correctness work are complete for the recorded frontend app release. The task is not production-ready. G3 fails and G4–G6 remain blocked; no production change has been made.
