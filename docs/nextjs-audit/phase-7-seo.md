# Phase 7 — SEO, Metadata, Canonical, Sitemap và Robots

## 1. SEO source of truth

Priority used:

1. Backend PHP SEO source:
   - `headless-api/includes/endpoints/class-seo.php`
   - `headless-api/includes/Services/SeoService.php`
   - `headless-api/includes/Normalizers/SeoNormalizer.php`
   - Rank Math and related integrations
2. Existing frontend Core REST metadata flow:
   - `src/lib/seo/metadata.ts`
   - `src/lib/wordpress/seo.ts`
   - page-level `generateMetadata`
3. Existing frontend environment and route configuration
4. Prior audit reports

The frontend currently uses WordPress Core REST post/page shapes, not the normalized `headless/v1/seo` contract. No endpoint migration was made.

## 2. Backend SEO contract

### Verified endpoint

`GET /wp-json/headless/v1/seo`

Parameters:
- `id`: optional positive integer
- `slug`: optional string
- `type`: optional public post type, default `page`
- `lang`: optional language code
- At least one of `id` or `slug` is required.

Verified error behavior:
- Missing selector: `bad_request`, HTTP 400.
- Not found/private content: backend error path, runtime result remains PARTIALLY_VERIFIED.
- Optional integrations can affect output shape.

### Verified/partially verified output fields

| Field | Backend source | Required | Nullable / optional | Frontend usage | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `SeoService` / normalizer | Yes on success | No | Not used | VERIFIED |
| `slug` | `SeoService` / normalizer | Yes on success | No | Not used | VERIFIED |
| `type` | `SeoService` / normalizer | Yes on success | No | Not used | VERIFIED |
| `lang` | `SeoService` / normalizer | Yes on success | May be empty | Core REST locale used instead | VERIFIED |
| `source` | SEO normalizer | Yes on success | Depends on integration | Not used | PARTIALLY_VERIFIED |
| `title` | SEO normalizer / Rank Math fallback | Yes on success | Fallback-dependent | Frontend derives from Core REST title | PARTIALLY_VERIFIED |
| `description` | SEO normalizer / Rank Math fallback | Optional | Yes | Frontend derives from excerpt | PARTIALLY_VERIFIED |
| `canonical` | SEO normalizer | Optional | Yes | Frontend constructs frontend canonical | PARTIALLY_VERIFIED |
| `robots` | SEO normalizer | Optional | Yes | Root/404 Metadata API rules | PARTIALLY_VERIFIED |
| `open_graph` | SEO normalizer | Optional | Yes | Frontend Metadata mapper | PARTIALLY_VERIFIED |
| `twitter` | SEO normalizer | Optional | Yes | Frontend Metadata mapper | PARTIALLY_VERIFIED |
| `schema` | SEO normalizer | Optional | Yes | Not rendered | PARTIALLY_VERIFIED |
| `breadcrumbs` | SEO normalizer | Optional | Yes | Not used | PARTIALLY_VERIFIED |

Rank Math-dependent values cannot be treated as guaranteed without a live runtime response.

## 3. Route metadata matrix

| Route | Metadata source | Title | Description | Canonical | Alternates | OG | Twitter | Robots | Problems |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Homepage service + metadata mapper | `Trang chủ` + root template | Hero subtitle, fallback university tagline | Frontend origin `/` | Verified vi/en homepage URLs | Website + optional hero image | Summary/large image | Index/follow inherited | Runtime homepage content not smoke-tested |
| `/en` | Homepage service + metadata mapper | `Home` + root template | English locale hero subtitle or existing fallback | Frontend origin `/en` | Verified vi/en homepage URLs | Website + optional hero image | Summary/large image | Index/follow inherited | Locale-specific tagline fallback remains source-dependent |
| `/tin-tuc/[slug]` | Core REST post + metadata mapper | Rendered post title | Rendered excerpt stripped to text | Frontend origin + Vietnamese post path | Only emitted when verified translation slug exists | Article + featured image/date fields | Summary/large image | Index/follow inherited | Dynamic runtime response not tested |
| `/en/news/[slug]` | Core REST post + metadata mapper | Rendered post title | Rendered excerpt stripped to text | Frontend origin + English post path | Only emitted when verified translation slug exists | Article + featured image/date fields | Summary/large image | Index/follow inherited | Dynamic runtime response not tested |
| 404 routes | Local metadata | Locale-specific title | None | None | None | None | None | `noindex,nofollow` | Static only |

## 4. Metadata base findings

### Completed
- Added `metadataBase: new URL(NEXT_PUBLIC_SITE_URL)` to `src/app/layout.tsx`.
- The source is the public frontend origin, not `WP_SITE_URL` or `WP_API_URL`.
- Public environment validation ensures HTTP/HTTPS format.
- Existing URL construction uses `FRONTEND_URL` and does not use the WordPress CMS origin for canonical output.

### Remaining risk
- `NEXT_PUBLIC_SITE_URL` has a development fallback of `http://localhost:3000`.
- A production build with a missing public environment variable can still generate localhost canonical URLs.
- Production fail-fast policy is deferred because changing environment requiredness needs an explicit deployment decision.

## 5. Root metadata

Completed root defaults:
- Application name from `NEXT_PUBLIC_SITE_NAME`.
- Default title and title template.
- Default Vietnamese description.
- `metadataBase`.
- Open Graph site name/type defaults.
- Twitter card default.
- Public index/follow robots defaults.
- Format-detection settings.

Homepage titles were changed from site-name strings to locale page titles:
- Vietnamese: `Trang chủ`
- English: `Home`

This avoids root template output such as `SITE_NAME | SITE_NAME`.

## 6. Canonical findings

- Homepage canonical URLs are verified:
  - Vietnamese: `/`
  - English: `/en`
- Article canonical URLs are constructed from the frontend origin and the current locale path.
- Query strings and fragments are not included in canonical construction.
- No canonical is constructed from WordPress backend URLs.
- No canonical utility was added because existing route-level construction is limited and consistent.

**NEEDS_VERIFICATION:** runtime site origin configuration in production.

## 7. Locale and hreflang findings

### Homepage
Verified homepage alternate pair:
- `vi` and `x-default`: `/`
- `en`: `/en`

### Articles
Previously, the translation helper fell back to the target-language homepage when a translated slug was missing. That could produce a false article hreflang alternate.

Completed:
- `getTranslatedPostUrl()` now returns `null` when a translated slug is not verified.
- `SeoData.includeAlternates` prevents article alternate emission when the corresponding translated URL is unavailable.
- Vietnamese and English article routes pass `includeAlternates: Boolean(translatedUrl)`.

**NEEDS_VERIFICATION — TRANSLATED URL ALTERNATES:** Core REST translation fields and ACF fallback keys require runtime evidence before article alternates can be considered fully verified.

## 8. Open Graph and Twitter findings

Frontend metadata mapper supplies:
- Open Graph URL, title, description, site name, locale, type.
- Article published/modified timestamps when Core REST values exist.
- Featured image URL and alt where a featured media object is available.
- Twitter `summary_large_image` when an image exists; otherwise `summary`.

Not added:
- Social handles
- Author metadata
- Backend Rank Math OG/Twitter data
- Structured data

Those fields were not sufficiently verified for the current Core REST frontend contract.

## 9. Robots metadata and robots.txt

### Metadata robots
- Root public content inherits index/follow metadata.
- Root/global not-found metadata has `noindex,nofollow`.
- English not-found metadata has `noindex,nofollow`.
- Preview/private frontend flow is not implemented and was not tested.

### robots.txt
Created `src/app/robots.ts`:
- Allows public site crawling.
- Disallows `/api/` and `/_next/`.
- References frontend `/sitemap.xml`.
- Uses only the public frontend origin.

No private URL, secret route, or CMS backend sitemap is included.

## 10. Sitemap findings

Created `src/app/sitemap.ts`:
- Includes only verified static public URLs:
  - `/`
  - `/en`
- Dynamic posts, pages, categories, terms, archives, and translated URLs are deliberately excluded.
- No mock slug, private content, `lastModified`, `changeFrequency`, or priority is fabricated.

**DESIGN ONLY — DYNAMIC CONTENT SITEMAP NOT IMPLEMENTED**

A future dynamic sitemap requires a verified public-content listing source and confirmed locale/translation behavior.

## 11. Structured data findings

- No existing JSON-LD implementation was found.
- Backend SEO normalizer can provide schema only when runtime integration supplies it.
- No JSON-LD was added because schema object shape, safe parsing, canonical origin, and duplication with Rank Math are not verified.

**NEEDS_VERIFICATION — STRUCTURED DATA**

## 12. Duplicate metadata fetch findings

- Homepage page component and `generateMetadata()` both call `getFullHomepageData(locale)`.
- Existing React `cache()` wrapping in `services/homepage.ts` provides request memoization for identical inputs.
- No module-level cache or cache-strategy change was added.
- Article page and `generateMetadata()` both call `getPostBySlug`; Next request memoization/cache behavior remains as Phase 4 and was not changed.

## 13. Changes completed

Files changed:
- `university-next/src/app/layout.tsx`
- `university-next/src/app/page.tsx`
- `university-next/src/app/en/page.tsx`
- `university-next/src/app/tin-tuc/[slug]/page.tsx`
- `university-next/src/app/en/news/[slug]/page.tsx`
- `university-next/src/lib/wordpress/polylang.ts`
- `university-next/src/types/seo.ts`
- `university-next/src/lib/seo/metadata.ts`

Files created:
- `university-next/src/app/robots.ts`
- `university-next/src/app/sitemap.ts`
- `docs/nextjs-audit/phase-7-seo.md`

Files moved:
- None

Files deleted:
- None

No backend file was modified.
No endpoint or response contract was changed.
No route tree or cache strategy was changed.

## 14. Deferred issues

- Runtime Rank Math SEO contract verification.
- Dynamic content sitemap.
- Article translation slug verification.
- Preview/private SEO handling.
- Production public-origin fail-fast policy.
- Structured data validation/rendering.
- Runtime response validation for Core REST featured media/SEO fields.

## 15. NEEDS_VERIFICATION items

- Production `NEXT_PUBLIC_SITE_URL` deployment value.
- Runtime `headless/v1/seo` response shape with Rank Math active/inactive.
- Core REST translation field availability and translated article URL mappings.
- Public post/page/archive/term enumeration source for sitemap.
- Preview/private/password-protected metadata behavior.
- Runtime media host/path reliability for OG images.
- Backend schema JSON-LD shape and safe rendering policy.
- Staging/preview anti-indexing policy.

## 16. Known limitations

- No live WordPress runtime was available.
- Dynamic article metadata has not been runtime smoke-tested.
- Sitemap is intentionally static-only.
- Frontend remains on Core REST metadata sources, not normalized Headless SEO endpoint data.
- Development fallback can yield localhost metadata if public environment is missing.

## 17. Remaining risks

- Incorrect production public origin can still publish incorrect canonical/OG/sitemap URLs.
- Missing translation mapping means article hreflang is omitted, reducing international SEO coverage but avoiding false alternates.
- Dynamic public content is absent from the minimal sitemap.
- Optional backend SEO integration fields may differ across runtime environments.

# PHASE 7 RESULT

Overall status:
PASS WITH WARNINGS

Files inspected:
- Frontend app metadata routes and helpers
- Environment/public constants
- Core REST post/page/SEO helpers
- Prior Phase 0–6 reports
- Read-only backend SEO endpoint, service, normalizer, integrations, page/archive/term/resolve sources

Files changed:
- `university-next/src/app/layout.tsx`
- `university-next/src/app/page.tsx`
- `university-next/src/app/en/page.tsx`
- `university-next/src/app/tin-tuc/[slug]/page.tsx`
- `university-next/src/app/en/news/[slug]/page.tsx`
- `university-next/src/lib/wordpress/polylang.ts`
- `university-next/src/types/seo.ts`
- `university-next/src/lib/seo/metadata.ts`

Files created:
- `university-next/src/app/robots.ts`
- `university-next/src/app/sitemap.ts`
- `docs/nextjs-audit/phase-7-seo.md`

Files moved:
- None

Files deleted:
- None

Routes audited:
- `/`
- `/en`
- `/tin-tuc/[slug]`
- `/en/news/[slug]`
- not-found routes
- `/robots.txt`
- `/sitemap.xml`

Metadata base:
- `NEXT_PUBLIC_SITE_URL` in root layout
- frontend public origin only

Canonical URLs:
- Homepage and article canonical URLs use frontend origin
- No WordPress CMS-origin canonicals introduced

Homepage alternates:
- Verified `/` ↔ `/en`

Article alternates:
- Emitted only when a translated slug is verified
- Otherwise omitted

Open Graph:
- Existing mapper enhanced through root defaults
- Article/site fields remain Core REST-based and partially runtime-dependent

Twitter:
- Existing mapper retained
- No unverified social handles added

Robots metadata:
- Public root defaults index/follow
- Vietnamese and English 404 routes noindex/nofollow

robots.txt:
- Created MetadataRoute
- Allows public crawling
- Disallows `/api/` and `/_next/`
- References frontend sitemap

Sitemap:
- Created MetadataRoute
- Only `/` and `/en`
- Dynamic sitemap is DESIGN ONLY — NOT IMPLEMENTED

Structured data:
- Not implemented
- NEEDS_VERIFICATION

Duplicate metadata requests:
- Homepage uses existing React cache memoization
- No cache strategy change

Runtime smoke tests:
- Not run; no live WordPress runtime available

Lint:
- Pending final verification

Typecheck:
- PASS after Phase 7 changes

Test:
- NOT RUN; no test script

Build:
- Pending final verification

Known limitations:
- No live runtime validation
- Static-only sitemap
- Optional backend SEO fields are PARTIALLY_VERIFIED

Remaining risks:
- Public site URL fallback can cause incorrect production SEO URLs
- Dynamic content excluded from sitemap
- Article hreflang omitted without verified translation mapping

Phase 8 prerequisites:
- Phase 8 has not been started.
- Verify runtime internationalization/search/error-flow behavior before making client/UX changes.