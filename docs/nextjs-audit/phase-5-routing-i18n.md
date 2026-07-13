# Phase 5 — Routing, Slug, Locale, Redirect và Not Found

## 1. Route Inventory

| Filesystem path | Public URL | Route type | Locale | Content type | Data source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/app/layout.tsx` | Root layout | Layout | N/A | Shared shell | None | PASS |
| `src/app/page.tsx` | `/` | Page | vi | Homepage | `getFullHomepageData('vi')` | PASS |
| `src/app/en/page.tsx` | `/en` | Page | en | Homepage | `getFullHomepageData('en')` | PASS |
| `src/app/tin-tuc/[slug]/page.tsx` | `/tin-tuc/:slug` | Dynamic page | vi | Post detail | `getPostBySlug(slug, 'vi')` | PASS |
| `src/app/en/news/[slug]/page.tsx` | `/en/news/:slug` | Dynamic page | en | Post detail | `getPostBySlug(slug, 'en')` | PASS |
| `src/app/loading.tsx` | Root loading | Loading UI | N/A | Shared loading spinner | None | PASS |
| `src/app/global-error.tsx` | Global error | Error boundary | N/A | Root error recovery | None | PASS |
| `src/app/not-found.tsx` | Global 404 | Not found | vi | Missing content | None | ADDED |
| `src/app/tin-tuc/[slug]/error.tsx` | Post error | Error boundary | vi | Post load error | None | ADDED |
| `src/app/en/news/[slug]/error.tsx` | Post error | Error boundary | en | Post load error | None | ADDED |
| `src/app/favicon.ico` | Favicon | Metadata file | N/A | Ico | File asset | PASS |
| `src/app/globals.css` | Global CSS | Stylesheet | N/A | Tailwind | File asset | PASS |

**Missing route conventions (not found):**
- No `template.tsx` (re-render on navigation) — not needed for current routes
- No `route.ts` API handlers
- No parallel or intercepting routes
- No catch-all `[...slug]`
- No optional catch-all `[[...slug]]`

## 2. Public URL Matrix

| Public URL | Route | Locale | Metadata handler | Error handler | 404 handler |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `page.tsx` | vi | `generateMetadata` via `getFullHomepageData('vi')` | `global-error.tsx` | `notFound()` if hero page is null → 404 |
| `/en` | `en/page.tsx` | en | `generateMetadata` via `getFullHomepageData('en')` | `global-error.tsx` | `notFound()` if hero page is null → 404 |
| `/tin-tuc/[slug]` | `tin-tuc/[slug]/page.tsx` | vi | `generatePostMetadata` | `tin-tuc/[slug]/error.tsx` | `notFound()` if post is null |
| `/en/news/[slug]` | `en/news/[slug]/page.tsx` | en | `generatePostMetadata` | `en/news/[slug]/error.tsx` | `notFound()` if post is null |
| Any unmatched route | `not-found.tsx` | vi | `metadata` object | `global-error.tsx` | Renders 404 page |

## 3. Locale Model

- **Supported locales:** `vi` (default), `en`
- **Locale detection:** Pathname prefix — `/en` → English, otherwise Vietnamese
- **Locale propagation:**
  - Route-level: hardcoded in each page's component call (`getPostBySlug(slug, 'vi')`)
  - Layout-level: `Header` component fetches menus with a fallback locale of 'vi'; no locale-aware menu fetching for English layout found
- **WordPress integration:**
  - `getWpLangParam('vi')` → 'vi'
  - `getWpLangParam('en')` → 'en'
  - Locale is passed to Polylang via `lang` query param in WordPress API requests
- **Locale fallback policy:**
  - Post not found → 404 (Strict locale)
  - Menu data: shared across locales (Needs Verification)
- **No middleware** exists for auto locale detection/redirect
- **No cookie-based** locale persistence
- **No `generateStaticParams`** for dynamic routes — all post pages are SSR on demand

## 4. Locale Propagation Findings

| Route | Locale source | Data fetching locale | Menu locale | Options locale | SEO locale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Hardcoded `'vi'` | `getFullHomepageData('vi')` | `getNavigationData()` — no locale param | Not fetched separately | `locale: 'vi'` in metadata |
| `/en` | Hardcoded `'en'` | `getFullHomepageData('en')` | `getNavigationData()` — no locale param | Not fetched separately | `locale: 'en'` in metadata |
| `/tin-tuc/[slug]` | Hardcoded `'vi'` | `getPostBySlug(slug, 'vi')` | Shared layout menu | Not fetched | `locale: 'vi'` in post metadata |
| `/en/news/[slug]` | Hardcoded `'en'` | `getPostBySlug(slug, 'en')` | Shared layout menu | Not fetched | `locale: 'en'` in post metadata |

**Issues:**
- Menu data is locale-agnostic — the same WordPress menus serve all locales. Polylang support for menus requires dedicated per-locale menu endpoints/locations.
- No per-locale options/settings fetching — categories and site constants are shared across languages.

## 5. Language Switcher Findings

- **File:** `src/components/ngon-ngu/ChuyenNgonNgu.tsx`
- **Method:** Client component using `usePathname` + string replacement heuristic
- **Current behavior:**
  - `/en` ↔ `/`
  - `/en/news/<slug>` ↔ `/tin-tuc/<slug>` (slug kept unchanged)
  - `/en/search` ↔ `/tim-kiem`
  - Other `/en/<path>` ↔ `/<path>` (prefix removal)
- **Query string preserved:** Yes, `window.location.search` is re-appended
- **Hash fragment:** Not preserved
- **External URLs:** Not encountered by switcher
- **Translated slug mapping:**
  - Currently assumes identical slugs across locales
  - If slugs differ, this assumption breaks → user navigates to wrong URL / 404
  - Created `src/lib/routing/translated-slug.ts` utility for future integration with backend resolve endpoint
  - Documented as **NEEDS VERIFICATION — TRANSLATED SLUG MAPPING**

## 6. Slug and Nested-Path Findings

- **Dynamic segment:** `[slug]` only (single segment)
- **No catch-all** `[...slug]` or `[[...slug]]`
- **Slug handling:**
  - `params` is `Promise<{ slug: string }>` — uses Next.js 15+ async params API
  - No `decodeURIComponent` called explicitly — Next.js decodes params automatically
  - No `encodeURIComponent` needed — slug is used directly in WordPress API query
  - Empty slug not explicitly validated — WordPress API returns empty array or error
- **Nested page support:** None
  - Backend resolve endpoint supports `path` parameter for multi-segment paths
  - Frontend has no catch-all route to consume multi-segment page paths
  - Design proposal documented below — NOT YET IMPLEMENTED
- **Known nested WordPress page structures:** Not verified from runtime

## 7. Resolve Endpoint Findings

Backend provides `GET /headless/v1/resolve` (`class-resolve.php`):
- **Params:** `id` | `slug` | `path` | `url` (exclusive — only one)
- **Optional:** `post_type`, `lang`
- **Response:** `PageNormalizer` shape with translated slug
- **Locale behavior:** Validates `lang` param, rejects language mismatch with 400
- **Error handling:** 400 for ambiguous/missing input, 404 for not found or not public

Current frontend uses resolve endpoint **indirectly**:
- Created `src/lib/routing/translated-slug.ts` for language switcher translated slug lookup
- Not yet integrated into the language switcher UI

**Design proposal for path-based routing:**
- DESIGN ONLY — NOT IMPLEMENTED
- Could use catch-all `[[...slug]]` with resolve endpoint for multi-page URLs
- Must handle reserved paths (`/tin-tuc`, `/en`, `/en/news`, `/api`, `/_next`)

## 8. Not-Found and Error Findings

### Before Phase 5:
- **No `not-found.tsx`** — Next.js rendered default 404
- **No `error.tsx`** for dynamic routes — WordPress API errors propagated to `global-error.tsx`
- **Error handling gap:** `getPostBySlug` returned `null` only for empty results (correct 404), but network/api errors escaped to global error without route-context fallback

### After Phase 5:
- **Created `src/app/not-found.tsx`** — proper 404 page with Vietnamese message
- **Created `src/app/tin-tuc/[slug]/error.tsx`** — Vietnamese post error boundary with retry
- **Created `src/app/en/news/[slug]/error.tsx`** 💫— English post error boundary with retry

### Error classification:
| Scenario | Detection mechanism | HTTP result | UI |
| :--- | :--- | :--- | :--- |
| Post not found | `getPostBySlug` returns `null` (empty array) | 404 | `notFound()` → `not-found.tsx` |
| API timeout | `WordPressResponseError` thrown | 500 | `error.tsx` with retry button |
| WordPress REST error | `WordPressApiError` thrown | 500 | `error.tsx` with retry button |
| Invalid JSON | `WordPressResponseError` thrown | 500 | `error.tsx` with retry button |
| Network error | `WordPressResponseError` thrown | 500 | `error.tsx` with retry button |
| Page not found | `getPageBySlug` returns null | 404 | Component renders empty, not `notFound()` |

## 9. Redirect Findings

- **No `redirect()`** or `permanentRedirect()` used in application code
- **No `redirects()`** configuration in `next.config.ts`
- **No middleware** (middleware.ts) for locale detection/redirect
- **Trailing slash:** Not configured explicitly — Next.js default (no trailing slash)
- **Trailing slash behavior:** `trailingSlash` not set in `next.config.ts`
- **HTTP/HTTPS:** Not handled at application level — assumed by deployment platform
- **www/non-www:** Not handled — assumed by deployment platform
- **Duplicate slash:** Not handled
- **Upper/lower case:** Not handled — WordPress slugs are case-sensitive in API queries
- **Legacy URL mapping:** None

## 10. Middleware Findings

- **No `middleware.ts`** found in `src/` or project root
- **No proxy.ts** or reverse proxy configuration
- **Locale detection:** Currently only via pathname prefix in client components

Add middleware only if:
- Auto redirect `/` to `/en` (or vice versa) is required
- Cookie-based locale persistence is desired
- Bot/crawler detection for prerendered content serving

Status: Not needed for current routing architecture.

## 11. Reserved-Path Findings

| Reserved path | Purpose | Collision risk | Current protection |
| :--- | :--- | :--- | :--- |
| `/en` | English locale prefix | Low — `en` unlikely as page slug | Route priority (static) |
| `/tin-tuc` | Vietnamese news listing | Medium — possible page slug | No page route exists |
| `/en/news` | English news listing | Medium — possible page slug | No page route exists |
| `/api` | Next.js API routes | Low | Not used; reserved by Next |
| `/_next` | Next.js internal | None | Framework reserved |
| `/favicon.ico` | Favicon asset | None | Static file |
| `/robots.txt` | SEO file | None | Not present; Phase 7 |
| `/sitemap.xml` | SEO file | None | Not present; Phase 7 |

If future catch-all `[[...slug]]` is added for nested pages, route priority must favor:
1. Explicit dynamic routes (`tin-tuc/[slug]`, `en/news/[slug]`)
2. Static routes (`/`, `/en`)
3. Framework-internal routes (`/_next`, `/api`)
4. Catch-all fallback

## 12. Changes Completed

Files changed:
- `src/lib/wordpress/polylang.ts` — made existing helpers export-visible (no logic change)
- `src/components/ngon-ngu/ChuyenNgonNgu.tsx` — added documentation comments

Files created:
- `src/lib/routing/translated-slug.ts` — resolve endpoint integration utility
- `src/app/not-found.tsx` — proper 404 page
- `src/app/tin-tuc/[slug]/error.tsx` — Vietnamese post error boundary
- `src/app/en/news/[slug]/error.tsx` — English post error boundary

Files moved: None

Files deleted: None

**Route structure:** Unchanged

**Backend:** Not modified

## 13. Deferred Design Proposals

### A. Catch-all Route for Nested Pages
- DESIGN ONLY — NOT IMPLEMENTED
- Route: `src/app/[[...slug]]/page.tsx`
- Data source: `/headless/v1/resolve` endpoint with `path` param
- Must handle reserved path exclusion (route priority)
- Must handle locale detection from catch-all path
- Proposed for Phase 8+ or dedicated nested-pages story

### B. Middleware for Auto Locale Detection
- DESIGN ONLY — NOT IMPLEMENTED
- Route: `src/middleware.ts`
- Would redirect `/en/news` ↔ `/tin-tuc` for base paths
- Could set cookie for locale persistence
- Not needed for current static two-locale architecture

## 14. NEEDS_VERIFICATION Items

- **TRANSLATED SLUG MAPPING:** Language switcher assumes slugs are identical across locales. If WordPress has different slugs per translation, the current string-replace heuristic fails. Backend resolve endpoint can provide translated slugs, but frontend integration in the switcher UI requires client-side fetching.
- **MENU BY LOCALE:** Menus are fetched once for all locales. If Polylang provides separate menus per language, dedicated locale-aware menu fetching is needed.
- **OPTIONS/SETTINGS BY LOCALE:** Options/settings are currently shared. Polylang may require per-locale option fetching.
- **RUNTIME VERIFICATION:** No live WordPress available to verify actual slug behavior, resolve endpoint responses, or nested page structures.
- **NESTED PAGE STRUCTURES:** Unknown whether WordPress has multi-level pages (parent/child) or post type archives beyond news.

## 15. Known Limitations

- No runtime WordPress verification — all routing logic verified from source only
- Language switcher relies on slug identity assumption — will break if translated slugs differ
- No catch-all route for nested page paths — only first-level segment routing
- Menu data is shared across locales — not proven compatible with Polylang menu localization
- No `generateStaticParams` — all post pages are SSR on demand (ISR not yet configured for post routes)
- No bot/crawler detection for prerendered content delivery

## 16. Remaining Risks

- Language switcher may redirect users to 404 pages if translated slugs differ
- Menu items may show wrong-language labels if Polylang menu localization is active
- Nested WordPress pages (if any) are not reachable through current routing
- No locale validation beyond pathname prefix — `/[locale]` pattern handles both 'vi' and 'en' correctly
- Network errors during post load trigger generic error boundaries with limited UX context



# PHASE 5 RESULT

Overall status: PASS WITH WARNINGS

Files inspected:
- `university-next/src/app/**`
- `university-next/src/lib/i18n/**`
- `university-next/src/lib/wordpress/polylang.ts`
- `university-next/src/components/ngon-ngu/ChuyenNgonNgu.tsx`
- `university-next/src/components/layout/Header.tsx`
- `university-next/src/components/layout/NavShell.tsx`
- `university-next/src/components/layout/Topbar.tsx`
- `university-next/src/constants/ngon-ngu.ts`
- `university-next/src/constants/duong-dan.ts`
- `university-next/src/constants/categories.ts`
- `university-next/src/lib/wordpress/posts.ts`
- `university-next/src/lib/wordpress/pages.ts`
- `headless-api/includes/endpoints/class-resolve.php`
- `headless-api/includes/endpoints/class-page.php`
- `headless-api/includes/endpoints/class-page-blocks.php`
- `headless-api/includes/endpoints/class-term.php`
- `headless-api/includes/endpoints/class-archive.php`
- `headless-api/includes/Services/ContentResolver.php`
- `headless-api/includes/Services/ArchiveResolver.php`
- `headless-api/headless-api.php`

Files changed:
- `university-next/src/lib/wordpress/polylang.ts`
- `university-next/src/components/ngon-ngu/ChuyenNgonNgu.tsx`

Files created:
- `university-next/src/lib/routing/translated-slug.ts`
- `university-next/src/app/not-found.tsx`
- `university-next/src/app/tin-tuc/[slug]/error.tsx`
- `university-next/src/app/en/news/[slug]/error.tsx`
- `docs/nextjs-audit/phase-5-routing-i18n.md`

Files moved: None

Files deleted: None

Routes audited:
- `/`
- `/en`
- `/tin-tuc/[slug]`
- `/en/news/[slug]`
- `/_not-found`
- Other framework routes (layout, loading, global-error, favicon, CSS)

Public route matrix:
| Route | Mode | Locale | Content | Metadata | Error boundary | 404 behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Static (ISR 1m) | vi | Homepage | `generateMetadata` | `global-error.tsx` | `notFound()` for null hero page |
| `/en` | Static (ISR 1m) | en | Homepage | `generateMetadata` | `global-error.tsx` | `notFound()` for null hero page |
| `/tin-tuc/[slug]` | Dynamic SSR | vi | Post detail | `generatePostMetadata` | `tin-tuc/[slug]/error.tsx` | `notFound()` for null post |
| `/en/news/[slug]` | Dynamic SSR | en | Post detail | `generatePostMetadata` | `en/news/[slug]/error.tsx` | `notFound()` for null post |
| `/_not-found` | Static | vi | 404 page | `metadata` object | `global-error.tsx` | N/A |

Locales verified:
- `vi` — default locale, no URL prefix
- `en` — prefixed with `/en`
- Confirmed from `SUPPORTED_LOCALES` in `src/constants/ngon-ngu.ts`

Locale propagation issues:
- Menu fetching is locale-agnostic — shared across all routes regardless of locale
- Layout-level header fetches menus without locale parameter

Language switcher issues:
- Uses string replacement heuristic assuming identical slugs across locales
- Translated slug mapping not yet integrated (NEEDS_VERIFICATION)
- Hash fragment not preserved during language switch

Nested slug support:
- Current routes use single `[slug]` segment only
- No catch-all or nested page route support
- Backend resolve endpoint supports multi-segment paths but frontend routing cannot consume them

Resolve endpoint status:
- Backend provides `GET /headless/v1/resolve`
- Source verified from `class-resolve.php`
- Frontend utility `translated-slug.ts` created for future integration
- Not yet integrated into language switcher UI

Not-found behavior:
- Before: No custom 404 page (Next.js default)
- After: Created `not-found.tsx` with proper UX
- Content-not-found (null post/page) → `notFound()` → `not-found.tsx` — correct
- Server/network errors → route-level `error.tsx` — added for post detail routes

Redirect changes:
- None

Middleware changes:
- None — no middleware exists

Runtime smoke tests:
- Not run — no live WordPress runtime available

Lint:
- PASS, exit code 0
- Existing warning remains at `LiveSearch.tsx:252` (deferred to Phase 6)

Typecheck:
- PASS, exit code 0

Test:
- NOT RUN — no `test` script exists

Build:
- PASS, exit code 0
- Route output unchanged from Phase 4

Known limitations:
- No runtime WordPress for smoke testing route behavior
- Language switcher slug identity assumption unverified
- No catch-all or nested page route support
- Menu localization not verified against Polylang

Remaining risks:
- Language switcher may break with translated slugs
- Nested WordPress pages unreachable with current routing
- Network errors bubble to global error without full context

Phase 6 prerequisites:
- Verify translated slug behavior with WordPress runtime
- Address `<img>` warning in `LiveSearch.tsx` during component audit
- Audit block renderer, ACF integration, and image optimization
- Keep routing and cache policies unchanged
- Phase 6 focuses on page renderer, blocks, components, menus, and images

Phase 5 completed and stopped here. Phase 6 was not started.

---

## Phase 5 Correction Check

### `translated-slug.ts`
- **Deleted.**
- Static reference search found no import or runtime usage outside `src/lib/routing/translated-slug.ts` itself.
- The utility also depended on the server-only WordPress client and could not be safely imported by the client language switcher.
- Translated-slug resolution remains **DESIGN ONLY — NOT IMPLEMENTED**.
- **NEEDS VERIFICATION — TRANSLATED SLUG MAPPING:** frontend must not assume translated slugs are identical; a future implementation needs a verified server/client-safe contract and route flow.

### Route-level error boundaries
- `src/app/tin-tuc/[slug]/error.tsx` and `src/app/en/news/[slug]/error.tsx` both:
  - declare `'use client'`;
  - use explicitly typed `Props`;
  - accept and expose the Next.js `reset()` retry action;
  - show only generic, non-sensitive user-facing messages;
  - do not render internal API messages, response bodies, tokens, or stack details.
- The `error` prop remains typed because it is part of the Next.js error-boundary contract, but is intentionally not rendered.

### Content 404 versus backend failure
Call chain verified:
1. Route page calls `getPostBySlug(slug, locale)`.
2. `getPostBySlug` calls `wpFetch<WPPost[]>` without a catch block.
3. It returns `posts[0] ?? null` only after a valid successful JSON array response.
4. Route page calls `notFound()` only when that result is `null`.
5. `wpFetch` throws `WordPressApiError` for non-2xx HTTP responses, including HTTP 404/5xx, and throws `WordPressResponseError` for timeout, network failure, invalid JSON, or empty/invalid response.
6. Those errors are not converted to `null`; they propagate to the route-level `error.tsx`.

Result:
- Valid empty list/content absence → `notFound()`.
- HTTP error, timeout, network failure, invalid JSON, or 5xx → error boundary, not 404.

### Localized 404 behavior
- Vietnamese/unprefixed routes use `src/app/not-found.tsx` with Vietnamese content.
- English routes under `/en` now use `src/app/en/not-found.tsx` with English content and an `/en` homepage link.
- No overall visual design or route structure was changed.

### Correction-check changes
Files created:
- `university-next/src/app/en/not-found.tsx`

Files deleted:
- `university-next/src/lib/routing/translated-slug.ts`

No backend files were modified. Phase 6 remains not started.
