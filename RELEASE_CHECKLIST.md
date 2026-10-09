# TLU release candidate checklist

**Status 09/10/2026: NO-GO production.** Candidate is for staging only. A checked box requires retained evidence tied to the exact commit/artifact; a source test cannot stand in for a runtime check.

## Freeze and artifact

- [x] Frontend candidate branch `release/tlu-production-rc-2026-10-09` created from `local-full-work` `c353a360`; source commit `f0d8470cbba291cd87e4ee62636e8257416af00f`; original branches preserved. Record the subsequent report-only HEAD at build time.
- [x] Backend candidate branch `release/tlu-headless-api-rc-2026-10-09`, HEAD `57e718adca8a0a07286d8d51b2bc6a1e7742a5fa`.
- [x] Backend source/mirror/ZIP 2.0.9 schema 4.9 parity: `python scripts/verify-headless-release.py`, 96 files, SHA-256 `67c2acff25544da9163e39d9ebac1f77c92ec99e4e691c20c779f0e57e892a75`.
- [ ] Owner reviews main-only `c84b4cb` behavior and approves how candidate enters protected branch. No automatic merge was done.
- [ ] CI on both exact candidate SHAs passes, including backend ZIP rebuild, lint, tests, build and secret scan. Current results are local only.
- [ ] Formal release tag and protected-branch merge after owner approval.

## Source and content gates

- [ ] Obtain current `home-seo` WPCode/snippet implementation; review route registration, permissions, schema and sanitization; version it without duplicate route registration.
- [ ] Inventory ACF options actually in use, including custom fields outside the known public contract. Approve any field added to `headless_api_allowed_options_fields` before plugin promotion.
- [ ] On staging, validate VI/EN hero, logo, footer, social, favicon, quick links, map, Education taxonomy introduction and child categories, posts, menus, gallery, and media URLs. Verify missing translations route safely.
- [ ] On staging, confirm 15 selected gallery images and that the new attachment validation matches editors' expectations.
- [ ] Verify preview authorization, signed HMAC revalidation (valid, invalid and replay), cache tags and WordPress update hooks on staging. Do not send signed invalidations to production during preparation.
- [ ] Verify search/CMS permissions, TTS provider budget/edge rate limit, trusted proxy IP and CORS at deployed runtime.

## Quality and performance gates

- [x] Local lint/typecheck/production build, backend PHP lint/regression, frontend source tests, artifact parity and production dependency audit pass; details in `PRODUCTION_FIX_REPORT.md`.
- [x] Local browser smoke: 11 passed, 1 staging-only unsigned revalidation check skipped. Windows Node-to-CMS certificate errors remain in logs, so completeness of upstream content is not proven by those browser checks.
- [ ] Deploy exact candidate to `dev.nguyenhongson.vn` through reviewed staging procedure, then rerun `npm run test:e2e` against `E2E_BASE_URL=https://dev.nguyenhongson.vn`. Old staging: 11 passed, 1 failed (English server HTML `lang=vi`).
- [ ] Implement/run controlled CMS timeout and 500 fault tests, valid cache invalidation, and concurrency test on staging. No large production load test.
- [ ] Measure cold/warm VI/EN home, article, search and representative CMS APIs with sample counts, p50/p95 TTFB and total, browser LCP and cache status. Demonstrate agreed 1–2 s target; current evidence does not.
- [ ] Identify source of staging's extra `Cache-Control: no-cache`; verify final edge cache behavior and invalidate after a CMS edit.
- [ ] Review full `npm audit` 5 HIGH development advisories with compatible dependency upgrades; production dependency audit currently has 0.
- [ ] Accessibility/keyboard/media/SEO review on actual staging artifact, including canonical/hreflang, structured data, sitemap, robots, 404 and a representative legacy URL set.

## Infrastructure gate (read-only inspection first)

- [ ] Operator confirms MariaDB `innodb_force_recovery=0`, `read_only=OFF`, successful application write path, and documented recovery history. Do **not** change recovery mode based on this checklist.
- [ ] Operator provides PHP-FPM worker/queue and error log, Nginx vhost/reverse proxy/cache headers, TLS, Cloudflare route/cache rules, CPU/RAM/swap/disk/I/O observations and alerts.
- [ ] Verified recent database and media/config backups, checksum and a documented **successful restore rehearsal**; retain previous frontend artifact and CMS plugin package.
- [ ] Rollback owner, exact routing/config revert steps and trigger thresholds agreed; rehearsed on staging.
- [ ] Confirm public `tlu.edu.vn` routing source, WP-to-Next URL mapping, canonical domain, robots/sitemap contract and release header at edge. Current public evidence resembles WordPress, not the Next candidate.

## Decision

Promotion requires all gates above, approved thresholds, and a final review of the exact candidate SHAs. Until then: **NO-GO production**. Lack of admin/SSH access means infrastructure items are **BLOCKED**, not passed.
