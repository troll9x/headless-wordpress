# P2 verification (2026-10-03)

## WordPress document and organization requests

Three public HTTPS samples per endpoint, measured from this workstation with `curl`. These are network TTFB values, **not** WordPress SQL timings:

| Endpoint | HTTP | TTFB samples | Response | Cache headers |
| --- | --- | --- | --- | --- |
| `/headless/v1/documents/categories/van-ban-tai-lieu?lang=vi&page=1&per_page=6` | 200 | 2.413, 2.520, 2.429 s | 1,529 B | `x-headless-cache: BYPASS`, `cf-cache-status: DYNAMIC` |
| `/headless/v1/organizations/ban-giam-hieu?lang=vi` | 200 | 2.537, 2.463, 2.390 s | 4,247 B | `x-headless-cache: BYPASS`, `cf-cache-status: DYNAMIC` |

The document root archive currently walks child terms and starts a `WP_Query` for each child group; the organization endpoint starts one unbounded `WP_Query` and sorts the result. Exact SQL query count, SQL duration, and cold/warm PHP timing require WP-CLI on staging. Run `wp eval-file scripts/measure-p2-wordpress-queries.php --path=<wordpress-root>` with the Headless API active. Enable `SAVEQUERIES` **only on staging** to also print total SQL time. The script only reads content and reports two passes per case.

During repeated local browser runs the CMS intermittently exceeded the frontend's 30-second content timeout, leaving homepage sections in their fallback/empty states. Investigate origin capacity and request traces before treating the public TTFB samples as representative of sustained load.

## Images, TLS, and responsive layout

- Headless Chrome, local production build, 1365×900 and 390×844: viewport width equaled document scroll width in both cases; no horizontal overflow. After the image change, the banner measured 1365×546 and 390×219 respectively and was visually present in the screenshots. Reproduce with `node scripts/audit-p2-browser.mjs http://127.0.0.1:3002/` while `next start` runs on port 3002. This is a lab viewport check, not device/field CWV data.
- Initial homepage LCP element was the first banner image, `baner1010.webp` (2172×724, about 292 KB at the origin). It had high fetch priority but no responsive `srcset`. The banner now uses `next/image`, `fill`, and `sizes="100vw"`; the optional CMS `mobileSrc` remains a `<picture>` source. The optimizer returned a 640-width WebP response of 34,750 B and a 1920-width response of 180,586 B. Verify LCP again after deployment. The current CMS banner lacks `mobileSrc`, so its embedded text is still comparatively small on phones.
- Removed global `images.unoptimized`. Next's image endpoint returned HTTP 200 for images on both `cms.tlu.edu.vn` and legacy `tlu.edu.vn`; a CMS image returned a smaller WebP variant when requested with a browser `Accept` header. Node fetch and curl certificate validation succeeded on this workstation. Repeat TLS/image checks on the staging/production Node host; these results cannot certify another host's trust store.

## SEO and Next release

- `sitemap.xml` now includes static routes plus bounded public posts (newest 1,000), pages, categories, documents, organization members, and document taxonomy paths. Local production response: HTTP 200, 1,142 deduplicated URLs, roughly 193 KB. Warm response TTFB was about 6 ms; cold CMS collection took about 12 s. Category sitemap paths use the frontend's flat canonical path.
- Headless Rank Math can return `localhost` or CMS-host canonical URLs; metadata now falls back to the frontend route canonical unless the candidate shares its origin.
- The checked-in `.env.example` no longer points the frontend origin at `cms.tlu.edu.vn`. The active `.env.local` **still does**. All 1,142 local sitemap URLs and local canonical links consequently use the CMS origin. Do not deploy this value. Set `NEXT_PUBLIC_SITE_URL` to the actual public Next.js origin, rebuild, and verify canonical/robots/sitemap on that deployment. `tlu.edu.vn` currently serves the legacy WordPress site, so the cutover hostname needs confirmation.
- Next.js and `eslint-config-next` were exact-pinned to 16.3.8. Lint, typecheck, local production build, and local HTTP smoke checks passed. `npm audit --omit=dev` found 0 advisories; the full audit still reports 6 high advisories in development-only dependencies.

Actual staging deployment tests remain pending its URL/access and the intended frontend hostname. Do not treat the local production build as a staging rollout.
