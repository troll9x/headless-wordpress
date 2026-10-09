# TLU deployment and rollback runbook — candidate only

**No production operation has been performed.** This runbook requires an operator to confirm actual aaPanel/Nginx paths and a release owner to approve promotion. Never run these commands on another site. The CMS plugin currently serves data to both public and staging frontends, so plugin promotion on `cms.tlu.edu.vn` has shared impact.

## 1. Read-only evidence to obtain first

Run each on the appropriate **school CMS host** through an operator with read permission; redact secrets and public IPs if needed. Report command output, time and host identity. These commands do not change MariaDB or server configuration.

```bash
mysql -NBe "SHOW VARIABLES WHERE Variable_name IN ('innodb_force_recovery','read_only','super_read_only');"
mysql -NBe "SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Slow_queries');"
php -v
nginx -v
free -h
df -h
uptime
```

The `mysql` commands may require an interactive login or an operator's existing protected client configuration; **do not paste a database password or `wp-config.php`**. Ask the operator for a redacted PHP-FPM pool status, Nginx vhost and cache rules for `cms.tlu.edu.vn` and `dev.nguyenhongson.vn`, Cloudflare route/cache rule export, 24 h error/latency graphs, recent backup timestamp/checksum and restore rehearsal record. `innodb_force_recovery=6` was reported historically; current value is unknown. Any nonzero recovery value stops release planning pending a database recovery plan.

## 2. Freeze exact candidate

On a clean checkout, record frontend and backend full commit SHAs, working tree status, Node/PHP versions, artifact SHA and CI run links. Candidate backend SHA and ZIP checksum are recorded in `release/HEADLESS_API_CANDIDATE.json`. `python scripts/verify-headless-release.py` must report 96 matching files. Build frontend with the **staging** secrets injected by the server's secret manager and an explicit `TLU_RELEASE_ID` equal to the candidate commit short SHA. Do not commit `.env.local` or credentials. Keep the currently served frontend artifact and plugin ZIP with their own checksums.

The standalone `Headless-API` Git repository is the source of truth for plugin packaging; the frontend mirror is pinned evidence. Build with `python tools/build_release.py` in that repository, then compare its ZIP SHA to the pinned checksum. If bytes differ, stop; do not upload an untracked ZIP. No database migration is included.

## 3. Staging deployment sequence (after approval)

1. Confirm backups and restore rehearsal; record current CMS plugin version and staging frontend release identifier. Verify staging is isolated from the public routing path, while recognizing it shares CMS.
2. Review the 2.0.9 plugin contract against the active CMS ACF fields and the unknown `home-seo` snippet. Resolve duplicate/unknown route risk first. Promote the plugin only in an approved CMS maintenance window with the previous ZIP immediately available. Confirm `/wp-json/tlu/v1/schema` reports 2.0.9/schema 4.9 and smoke the options/gallery/posts/categories/menu APIs in both languages. If not approved to change shared CMS, keep plugin at 2.0.8 and mark the combined candidate unvalidated.
3. Build and stage the exact Next artifact on `dev.nguyenhongson.vn` using its existing deployment process. Switch only the staging site after a local health check; retain previous staging artifact and process configuration. Verify `X-TLU-Release`, `<html lang="en">` on `/en`, TLS and cache headers from the external URL.
4. Run `E2E_BASE_URL=https://dev.nguyenhongson.vn npm run test:e2e` from the frontend workspace, plus backend smoke, signed staging revalidation, controlled timeout/500 fault injection and low-volume concurrency. Inspect actual content and image GETs; a fallback-generated HTTP 200 is insufficient.
5. Measure cold and warm page/API timings and browser LCP using `python scripts/benchmark-http.py --samples 5 URL...` plus browser HAR/Lighthouse. Note cache HIT/MISS, request count, DNS/TCP/TLS/TTFB/total, p50/p95, client location and candidate SHA. Test VI/EN home, article, categories, search and Education. Compare with baseline under equivalent cache/network conditions.
6. Review SEO/URL and infrastructure gates in `RELEASE_CHECKLIST.md`. Keep production routing unchanged until release owner approves a GO based on exact staging artifact and a rehearsed rollback.

## 4. Production promotion (requires separate approval)

Schedule an operator and observer, freeze content/config changes, capture current route and cache configuration, confirm fresh backups and alerting, and promote only the previously verified artifact checksums. Apply a reviewed routing switch for `tlu.edu.vn` with documented cache purge order. Check homepage VI/EN, article, search, CMS data, media, legacy redirects, 404, canonical/hreflang, robots/sitemap, signed invalidation and 5xx/latency logs from outside the server. Continue observation through an agreed window. This section is a plan, **not authorization to execute**.

## 5. Rollback

Before any switch, operator must know the exact previous frontend artifact, CMS plugin package/version, route config snapshot and backup restore point. First revert the frontend route/artifact to the previous known-good state and verify VI/EN/search/SEO. If the plugin itself caused regression, restore the previous plugin **only after checking schema/backward compatibility**; do not attempt database downgrade or ad hoc migration. Purge only affected edge caches after the stable route is restored. Record timestamps, affected URLs, error rates and recovery evidence.

Trigger immediate rollback if a critical VI/EN route or content API repeatedly returns 5xx, SEO canonical/sitemap/robots changes threaten indexing, a large class of media/content disappears, authorization or secret exposure is observed, or database write/read health degrades. A practical **proposed** stop rule is any persistent critical-route 5xx for 5 minutes or p95 above the approved latency budget for 15 minutes; SRE/owner must approve numeric thresholds before promotion. If the release cannot be verified within the planned window, return to the prior artifact. Never “fix” a failing database by toggling `innodb_force_recovery` or restarting it without its own recovery plan.
