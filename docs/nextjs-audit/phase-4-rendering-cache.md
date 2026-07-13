# Phase 4 — Data Fetching, Cache, SSR, SSG và ISR

## 1. Scope và kế hoạch

### Files to inspect
- `university-next/src/app/**`
- `university-next/src/lib/wordpress/**`
- `university-next/src/lib/api/**`
- `university-next/src/services/**`
- `university-next/src/components/layout/Header.tsx`
- `university-next/src/components/layout/Footer.tsx`
- `university-next/src/config/env/constants.ts`
- `university-next/src/constants/api.ts`
- `university-next/next.config.ts`

### Files expected to modify
- Không có thay đổi runtime/cache được chứng minh là an toàn và cần thiết trong Phase 4.

### Files expected to create
- `docs/nextjs-audit/phase-4-rendering-cache.md`

### Files that must not be modified
- Backend plugin trong `headless-api/`
- Endpoint/response contract
- Routing
- UI
- SEO metadata
- Block renderer
- Search UX
- Testing framework

### Risks
- Thay đổi cache tag hoặc revalidate có thể làm stale data hoặc tăng request.
- Tách fetch homepage khỏi metadata có thể phá request memoization hiện có.
- Thêm `no-store` hoặc dynamic rendering không có bằng chứng sẽ thay đổi render mode.

### Verification commands
```text
npm run lint
npm run typecheck
npm run build
git status --short
git diff --stat
git diff
```

## 2. Route rendering matrix

| Route | Current mode | Cause | Intended mode | Change required | Evidence |
|---|---|---|---|---|---|
| `/` | Static with 1-minute revalidation | Build output `○`, data fetches carry `revalidate: 60` for posts | ISR-like static route | None | `src/app/page.tsx`, `src/services/homepage.ts`, build output |
| `/en` | Static with 1-minute revalidation | Same as `/`, locale `en` | ISR-like static route | None | `src/app/en/page.tsx`, build output |
| `/tin-tuc/[slug]` | Dynamic server-rendered | Dynamic `[slug]`, no `generateStaticParams`; build output `ƒ` | Dynamic SSR/on-demand rendering | None in Phase 4 | `src/app/tin-tuc/[slug]/page.tsx`, build output |
| `/en/news/[slug]` | Dynamic server-rendered | Dynamic `[slug]`, no `generateStaticParams`; build output `ƒ` | Dynamic SSR/on-demand rendering | None in Phase 4 | `src/app/en/news/[slug]/page.tsx`, build output |
| `/_not-found` | Static | Next-generated not-found route | Static | None | Build output |

No route uses `cookies()`, `headers()`, `searchParams`, `draftMode`, `force-dynamic`, `force-static`, `fetchCache`, or `generateStaticParams`.

## 3. Data fetching inventory

| Caller | Runtime | Data source | Current cache | Revalidate | Tags | Render mode | Problem |
|---|---|---|---|---:|---|---|---|
| `getPosts` | Server | WordPress Core REST `/posts` | Next fetch cache via wrapper | 60s | `wp-posts` | Static/ISR or server route | Generic tag lacks locale/category identifier |
| `getPostBySlug` | Server | `/posts?slug=...` | Next fetch cache via wrapper | 60s | `wp-posts`, `post-${slug}-${locale}` | Dynamic article route | Tag is partly resource-specific; category is not relevant |
| `getPostById` | Server | `/posts/{id}` | Next fetch cache via wrapper | 60s | `wp-posts` | Server | Generic tag only |
| `getPageBySlug` | Server | `/pages?slug=...` | Next fetch cache via wrapper | 300s | `wp-pages` | Homepage/server | Generic tag lacks locale/slug identifier |
| `getPageById` | Server | `/pages/{id}` | Next fetch cache via wrapper | 300s | `wp-pages` | Server | Generic tag only |
| `getCategoryBySlug` | Server | `/categories?slug=...` | Next fetch cache via wrapper | 600s | `wp-categories` | Server | Generic tag lacks locale/slug identifier |
| `getMenus` | Server | `/menus` | Next fetch cache via wrapper | 3600s | `wp-menus` | Layout/server | Shared tag only |
| `getMenuItems` | Server | `/menu-items?menus=...` | Next fetch cache via wrapper | 3600s | `wp-menus` | Layout/server | Shared tag only |
| `getFullHomepageData` | Server | Parallel page/menu/category/post calls | React `cache()` memoization | Delegated per request | Delegated tags | Static route | No unnecessary split introduced |
| `getNavigationData` | Server | Three menu tree calls in parallel | Underlying fetch cache | 3600s | `wp-menus` | Root layout | Primary/footer menu calls can repeat at different layout consumers but underlying requests share fetch cache |
| `searchPosts` | Browser | `NEXT_PUBLIC_WP_BASE_URL` + `wpx-ft/v1/search` | Browser/HTTP cache behavior | Not Next ISR | None | Client-side fetch | No explicit browser cache directive; AbortSignal is preserved |
| `suggestPosts` | Browser | `NEXT_PUBLIC_WP_BASE_URL` + `wpx-ft/v1/suggest` | Browser/HTTP cache behavior | Not Next ISR | None | Client-side fetch | No explicit browser cache directive; AbortSignal is preserved |

## 4. Current cache policies

- Posts: `60` seconds.
- Pages: `300` seconds.
- Categories: `600` seconds.
- Menus: `3600` seconds.
- Media constant: `3600` seconds, no current fetch caller identified in this audit.
- `next.revalidate` and `next.tags` are passed through `wpFetch` and preserved from callers.
- No `cache: 'no-store'` or `next: { revalidate: ... }` is used for browser search; this is a browser fetch, not a Next server fetch.
- No `unstable_cache` or module-level custom cache was found.
- Homepage requests are parallelized with `Promise.all`.
- Homepage service uses React `cache()` with stable locale input, which memoizes repeated calls in the same request/render context. No additional fetch split was made.

## 5. Cache tag convention

Current tags:
- `wp-posts`
- `wp-pages`
- `wp-categories`
- `wp-media`
- `wp-menus`
- Resource-specific post tag: `post-${slug}-${locale}`

Findings:
- Locale is included only in the post-specific tag.
- Page, category, menu and generic post tags are broad.
- No `revalidateTag` consumer currently exists.
- No new tags were added because there is no active revalidation mechanism and Phase 4 must not invent one.

Recommended future convention (DESIGN ONLY — NOT IMPLEMENTED):
```text
wp:posts
wp:post:<locale>:<slug>
wp:pages
wp:page:<locale>:<slug>
wp:categories
wp:category:<locale>:<slug>
wp:menus
wp:menu:<locale>:<location-or-slug>
wp:homepage:<locale>
```

## 6. Duplicate request findings

- Homepage `generateMetadata()` and the page component both call `getFullHomepageData(locale)`.
- `getFullHomepageData` is wrapped in React `cache()`, so the identical function/input is memoized within the same request/render context. No behavior-preserving split was necessary.
- Root `Header` and `Footer` both request the `footer`/navigation menu paths through `getMenuTree`; underlying WordPress fetch calls use one-hour fetch caching and shared menu tags. The calls are not proven duplicate network requests after Next fetch memoization.
- Homepage data uses `Promise.all`, avoiding a serial waterfall among its independent resources.
- No client component duplicates a server-provided data request; live search is independently user-driven.

## 7. Preview and cache findings

- No `draftMode`, preview route, preview token flow, cookies, headers, or user-specific data path was found in `university-next/src`.
- No preview data is placed in shared cache by current frontend code.
- Backend provides preview/revalidation endpoints, but no frontend integration exists.
- Revalidation architecture is:

**DESIGN ONLY — NOT IMPLEMENTED**

A future implementation would require verified authentication/payload contracts, allowlisted tags/paths, and secret validation. No public route was added in Phase 4.

## 8. Revalidation findings

- No `revalidatePath` or `revalidateTag` call exists.
- No webhook secret or revalidation secret exists in frontend environment configuration.
- `wpFetch` accepts tags/revalidate options but does not itself invalidate cache.
- Backend revalidation endpoints are not connected to frontend in this phase.
- No cache policy was changed.

## 9. Environment fallback risk

- `WP_API_URL` and other environment variables have code fallbacks.
- A production build can succeed with fallback URLs if environment variables are missing.
- Static routes can therefore be generated from an unintended backend while still reporting a successful build.
- This risk was identified in Phase 1/3 and not changed in Phase 4 because changing requiredness would alter deployment behavior and requires an explicit runtime policy.

## 10. Changes completed

- No application code or cache policy was changed in Phase 4.
- The temporary homepage service edit was reverted after confirming that the existing React `cache()` already memoizes the duplicate metadata/page call and the edit introduced no required improvement.
- Created this audit report only.
- No backend files were modified.

## 11. Deferred issues

- Resource- and locale-specific cache tag convention.
- Explicit browser cache policy for search/suggest, subject to backend/CORS/runtime evidence.
- Preview and signed revalidation integration.
- Production environment fail-fast behavior.
- Runtime verification of actual cache headers and WordPress behavior.

## 12. Known limitations

- No live WordPress runtime was available for cache smoke tests.
- Build output proves route classification but not all runtime cache headers.
- Next.js fetch cache behavior may vary with deployment/runtime configuration.
- No test script exists in `package.json`.

## 13. Remaining risks

- Broad cache tags make targeted invalidation difficult if a future revalidation mechanism is introduced.
- Fallback API URLs can produce a successful but incorrectly sourced static build.
- Search/suggest browser caching and CORS behavior depend on WordPress response headers/runtime.
- Root layout menu fetch behavior was not measured against a live deployment.

# PHASE 4 RESULT

Overall status: PASS WITH WARNINGS

Files inspected:
- `university-next/src/app/**`
- `university-next/src/lib/wordpress/**`
- `university-next/src/lib/api/**`
- `university-next/src/services/**`
- `university-next/src/components/layout/Header.tsx`
- `university-next/src/components/layout/Footer.tsx`
- `university-next/src/config/env/constants.ts`
- `university-next/src/constants/api.ts`
- `university-next/next.config.ts`

Files changed:
- None

Files created:
- `docs/nextjs-audit/phase-4-rendering-cache.md`

Files moved:
- None

Files deleted:
- None

Routes audited:
- `/`
- `/en`
- `/tin-tuc/[slug]`
- `/en/news/[slug]`
- `/_not-found`

Static routes:
- `/`
- `/en`
- `/_not-found`

ISR routes:
- `/`, `/en` use static output with fetch revalidation evidence (`60s` post data); build output labels them `○` with `1m`.
- No route was labeled ISR without source/build evidence.

Dynamic routes:
- `/tin-tuc/[slug]`
- `/en/news/[slug]`

Client-side fetches:
- `searchPosts`
- `suggestPosts`

Cache policies changed:
- None

Cache tags added or changed:
- None

Duplicate requests removed:
- None; existing React `cache()` memoization was retained.

Revalidation status:
- No frontend revalidation route or invalidation call exists.
- Any future architecture is DESIGN ONLY — NOT IMPLEMENTED.

Runtime smoke tests:
- Not run; no live WordPress runtime available.

Lint:
- PASS, exit code 0; existing warning at `LiveSearch.tsx:252`.

Typecheck:
- PASS, exit code 0 after reverting temporary edit.

Test:
- NOT RUN; no `test` script exists.

Build:
- PASS, exit code 0; build output:
  - `○ /`
  - `○ /_not-found`
  - `○ /en`
  - `ƒ /en/news/[slug]`
  - `ƒ /tin-tuc/[slug]`

Known limitations:
- Runtime cache behavior and HTTP cache headers were not smoke-tested.
- Backend revalidation contract is not integrated.
- No live API endpoint was available.

Remaining risks:
- Broad cache tags.
- Environment fallback can mask wrong production backend.
- Browser search cache/CORS behavior depends on runtime configuration.

Phase 5 prerequisites:
- Verify route/locale behavior and WordPress URL mapping before changing routing.
- Obtain live API responses for route and cache assumptions.
- Keep current cache policies unchanged unless runtime evidence supports a targeted change.

Phase 5 was not started.