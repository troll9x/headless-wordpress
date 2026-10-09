# TLU-PROD-UNBLOCK-01 — staging investigation and release record

**Updated:** 2026-10-09 (Asia/Saigon)  
**Status:** In progress; staging patch not yet deployed; production cutover not run.  
**Baseline report:** [`TLU_FINAL_GO_PRODUCTION_REPORT.md`](../TLU_FINAL_GO_PRODUCTION_REPORT.md)  
**Task instructions:** [`prompt-tlu-dieu-tra-va-go-production.md`](../prompt-tlu-dieu-tra-va-go-production.md)

## Repository and runtime identity

| Component | Verified identity |
|---|---|
| Frontend | `troll9x/headless-wordpress`, branch `release/tlu-production-rc-2026-10-09`, local base `9e1b747520b22b836c12251c30acd48176ea117a`. The implementation commit for this task will be recorded after staging verification. |
| Backend | `troll9x/Headless-API`, branch `release/tlu-headless-api-rc-2026-10-09`, commit `d6ffda9a128748fc95d58f620c5f788d2c5c03a8` (pushed). |
| Backend candidate | Headless API 2.0.9 / schema 4.9. ZIP SHA-256 `ddaba8ebbd53b473a428551f53b866db736bc00488efdbeba8f394242bc67f78`. |
| Staging runtime at investigation start | `dev.nguyenhongson.vn`, service `tlu-next-staging`, Node 22.22.2 / npm 10.9.7, active worktree `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next`, release response header `X-TLU-Release: 394ee281e147`. |
| CMS | `https://cms.tlu.edu.vn`; public API reported Headless API 2.0.8 / schema 4.9. Candidate 2.0.9 is not installed. |
| Production | `https://tlu.edu.vn` remains the old WordPress site. No production writes, route changes, DB import, or cutover were made. |

The backend remains a separate repository. No CRM merge or combined repository operation was performed. The two existing untracked frontend files `.tmp-capture-har.mjs` and `prompt-tlu-dieu-tra-va-go-production.md` were preserved.

## Findings, evidence, changes, and before/after

### English raw HTML / article 56787

**Observed:** The historical report documented one `/en` raw HTML mismatch. It is not reproducible on the active staging release in the present investigation. The proxy in `university-next/src/proxy.ts` derives `x-tlu-route-locale` from the request path; the root layout reads that header and emits the `<html lang>` attribute. On staging, interleaved VI/EN requests with deliberately conflicting `Accept-Language` values returned HTTP 200, the same release header, `Cache-Control: private, no-cache, no-store`, and the expected raw `<html lang="vi">` or `<html lang="en">`. No response cache was observed that could mix the languages.

**Regression coverage added:** Six concurrent raw-HTML requests alternate `/` and `/en` while sending opposing `Accept-Language` headers. The suite also covers the reported Vietnamese article `...-56787`. The concurrent locale test passed against the active staging release; the article rendered HTTP 200 in browser inspection. The earlier raw-language root cause remains **unconfirmed** because the original mismatch has not recurred and the old release is the only release currently deployed.

**Status:** Current behavior **PASS on observed staging samples**; historical incident **NOT REPRODUCED**, not a proven source fix. The regression suite must be rerun against the new task release.

### Cold latency and request fan-out

**Observed on existing staging release:**

- Frontend cold requests logged WordPress API 10-second timeouts, `AbortError`, and a timed-out `/wp/v2/categories` fetch while assembling the English homepage. The homepage service starts 18 data branches; `src/lib/wordpress/client.ts` limits requests to six concurrent and uses a 10-second per-request deadline. The homepage route and root layout remain request-dynamic, so a cold app cache has no rendered HTML fallback.
- From the staging host, `/wp-json/headless/v1/health` returned HTTP 200; measured DNS 0.051 s, connect 0.232 s, TLS 0.474 s, TTFB 0.938 s. The first measured English all-categories request returned HTTP 200 with TTFB 4.158 s; the immediate repeat returned HTTP 200 with TTFB 3.825 s (N=2 only, not p50/p95). A read-only media search for the legacy image name timed out at 20.001 s with zero bytes. Thus TLS and basic host reachability work, while some CMS queries/media lookup are slow or stall.
- A fresh Chromium context on an English article received the HTML in 0.120 s, DOMContentLoaded at 0.271 s, but the browser `load` event arrived at 30.215 s. The document generated 99 requests. Three images under `https://tlu.edu.vn/Portals/0/P9/VA/2025/` failed `net::ERR_TIMED_OUT` after 30 seconds. The article HTML had `lang="en"`; this is asset completion latency, not slow HTML response.
- On the Vietnamese homepage, an observed warm run returned HTML in 0.173 s, DOMContentLoaded at 0.514 s, load at 2.200 s, with 81 browser requests and 104 `<img>` elements. A preceding first run loaded in 5.738 s. These are individual observations only, not the required 30-sample distributions.
- Public HTML responses include `Cache-Control: private, no-cache, no-store`; the staging Nginx proxy cache was disabled. Therefore public edge cache is not masking slow cold SSR.

**Frontend changes in this task:**

1. Virtualize the partner-logo Swiper slides so offscreen logos do not all mount as image elements.
2. Do not create the Google Maps iframe until the footer is within 250 px of the viewport; retain a localized button to load it immediately.
3. Set CMS rich-text images to `loading="lazy"` and `decoding="async"` when the editor did not already specify these attributes.
4. Use `DOMContentLoaded` in E2E navigation where the test validates document/UI content. Full browser load, image failures, and LCP remain separately measured gates; these changes do not claim that inaccessible legacy images are repaired.

**Before/after:** Source build, E2E, and browser request counts for the task release are pending staging deployment. The three legacy Portal images still require an asset/data remediation; lazy loading improves below-the-fold work but cannot repair the visible image URLs that time out.

### Backend release artifact reproducibility

**Confirmed root cause:** Windows checkout converted plugin source files to CRLF while the existing ZIP contained a different mixed-line-ending representation. The original builder packaged raw working-tree bytes, so rebuilding the same backend commit changed the artifact checksum and failed to reproduce the pinned release.

**Change:** `tools/build_release.py` now canonicalizes CRLF to LF for both build and verification. The frontend mirror verifier applies the same canonical normalization. The backend release ZIP was built twice; both runs reported 96 files and SHA-256 `ddaba8ebbd53b473a428551f53b866db736bc00488efdbeba8f394242bc67f78`. Frontend `scripts/verify-headless-release.py` passes against the updated mirror. Backend commit `d6ffda9a128748fc95d58f620c5f788d2c5c03a8` was pushed to its own release branch.

**Checks:** `php -l headless-api.php`, `php tests/gallery-selection.php`, `php tests/options-public-fields.php`, two consecutive release builds, and frontend mirror verification all pass. Runtime CMS compatibility is still unverified because the 2.0.9 plugin is not installed.

## Database freshness, CMS compatibility, and backup state

The CMS REST API currently identifies runtime plugin 2.0.8/schema 4.9. The CMS latest published post observed in the previous baseline was ID 57004 dated 2026-09-26; old production had ID 57290 dated 2026-10-09. This establishes that the CMS snapshot is stale relative to production. No DB copy, SQL write, content sync, migration, or destructive cache operation was run.

ACF Pro 6.3.11, Polylang 3.8.10, Rank Math 1.0.279, WPCode Lite 2.3.9, Permalink Manager Pro 2.5.1.3, and inactive Redis Object Cache 3.0.0 were observed in CMS admin. Headless API response cache is enabled at TTL 300 seconds. The public all-categories endpoint works but took 3.8–4.2 seconds in two staging-host samples. A media search timed out. The exact DB state, PHP-FPM queue/pool, MariaDB recovery/read-only flags, slow SQL, disk I/O, and CMS host logs have not been inspected.

No restorable CMS/production DB+uploads backup or restore rehearsal has been evidenced. No synchronization between the old production WordPress DB and the separate headless CMS has been rehearsed. The candidate plugin was not installed because backup/restore and CMS host state are unverified.

## Verification run and staging status

| Check | Result |
|---|---|
| Frontend ESLint | PASS before the final E2E navigation-only adjustment; rerun on final commit. |
| Frontend TypeScript | PASS before the final E2E navigation-only adjustment; rerun on final commit. |
| Frontend production build | PASS with Next.js 16.3.8 and local `.env.local`; compile and TypeScript passed. Static generation completed in 87 seconds. Must repeat on staging Node 22.22.2 for the deploy artifact. |
| E2E inventory | 15 tests discovered after adding locale concurrency, 56787, carousel, and lazy-media/map coverage. |
| Full E2E on the old staging release | 9 passed / 4 timed out while `page.goto()` waited for `load`; article media failures were independently observed. This is not a pass and does not validate the task release. |
| Task release staging deploy | NOT YET RUN. |
| 30 cold + 30 warm samples, two rounds, and browser LCP | NOT YET RUN. |
| Production CMS plugin 2.0.9 compatibility | BLOCKED / NOT TESTED. |
| DB freshness/sync, DB health, backup and restore rehearsal | BLOCKED / NOT TESTED. |
| Production config/cutover/rollback rehearsal | NOT RUN. |

## Release gates

| Gate | Current status | Evidence needed to clear |
|---|---|---|
| G1 — correct FE/BE candidates and reproducible artifacts | PARTIAL | Backend artifact fixed and pushed; commit FE task release, update pin, and deploy verified task release. |
| G2 — VI/EN raw HTML and critical flows | PARTIAL | Current release samples pass; run all 15 tests twice on the same deployed release, including conflicting-header concurrency and article 56787. |
| G3 — TLS and performance budgets | FAIL / NOT TESTED | Legacy Portal images time out; category query 3.8–4.2 s; 30 cold and 30 warm samples for each required route/state, browser LCP, and bounded concurrency are outstanding. |
| G4 — CMS/API compatibility | BLOCKED | Install/validate 2.0.9 only after restorable CMS backup; verify ACF, Polylang, SEO, options, menus, media/gallery 15, cache invalidation and existing snippets. |
| G5 — latest content and data integrity | BLOCKED | Compare DBs and media inventories; rehearse a non-destructive sync with IDs/translations/metadata/media/SEO checksums. CMS is known stale. |
| G6 — restore, cutover, observability, rollback | BLOCKED | Obtain and restore-test backups; inspect production Nginx/Cloudflare/TLS and health/logging; rehearse exact rollback without changing public production. |

## Exact access needed to continue blocked work

The staging aaPanel terminal is available and was used for read-only checks. It does not expose the separate CMS/old-production database host. CMS admin browser access alone cannot establish MariaDB recovery/read-write state, take a consistent DB+uploads backup, inspect PHP-FPM/slow-query logs, or prove restore.

To continue those gates, open the aaPanel terminal for the host serving `cms.tlu.edu.vn` (not the staging host) and leave an authenticated terminal ready. The next commands will be scoped read-only to that CMS install to identify its actual host/service, PHP-FPM and MariaDB state, and backups. Before any plugin install or database/content write, first create a checksum-verified DB + uploads + plugin/config backup and rehearse restore into an isolated directory/database. Production data-source access is separately required to compare latest production content and media. Do not paste passwords or keys into chat.

## Cutover and rollback status

Production DNS, vhosts, databases, content, plugin installation, and old WordPress remain unchanged. There is no production release ID. The staging release active at investigation start remains `394ee281e147`; after the task release is deployed, record its commit and observed response header here.

Cutover remains blocked until G1–G6 pass. When clear, preserve the old WordPress site and rollback route, freeze content edits, take a final verified backup, sync/compare content, switch the production route, then run VI/EN article/category/search/media and TLS smoke checks while watching 5xx, latency, PHP-FPM, DB and cache metrics. Roll back the frontend route to the preserved WordPress origin if critical routes return 5xx/404, raw locale/SEO is wrong, API/data mismatch appears, or the latency/error budget is exceeded. No DB restore is part of a frontend-only rollback.
