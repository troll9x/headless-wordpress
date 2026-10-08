# Frontend performance audit — 2026-10-07

## Finding from the browser timing

The supplied timing capture shows 4,434 ms between request start and the first response byte. The response itself took 35 ms, DOM work took 433 ms, and subresources took 366 ms. That points first to server rendering/upstream API wait, rather than browser JavaScript or CSS parsing.

An additional read-only request to `https://dev.nguyenhongson.vn/` returned 200 and 648,014 bytes. Its response had `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (plus `no-cache`), with no visible `Age` or `X-Cache` header. That does not prove Nginx caching is serving the page. The current runbook statement that staging HTML cache is active needs to be treated as unverified until the response headers and two consecutive requests show a cache HIT.

Read-only CMS requests on 2026-10-07 also showed:

| Request | Elapsed | Response/cache evidence |
|---|---:|---|
| Headless category archive for `su-kien`, 12 posts | 3.3 s | 200, `X-Headless-Cache: BYPASS` |
| WordPress posts REST collection for the same category | 4.2 s | 200 |

These are individual endpoint timings, not a complete page benchmark. They confirm that waiting on the CMS is material.

## Code paths that can delay the first HTML

| Priority | Code path | Why it can be slow | Action |
|---|---|---|---|
| P0 | `src/services/homepage.ts` → `loadHomepageData()` | The homepage waits for 18 section-level tasks before returning markup. The WordPress client limits core REST calls to six concurrent requests, so a cold load can queue several waves. Some tasks also make nested requests. | Cache complete anonymous HTML at the staging reverse proxy, then verify HIT/MISS headers. For a code-only long-term fix, add a purpose-built cached homepage aggregate endpoint rather than increasing CMS concurrency. |
| P0 | Homepage `getHomepageEvents()` → `enrichPostsWithHeadlessAcf()` | Fetches 12 event summaries and then sends up to 12 separate Headless detail requests for ACF. This is an N+1 request pattern and can extend the homepage critical path. | Replace with one tested bulk/archive response that preserves the existing article fields, featured images, category terms, priority labels, and event ACF. The current live archive endpoint took 3.3 s and returned image links with a `localhost:3000` host, so it is not safe to wire directly until that response is corrected and benchmarked. |
| P0 | `src/app/[...path]/page.tsx` → `generateMetadata()` and article render | The article must resolve the post first. Rendering then waits for related/previous/next collections, sidebar, and category banner. Metadata also requests Headless SEO. These requests can all delay the initial article response. | Keep the article body on the critical path; stream secondary panels with Suspense or fetch them through a compact cached article bundle. Preserve canonical URLs and SEO metadata. |
| P1 | `src/app/layout.tsx` | Every route awaits site logos, footer, and social links before returning the shared layout. Cached CMS fetches help warm requests, but a cache miss affects every page. | Put shared chrome data behind a persistent cache or stream it independently after measuring route behavior. |
| P1 | Homepage metadata in `src/app/page.tsx` and `src/app/en/page.tsx` | Metadata awaits the hero page, then Headless SEO for that page. This adds an upstream dependency before metadata is complete. | Combine metadata with the cached homepage/hero response or cache it separately. Do not remove SEO/canonical metadata as a speed shortcut. |
| P1 | Homepage HTML payload | The observed homepage HTML is about 648 KB before compression. Compact card data is already used, but the full page still serializes many sections to the client. | Measure compressed bytes and identify duplicated props/sections before trimming. Keep above-the-fold content and all requested news sections. |
| P2 | `BannerChinh.tsx` first video slide | The first video previously used `preload="auto"`, which could fetch a large video while the page is still loading. | Changed to `preload="metadata"`; the poster remains the initial visual and the active slide still starts playback. |
| P2 | Client components / sliders | Swiper, carousel, event controls and client-side search add JavaScript and hydration work. The supplied capture reports 0 ms script execution, so these are not the current 4.4-second bottleneck. | Defer broader client-component conversion until a browser trace shows meaningful JS or hydration time. Keep search requests uncached. |

## Recommended order to reach a 1–2 second first load

1. **Make anonymous HTML caching verifiable on `dev`**: cache only public GET/HEAD page responses; bypass `/api`, preview/authenticated requests, cookies, and responses that set cookies. Confirm a cold `MISS` then a warm `HIT`, stable content, and correct purge/revalidation behavior. Do not change production or shared Nginx configuration as part of this audit.
2. **Reduce the CMS critical path**: create or use a tested aggregate API for homepage sections and article detail. The current implementation makes many independent upstream requests and the CMS endpoints themselves take seconds on a cold request.
3. **Stream noncritical article sections** after the article body and metadata are ready.
4. **Measure browser resource count and compressed transfer size** separately from TTFB. Reduce images, video, and client JavaScript only where the trace shows they delay LCP or interaction.

The 1–2 second goal is achievable for repeat public page loads with effective HTML caching, but source code changes alone cannot guarantee it while the CMS takes 3–4 seconds per request and the page blocks on those responses. Cold, uncached responses will need the CMS or aggregate endpoint to improve too.

## Scope and safety

This audit made no requests that change the CMS, database, staging server, production site, or Nginx configuration. The only code change is the hero video preload adjustment described above. Keep the existing unrelated worktree changes untouched.
