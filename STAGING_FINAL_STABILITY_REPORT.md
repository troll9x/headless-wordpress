# Staging stability report — 2026-10-12

**Verdict: staging is functionally improved, but NOT READY for production.** The active staging service is running frontend release `9c094fc740e8cc7b0c5fcb7babd9bbc1a7332615` from branch `fix/staging-stabilization-20261012`. The agreed performance gate is not met, and the CMS search contract cannot provide exact language-specific totals. No production site, CMS code, database, DNS, or shared MariaDB service was changed.

## Issues and fixes

| ID | Confirmed cause | Frontend result | Remaining limit |
| --- | --- | --- | --- |
| FE-001 False-empty search | CMS Headless/WPX endpoints return `items:[]` although core `/wp/v2/search` returns published posts. The installed Headless plugin delegates to a legacy remote backend when WPX is absent. | Live and full search now use core results, with original CMS permalink locale validation. Real VI/EN flows pass on staging. | Core search ignores `lang` (absent from REST schema). Cross-locale results are rejected, but totals are cross-locale upper bounds and pagination may be sparse. A CMS endpoint with actual language filtering is required. |
| FE-002 Search UX | Enter selected the first suggestion; stale, malformed, and failed requests could look empty; old page-size handling skipped an item. | Explicit arrow selection, visible empty/error states, stale-response cancellation, schema checks, and consistent pagination pass on staging. | A query whose first CMS page contains only the wrong locale returns a visible upstream error (502), not a false empty or wrong-language article. |
| FE-003 Language switch | Persistent header lock was not reset; hardcoded category paths mismatched CMS translations. | VI↔EN, translated categories, search query preservation, untranslated article fallback, progress, and retry pass on staging. | Translation API availability still depends on CMS. |
| FE-004 Homepage/navigation | Baseline HTML response was 5.1–16.6 s. The CMS homepage snapshot and two menu endpoints were slow/failing. | Optional data requests are parallel, taxonomy cache is reused, and the header uses its existing fallback menu; most category/article/search HTML samples are now under 0.35 s when warm. | VI homepage still took ~10.47 s on all three after samples. Direct CMS snapshot returned 200 after 11.41 s; frontend's 10 s snapshot deadline triggered a legacy fallback. Shortening the deadline could increase CMS work and risk incomplete cold content, so it was not done without an upstream fix. |
| FE-005 Mobile search | Search disappeared below the desktop breakpoint. | Mobile drawer has full-width live search; mobile search and language switch pass on staging. | None observed in tested viewport. |
| FE-006 CMS overload | During first deploy CMS load reached ~305, with ~248 PHP-FPM workers, 21/23 GiB RAM and 3.5/3.8 GiB swap used; direct REST search timed out. Old staging also timed out. | Rolled back during the overload, then redeployed and tested after CMS recovered enough to respond. | Cause of heavy PHP-FPM/CMS work remains unconfirmed. Read-only CMS diagnostics only; no CMS changes. |

Changed code is under `university-next/src`; targeted tests are `university-next/tests/e2e/staging-stability.spec.ts`. Root-cause detail is in `STAGING_FULL_DEBUG_REPORT.md`; raw HTTP samples are in `artifacts/staging-debug/{before,after}-http.json`.

## Verification and deployment

- Local lint, TypeScript, production build, and all 12 targeted E2E scenarios passed. The staging VPS build ran as `www` with explicit release ID. On the active staging release, **12/12 targeted E2E** and **15/15 existing public-site regression** tests passed with one Playwright worker.
- Chrome verified real English search results and Vietnamese results, and confirmed that an English query returning only Vietnamese CMS records shows an error rather than leaking them. VI homepage visibly rendered hero, news, notices, and events after fallback. The public-site regression also checked VI/EN homepage content, category/article content, images, metadata, responsive overflow, redirect, 404, and unsigned revalidation rejection.
- The active systemd service `tlu-next-staging` has WorkingDirectory `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-9c094fc/university-next`, `TLU_RELEASE_ID=9c094fc`, and port 127.0.0.1:3001. The old release remains at `/www/wwwroot/dev.nguyenhongson.vn-app/rc/university-next-0d96903/university-next`. The pre-change override is saved at `/www/wwwroot/dev.nguyenhongson.vn-app/backups/staging-20261012-6130cd5/override.conf` for rollback.

## Performance gate

The HTTP comparison used three sequential public requests for each of eight routes, recording first-observed and repeated totals. It is a small operational sample, **not** a statistically valid p95 or a controlled cold/warm browser/Web Vitals study.

| Route | Before total range | Active release total range |
| --- | ---: | ---: |
| VI homepage `/` | 7.69–11.12 s | **10.46–10.47 s** |
| EN homepage `/en` | 7.99–13.00 s | 1.75–1.81 s |
| VI article | 8.97–16.63 s | 0.31–0.33 s |
| EN article | 7.33–13.74 s | 0.28–7.75 s |
| VI/EN categories | 5.12–9.61 s | 0.26–0.34 s |
| EN search document | 5.13–6.44 s | 0.24–0.29 s |
| EN search API | 0.14–0.17 s (false-empty data) | 0.14–0.15 s (valid data) |

The agreed gates remain warm navigation/search p95 ≤2 s, cold document p95 ≤5 s, and complete content. **The VI homepage and first-observed EN article exceed the cold-document gate, and a valid p95 has not been established.** Content passed the tested routes, but completeness under CMS load is not guaranteed. Go Production remains blocked.

Next, CMS administration should investigate PHP-FPM/CPU, access/error logs, slow requests, and the 11 s homepage snapshot using read-only diagnostics first; implement genuine Polylang filtering in the CMS search endpoint. After upstream stabilization, remeasure controlled browser navigation, LCP/INP/CLS, search p95, and cold/warm route p95 with complete-content assertions. Separate data, backup/restore, and cutover gates still apply.
