# Production blocker remediation — 09/10/2026

## Scope and release identity

This is a source candidate, not a production deployment. Frontend started from `local-full-work` at `c353a360db28238e60a60b0c9a8af9aa349fa674`; source changes are committed as `f0d8470cbba291cd87e4ee62636e8257416af00f` on `release/tlu-production-rc-2026-10-09`. Backend started from `main` at `c7c91e25da39fb67611592440968845203a84d22`; work is on `release/tlu-headless-api-rc-2026-10-09` at `57e718adca8a0a07286d8d51b2bc6a1e7742a5fa`. The frontend report commit follows its source commit; record both when building. Neither branch has been merged, tagged, pushed or deployed.

## Branch reconciliation

Frontend merge base is `69e5966606c4678d5e1a389a47cedc4d5b25f36d`. `local-full-work` had 28 unique commits; `main` had `c84b4cb` (a 147-file feature snapshot) and `e4fad1d` (README). The local branch has subsequent fixes for bilingual routes, WP caching, gallery, homepage, SEO and deployment. The main-only static `university-next/src/app/favicon.ico` is superseded by CMS favicon handling. The same Next source paths were changed on both sides; an automatic merge would choose behavior without business review. Candidate is based on local work and preserves its features. This is a **selective non-merge**; owner must review the main-only snapshot before protected-branch integration. Pre-existing `.tmp-capture-har.mjs` was left untracked. `next.config.ts` had a pre-existing worktree marker with no content diff before this task.

## Changes made

| Area | Files | Result |
|---|---|---|
| Backend canonical source | Sibling `Headless-API/headless-api.php`, `includes/**`, `CHANGELOG.md`, `tools/build_release.py`, `dist/headless-api-2.0.9.zip` | Synchronized deployed 2.0.8 source into backend Git, applied the 2.0.9 gallery selection fix, retained 15 valid curated images even if outside organizer category, and built a deterministic 96-file ZIP. Version 2.0.9, schema 4.9. |
| Backend public options | `Headless-API/includes/Services/OptionsService.php`, tests | Explicit per-page ACF field allowlist, including filtering old cache entries. Unknown fields/pages are denied; existing public field names remain supported. Site-specific additions use `headless_api_allowed_options_fields`. |
| Mirrored candidate | `release/headless-api/**`, `release/headless-api-2.0.9.zip`, `release/HEADLESS_API_CANDIDATE.json`, `scripts/verify-headless-release.py` | Frontend repo pins backend commit and SHA-256. CI compares the ZIP to the mirror. Old artifacts remain for reference/rollback. |
| Release identity/locale | `university-next/next.config.ts`, `src/app/layout.tsx` | Adds non-secret `X-TLU-Release`; initial HTML language comes from locale determined by proxy, including English server HTML. |
| Article latency | `university-next/src/app/[...path]/page.tsx`, `src/components/bai-viet/ChiTietBaiViet.tsx` | Related posts, sidebar and banner load concurrently and stream after main article content. Recruitment article behavior remains tied to its required ACF payload. |
| Home SEO resilience | `src/lib/seo/home-override.ts`, `src/lib/wordpress/seo.ts`, `scripts/test-home-seo-fallback.mjs` | Malformed/empty SEO override safely falls back to route/Rank Math values. Only sanitized title/description are accepted. This does **not** replace or assert ownership of the unknown CMS route. |
| Tests/CI | `university-next/tests/e2e/public-site.spec.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.gitignore`, `package*.json`, `.github/workflows/**`, `scripts/benchmark-http.py` | Browser smoke suite, artifact parity and bounded HTTP timing probes. Lint ignores generated Playwright reports. |

Backend source commits: `a21840f` source sync, `3d5dd14` deterministic 2.0.9/gallery, `57e718a` options allowlist. Artifact SHA-256: `67c2acff25544da9163e39d9ebac1f77c92ec99e4e691c20c779f0e57e892a75`. The ZIP was rebuilt twice with identical bytes and verified against all 96 tracked release files. The CMS is still reporting 2.0.8; compatibility of 2.0.9 **at CMS runtime** remains untested.

## Test evidence

| Check | Result and limit |
|---|---|
| Backend PHP syntax | PASS: 96/96 release PHP files. |
| Backend isolated regression | PASS: `tests/gallery-selection.php` and `tests/options-public-fields.php`. Gallery test covers 15 valid selected media plus private/missing-URL rejection; options test covers unknown field/page and old transient. |
| Frontend source checks | PASS: `npm run lint`, `npm run typecheck`, `npm run build`; Next 16.3.8 build emitted all expected routes. |
| Frontend PHP and Node tests | PASS: hooks, response cache, priority posts, search proxy, rate-limit cleanup; home SEO fallback 2/2; existing security tests 2/2. |
| Artifact | PASS: `scripts/verify-headless-release.py` compared 96 files; SHA above. |
| Dependency audit | PASS with scope: `npm audit --omit=dev --json` found 0 vulnerabilities. Full audit still reports 5 HIGH in development dependencies. |
| E2E | Local: 11 passed, 1 staging-only check skipped; gallery assertion checks 15 rendered tiles. Old staging: 11 passed, 1 failed initial English SSR `<html lang>`; focused gallery count 15 passed. Staging has not received candidate. |

Local browser tests use the public CMS and intermittently log `UNABLE_TO_VERIFY_LEAF_SIGNATURE` from Node on this Windows machine. A rendered fallback/200 does not prove upstream data completeness; test under the target server CA configuration before release.

## Performance observations

The previous audit observed one staging English article request at **9.546 s** and search at **3.403 s**. New bounded repeated samples on the still-old staging build gave warm article **0.205–0.225 s** and search **0.116–0.146 s**; this difference is cache/runtime state, not evidence of a deployed optimization. A direct CMS WordPress post endpoint took **4.93, 4.82, 1.96 s** in three requests. Before article streaming, a locally served production build took **6.657 s** for VI home, **5.894 s** for EN home and **2.634 s** for search (single cold observations). After streaming, three *warm* local article responses took **260/33/31 ms total**, with Next data cache already populated. Cold p50/p95, LCP and candidate staging before/after remain **NOT TESTED**. The 1–2 s user target is **not proven**.

The app's local search response carried its public cache policy. Staging returned an additional `no-cache` header. This points to a layer beyond app source, but Nginx/Cloudflare access is required to identify which one. No cache TTL was increased to conceal CMS latency.

## Risks and open blockers

1. `/wp-json/headless/v1/home-seo` exists publicly on CMS but its route registration is absent from both audited repos. The WPCode admin page redirected to login. Need the active snippet source or an authenticated read-only view before migrating it to Git; registering a duplicate route would be unsafe.
2. Candidate backend 2.0.9 alters gallery selection semantics and options field exposure. Integration against CMS ACF field definitions and Polylang data must precede release. Any extra options fields used outside the known frontend contract need explicit review and allowlisting.
3. Production `tlu.edu.vn` currently has WordPress HTML fingerprints, WordPress sitemap XSL and no Next release header. This supports the inference that the public host has not cut over to this candidate; reverse proxy/edge configuration is not available to confirm the origin.
4. Staging has not received this candidate. Its English SSR language still fails, and its search cache headers conflict. Full signed revalidation, CMS 500/timeout fault injection, cold/LCP/load and backup restore tests are outstanding.
5. MariaDB recovery/read-write mode, Nginx, PHP-FPM, Cloudflare, resources, backup and restore verification are **BLOCKED** by missing read-only access. Prior `innodb_force_recovery=6` is a reported historical concern, not a newly verified current value.

**Release conclusion: NO-GO for production.** The source candidate is prepared for controlled staging validation, subject to the gates in `RELEASE_CHECKLIST.md`.
