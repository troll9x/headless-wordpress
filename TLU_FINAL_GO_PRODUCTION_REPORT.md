# TLU final staging deployment and production go/no-go

**Audit date:** 2026-10-09 (Asia/Saigon)  
**Decision:** **NO-GO for production**. The frontend release candidate is deployed on the existing staging domain, but staging E2E is not fully green, cold search latency is excessive, CMS runtime is still on plugin 2.0.8, and current production data/backup/infrastructure readiness is unverified.

## 1. Scope and safety boundary

The public WordPress site `https://tlu.edu.vn` is the live old production system. `https://cms.tlu.edu.vn` is a separate Headless WordPress installation using a 2026-09-26 database snapshot. `https://dev.nguyenhongson.vn` is the existing Next.js staging site. No production route, DNS, database, source, plugin, or service was changed. No database migration, import, or write test was run.

The staging server is the aaPanel host at `103.149.253.223`; the CMS and production DB hosts are separate or at least not proven to be this host. Staging host observations must not be treated as CMS/production database health.

## 2. Git identity and artifacts

| Repository | Branch and commit | Status |
|---|---|---|
| Frontend `troll9x/headless-wordpress` | `release/tlu-production-rc-2026-10-09`, source `f0d8470cbba291cd87e4ee62636e8257416af00f`; deployed staging tree `394ee281e1475d073211f39d446e8b654b4f5021`; final report/docs commit `373983f59e378cb81c491b5d069c712501f604f2` | Pushed to GitHub; not merged or tagged. The later commit changes documentation only, not the staged app source. Local worktree has pre-existing untracked `.tmp-capture-har.mjs`; it was not staged. |
| Backend `troll9x/Headless-API` | `release/tlu-headless-api-rc-2026-10-09`, `57e718adca8a0a07286d8d51b2bc6a1e7742a5fa` | Pushed to GitHub; not merged or tagged. |

Backend artifact candidate is Headless API 2.0.9/schema 4.9, SHA-256 `67c2acff25544da9163e39d9ebac1f77c92ec99e4e691c20c779f0e57e892a75`, pinned in `release/HEADLESS_API_CANDIDATE.json`. That candidate is not installed on CMS.

## 3. Staging deployment evidence

- Existing aaPanel reverse proxy is `dev-next`, path `/`, target `http://127.0.0.1:3001`; proxy cache is disabled. Node is v22.22.2 / npm 10.9.7.
- aaPanel dashboard on the staging host showed 6 CPU, about 5.9 GB RAM with about 55% in use, and a 75 GB root disk at about 34% used (roughly 48 GB free). It listed Nginx 1.24 and MariaDB 10.11.10 as installed services. These are staging-host observations only; no PHP-FPM, MariaDB recovery/read-write, I/O, or production-host status was verified.
- Candidate was fetched into a separate Git worktree: `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next`. The old active source remains at `/www/wwwroot/dev.nguyenhongson.vn-app/repo/university-next` for rollback.
- Staging `.env.production.local` was already present, mode `600`; its non-secret public settings point the frontend to `https://cms.tlu.edu.vn` and the canonical staging URL to `https://dev.nguyenhongson.vn`. No values were printed into this report.
- `npm ci` installed 400 packages. npm reported 5 high-severity findings in the full dependency tree; a previous production-only audit (`npm audit --omit=dev`) found 0. The 5 findings need review; no forced dependency changes were made.
- Production build command: `runuser -u www -- env TLU_RELEASE_ID=394ee281e147 npm run build`. Next.js 16.3.8 build compiled successfully, TypeScript passed, and route generation completed.
- Only `tlu-next-staging.service` was switched. It remains `User=www`, binds `127.0.0.1:3001`, and is active. A systemd drop-in sets the candidate `WorkingDirectory` and non-secret release ID. The original unit was copied to `/www/wwwroot/dev.nguyenhongson.vn-app/backups/20261009/systemd/tlu-next-staging.service.original` before the change.
- Smoke checks returned HTTP 200. The upstream response and later public response included `X-TLU-Release: 394ee281e147`. A direct upstream curl returned `<html lang="en">` for `/en`; one earlier external E2E response returned `<html lang="vi">`, and a focused E2E retry later timed out. Locale behavior is not considered consistently verified.

### Staging deployment rollback

The old app tree and original unit are retained. To revert only the staging service, restore the original unit and remove the drop-in created for this deployment, then reload and restart `tlu-next-staging.service`. Keep the Nginx reverse proxy at its existing target `127.0.0.1:3001`; no Nginx or DNS change is required. Verify the old release header and both language homepages after rollback. This rollback was prepared but not rehearsed.

## 4. Verification results

| Check | Status | Evidence and limits |
|---|---|---|
| Candidate build | **PASS** | Build output: Next 16.3.8; compile, TypeScript and route generation succeeded. |
| Staging service/release identity | **PASS** | `systemctl status tlu-next-staging.service --no-pager` showed active; public/upstream header `X-TLU-Release: 394ee281e147`. |
| Staging E2E | **FAIL** | `E2E_BASE_URL=https://dev.nguyenhongson.vn npm run test:e2e`: 11 passed, 1 failed. Failure: raw `/en` HTML expected `lang="en"`, received `lang="vi"`. A focused rerun timed out after 45 seconds before finishing. A separate later curl returned `lang="en"`; this inconsistency needs a deterministic passing E2E run. |
| Content and UI smoke | **PASS with limits** | The other 11 E2E checks passed: category introductions/listing, VI/EN article routes, mission pages/navigation, language switch, hero/gallery image rendering, search page/API, SEO/robots/sitemap, 404, one legacy redirect, responsive overflow, and unsigned revalidation rejection. This does not validate every ACF field or all media downloads. |
| Local candidate E2E | **BLOCKED / NOT COMPLETED** | A local E2E run was stopped after repeated Node TLS errors (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), CMS timeouts and connection resets. It is not a passing test result. |
| CMS health/plugin | **PARTIAL PASS** | From the staging host, `GET https://cms.tlu.edu.vn/wp-json/headless/v1/health` returned HTTP 200 and `{"ok":true,"plugin":"Headless API","version":"2.0.8"}`; one sample took 2.157 s TTFB. Runtime is 2.0.8, not the 2.0.9 candidate. |
| CMS schema | **PASS with severe latency risk** | Correct endpoint `GET https://cms.tlu.edu.vn/wp-json/tlu/v1/schema` returned HTTP 200, 19,241 bytes, schema `4.9`, plugin version `2.0.8`. First cold request took about 121 s; a repeat took 2.885 s. `/wp-json/headless/v1/schema` is not the schema route and returned 404. |
| API 2.0.9 integration | **BLOCKED** | No authenticated CMS access and no verified CMS plugin backup/restore evidence. The plugin was not upgraded. `home-seo` implementation and CMS ACF/Polylang field inventory are not verified. |
| Production DB freshness/migration | **BLOCKED** | Current production database and 2026-09-26 snapshot were not compared. No database dump, row/content diff, media inventory, backup checksum, or restore rehearsal was available. No migration was run. |
| MariaDB recovery/read-write | **BLOCKED** | The staging aaPanel dashboard lists MariaDB 10.11.10, but this does not prove which WordPress DB it serves or its read/write/recovery state. No MariaDB setting was changed. Current production/CMS values are unknown. |
| Nginx/PHP-FPM/Cloudflare production | **BLOCKED** | Staging Nginx reverse-proxy target was identified; PHP-FPM, CMS/production Nginx vhosts, Cloudflare cache/routing and production logs were not available for review. |
| Backup/restore | **FAIL / NOT VERIFIED** | Frontend rollback source and service unit backup exist. No verified CMS/production database + media backup or restore rehearsal was provided. |
| Production cutover | **NOT RUN** | Public production routing and the old WordPress site were left unchanged. |

Read-only production URL check: `https://tlu.edu.vn/robots.txt` returned a sitemap reference to `https://tlu.edu.vn/sitemap_index.xml`, consistent with the existing WordPress setup. A `HEAD /` from the workstation timed out after 15 seconds with no bytes; this is a network observation, not enough evidence to conclude the public site is down. Earlier audit evidence also showed WordPress sitemap output. No production configuration was changed.

## 5. Candidate staging performance

Three sequential external `curl` samples per route were collected from the workstation after deployment. The table shows median and observed range; with only three samples, the maximum is not a statistically reliable p95.

| Route | Median TTFB | Median total | Observed range / note |
|---|---:|---:|---|
| `/` | 0.148 s | 0.309 s | TTFB 0.148–0.166 s; total 0.297–0.315 s |
| `/en` | 0.161 s | 0.329 s | TTFB 0.153–0.167 s; total 0.309–0.742 s |
| English article | 0.161 s | 0.225 s | TTFB 0.155–0.162 s; total 0.213–0.236 s |
| `/en/search?q=water` | 0.165 s | 0.228 s | First request 17.875 s TTFB / 17.940 s total; next two 0.146–0.165 s TTFB |

Search’s cold result violates the 1–2 second objective. The CMS schema endpoint also returned a cold response in about 121 s and a repeat in 2.885 s; the health endpoint took 2.157 s. Warm responses are not enough to claim the target is met. No HAR, browser LCP, cache HIT/MISS analysis, concurrent load test, or enough samples for p95 was captured. The high outliers indicate CMS cold-path latency or a network/runtime stall; the exact cause is not yet isolated.

## 6. Release gate summary

| Gate | Status |
|---|---|
| Release branches and exact candidate artifacts | **PASS** |
| Frontend candidate on existing staging | **PASS** |
| Candidate E2E and deterministic VI/EN SSR | **FAIL** |
| Backend 2.0.9 deployed and compatible with current CMS data | **BLOCKED** |
| Performance target, including cold search and LCP | **FAIL / NOT TESTED** |
| Latest production data on headless CMS | **BLOCKED** |
| Database health, backups and restore | **BLOCKED** |
| Cutover config and rehearsed rollback | **BLOCKED** |
| Production changes | **NOT RUN** |

## 7. Required work before production

1. Resolve the English SSR mismatch; rerun the full staging E2E suite to a clean 12/12, and repeat it to confirm stable results.
2. Investigate the cold search path and CMS API latency. Measure at least 20 cold/warm samples per key route and record p50/p95, TTFB, total time, cache state and browser LCP. Agree a measurable budget before claiming 1–2 seconds.
3. With CMS administrator access, capture a restorable backup of the Headless CMS plugin/files/database and verify the actual schema endpoint. Review the `home-seo` snippet and ACF allowlist. Install 2.0.9 only in a controlled CMS maintenance window, then validate posts, pages, categories, VI/EN options, 15-item gallery and media URLs.
4. Obtain read-only evidence from the actual old production and Headless CMS database hosts: database identity/prefix without credentials, `innodb_force_recovery`, `read_only`, connections/slow queries, disk/RAM/CPU/I/O and relevant logs. Confirm production data freshness beyond the 2026-09-26 snapshot.
5. Design and rehearse a non-destructive data synchronization that preserves headless-specific plugin/ACF/Polylang/WPCode settings while comparing posts, pages, taxonomies, metadata, media IDs/paths, translations, users, menus and SEO. Require checksums/counts and a rollback point.
6. Obtain current CMS/production backups and complete a successful restore rehearsal. Review the public production Nginx/Cloudflare/SSL, canonical and legacy URL behavior, `/Portals/` media, robots/sitemaps, monitoring and incident thresholds.
7. After all gates pass, request a separate release-owner approval for production cutover. This report is not that approval.

## 8. Production cutover and rollback plan

Production cutover is not authorized by this report. When separately approved: freeze content edits; take verified database/files/media/config backups; sync and compare production content into the separate Headless CMS without replacing its custom settings; deploy the exact tested frontend artifact; review Nginx and Cloudflare changes in advance; preserve old WordPress and its database; switch only `tlu.edu.vn`; smoke VI/EN home, article, category, search, media, redirects, SEO and CMS admin; monitor 5xx/latency and cache behavior.

Rollback trigger: repeated 5xx on a critical route, incorrect/missing content or media, broken language/SEO/legacy URLs, secret exposure, database health degradation, or latency exceeding an owner-approved threshold. Roll back the domain route/frontend to the preserved WordPress deployment first; restore CMS/plugin/data only if evidence shows it caused the issue and the restore point is verified. Purge only the affected cache after stable routing is restored. Do not alter DNS or database recovery mode as an improvised rollback.

## 9. Final decision

**NO-GO for production.** Staging now runs the frontend RC and can continue to be used for fixes and retesting. Production WordPress, its database, DNS, and routing remain unchanged. The immediate blockers are unstable English SSR E2E, a 17.9-second cold search response, CMS plugin runtime still at 2.0.8, stale/unverified CMS data, and missing database/backup/restore/cutover evidence.
