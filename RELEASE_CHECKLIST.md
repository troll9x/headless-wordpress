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

- [x] Read-only CMS runtime version/schema probe: health reports Headless API 2.0.8; `/wp-json/tlu/v1/schema` reports schema 4.9. One cold schema request took about 121 s and a repeat 2.885 s. This does not validate candidate 2.0.9.
- [ ] Promote and validate backend 2.0.9 only after authenticated CMS backup/restore evidence and ACF/WPCode review; CMS is still serving 2.0.8.
- [ ] Obtain current `home-seo` WPCode/snippet implementation; review route registration, permissions, schema and sanitization; version it without duplicate route registration.
- [ ] Inventory ACF options actually in use, including custom fields outside the known public contract. Approve any field added to `headless_api_allowed_options_fields` before plugin promotion.
- [ ] On staging, validate VI/EN hero, logo, footer, social, favicon, quick links, map, Education taxonomy introduction and child categories, posts, menus, gallery, and media URLs. Verify missing translations route safely.
- [ ] On staging, confirm 15 selected gallery images and that the new attachment validation matches editors' expectations.
- [ ] Verify preview authorization, signed HMAC revalidation (valid, invalid and replay), cache tags and WordPress update hooks on staging. Do not send signed invalidations to production during preparation.
- [ ] Verify search/CMS permissions, TTS provider budget/edge rate limit, trusted proxy IP and CORS at deployed runtime.

## Quality and performance gates

- [x] Local lint/typecheck/production build, backend PHP lint/regression, frontend source tests, artifact parity and production dependency audit pass; details in `PRODUCTION_FIX_REPORT.md`.
- [x] Local browser smoke: 11 passed, 1 staging-only unsigned revalidation check skipped. Windows Node-to-CMS certificate errors remain in logs, so completeness of upstream content is not proven by those browser checks.
- [x] Deploy exact candidate to existing `dev.nguyenhongson.vn` service from separate worktree; build passed, service active, and `X-TLU-Release: 394ee281e147` verified. Previous app tree and original systemd unit remain available for staging rollback.
- [ ] Staging E2E: 11 passed, 1 failed because the English homepage response had server HTML `lang=vi`; focused rerun timed out at 45 s. Direct upstream and later public curl returned `lang=en`, so behavior is inconsistent and remains a blocker.
- [ ] Implement/run controlled CMS timeout and 500 fault tests, valid cache invalidation, and concurrency test on staging. No large production load test.
- [ ] Three-sample staging curl observations: home VI median TTFB/total 0.148/0.309 s; home EN 0.161/0.329 s; English article 0.161/0.225 s; `/en/search?q=water` 0.165/0.228 s median but first response 17.875/17.940 s. These samples cannot establish p95; no HAR/LCP captured and the 1–2 s target is not met consistently.
- [ ] Identify source of staging's extra `Cache-Control: no-cache`; verify final edge cache behavior and invalidate after a CMS edit.
- [ ] Review full `npm audit` 5 HIGH development advisories with compatible dependency upgrades; production dependency audit currently has 0.
- [ ] Accessibility/keyboard/media/SEO review on actual staging artifact, including canonical/hreflang, structured data, sitemap, robots, 404 and a representative legacy URL set.

## Infrastructure gate (read-only inspection first)

- [ ] Operator on the actual CMS/production database host confirms MariaDB `innodb_force_recovery=0`, `read_only=OFF`, successful application write path, and documented recovery history. The staging aaPanel host is separate; its MariaDB status does not establish CMS/production database health. Do **not** change recovery mode based on this checklist.
- [ ] Operator provides PHP-FPM worker/queue and error log, Nginx vhost/reverse proxy/cache headers, TLS, Cloudflare route/cache rules, CPU/RAM/swap/disk/I/O observations and alerts.
- [ ] Verified recent database and media/config backups, checksum and a documented **successful restore rehearsal**; retain previous frontend artifact and CMS plugin package.
- [ ] Rollback owner, exact routing/config revert steps and trigger thresholds agreed; rehearsed on staging.
- [ ] Confirm public `tlu.edu.vn` routing source, WP-to-Next URL mapping, canonical domain, robots/sitemap contract and release header at edge. Current public evidence resembles WordPress, not the Next candidate.

## Decision

Promotion requires all gates above, approved thresholds, and a final review of the exact candidate SHAs. Until then: **NO-GO production**. Lack of admin/SSH access means infrastructure items are **BLOCKED**, not passed.
