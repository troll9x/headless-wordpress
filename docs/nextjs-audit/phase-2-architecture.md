# Phase 2 — Kiến trúc thư mục và Ranh giới Module

## 1. Current architecture

Dự án dùng Next.js App Router trong `university-next/src/`:

- `app/`: routes, layouts, loading và global error boundary.
- `components/`: tách thành `ui`, `layout`, homepage, bài viết, ngôn ngữ và tìm kiếm.
- `config/`: cấu hình environment phân tách theo public/server/constants.
- `constants/`: hằng số domain, route, locale, category và compatibility exports.
- `lib/`: WordPress fetch client, endpoint helpers, i18n, SEO và utilities.
- `services/`: orchestration cho homepage, navigation và search.
- `hooks/`: custom React hooks.
- `types/`: type definitions.
- `styles/`: CSS variables.

App Router routes hiện tại:
- `/`
- `/en`
- `/tin-tuc/[slug]`
- `/en/news/[slug]`

## 2. Phân loại file quan trọng

| Khu vực | File / nhóm file | Phân loại | Runtime / ghi chú |
| :--- | :--- | :--- | :--- |
| `app` | `page.tsx`, `en/page.tsx`, `tin-tuc/[slug]/page.tsx`, `en/news/[slug]/page.tsx` | Route, Server Component | Fetch và render route-level |
| `app` | `layout.tsx`, `loading.tsx` | Layout, Server Component | Root shell/loading |
| `app` | `global-error.tsx` | Layout/Error boundary, Client Component | Có `"use client"` theo yêu cầu Next |
| `components/ui` | `Logo`, `Breadcrumb`, `NewsCard`, `SectionHeader`, `SectionTitle`, `LoadingSpinner`, `icons` | Shared UI Component | Reusable presentation |
| `components/layout` | `Header`, `Footer` | Layout Component, Server Component | Fetch/navigation composition |
| `components/layout` | `NavShell`, `MobileNav`, `Topbar` | Layout/Feature Component, Client Component | Interactive navigation |
| `components/homepage` | `*Section.tsx`, `HeroBanner`, `RectorBanner`, `MomentsGallery` | Feature Component | Homepage presentation |
| `components/bai-viet` | `ChiTietBaiViet.tsx` | Feature Component | Article rendering |
| `components/tim-kiem` | `LiveSearch.tsx` | Feature Component, Client Component | Interactive search |
| `components/ngon-ngu` | `ChuyenNgonNgu.tsx` | Feature Component, Client Component | Language interaction |
| `config/env` | `public.ts`, `server.ts`, `constants.ts` | Configuration | Public/server boundary and non-env constants |
| `constants` | `api.ts`, `categories.ts`, `duong-dan.ts`, `ngon-ngu.ts`, `seo.ts`, `site.ts` | Configuration | Static data and compatibility aliases |
| `lib/wordpress` | `client.ts`, `posts.ts`, `pages.ts`, `categories.ts`, `polylang.ts`, `seo.ts` | API Client / Data access | WordPress REST layer |
| `lib/api` | `homepage.ts`, `menus.ts` | Data fetching / adapter | Endpoint-specific composition |
| `services` | `homepage.ts`, `navigation.ts`, `search.ts` | Service | Use-case orchestration; search is client-safe |
| `lib/i18n`, `lib/seo`, `lib/utils` | relevant files | Utility | Routing, metadata/schema and helpers |
| `hooks` | `useScrollLock.ts` | Hook | Used by `NavShell` |
| `types` | all files | Type | Type-only contracts |

## 3. Module responsibility table

| File | Responsibility | Runtime | Called by | Problems |
| :--- | :--- | :--- | :--- | :--- |
| `src/services/search.ts` | Browser search/suggest request and URL normalization | Client | `LiveSearch.tsx` | Uses a separate WordPress base URL from server API layer by necessity; API contract review deferred to Phase 3 |
| `src/services/homepage.ts` | Orchestrates homepage data and normalizes view data | Server | Homepage routes | Contains several feature-specific fallback decisions; no change in Phase 2 |
| `src/lib/wordpress/client.ts` | Typed WordPress REST fetch wrapper with Next cache options | Server | `lib/wordpress/*`, `lib/api/*` | Error behavior/API contract deferred to Phase 3 |
| `src/lib/api/menus.ts` | Menu endpoint access and menu tree conversion | Server | Navigation/layout data fetchers | URL normalization tied to `WP_SITE_URL`; contract validation deferred to Phase 3 |
| `src/constants/api.ts` | Public-safe compatibility aliases and caching constants | Shared | App, components, lib | Fixed: no longer imports or exports private server environment values |
| `src/config/env/public.ts` | Browser-exposed environment variables only | Shared/client-safe | Public constants and search integration | Fixed static `process.env.NEXT_PUBLIC_*` access for Next client substitution |
| `src/config/env/server.ts` | Private WordPress environment variables | Server | WordPress client and menu adapter | Must remain direct-import only |
| `src/config/env.ts` | Public-safe environment/constants entry point | Shared/client-safe | `constants/api.ts` | Does not re-export server env |

## 4. Server/client boundary findings

### Fixed
**ARC-001 — Server environment leakage through shared barrel**
- **Severity:** HIGH
- **Status:** Fixed
- **Files:** `src/constants/api.ts`, `src/config/env.ts`, `src/lib/wordpress/client.ts`, `src/lib/api/menus.ts`
- **Evidence:** `MobileNav.tsx` is a Client Component and imports `SITE_NAME` from `constants/api.ts`. The shared constants module previously imported/re-exported `WP_API_URL` and `WP_SITE_URL` from `config/env/server.ts`.
- **Change:** Private environment exports were removed from `constants/api.ts` and the shared `config/env.ts` entry point. Server modules import private URLs directly from `config/env/server.ts`.
- **Impact:** Client dependency path no longer includes the private WordPress environment module.

**ARC-002 — Dynamic public environment lookup**
- **Severity:** MEDIUM
- **Status:** Fixed
- **File:** `src/config/env/public.ts`
- **Evidence:** The previous helper read `process.env[key]` dynamically. Next.js public environment replacement relies on statically referenced `process.env.NEXT_PUBLIC_*`.
- **Change:** Replaced dynamic key access with static `process.env.NEXT_PUBLIC_WP_BASE_URL`, `process.env.NEXT_PUBLIC_SITE_URL`, and `process.env.NEXT_PUBLIC_SITE_NAME`.

### Verified
- Client Components found: `global-error.tsx`, `ChuyenNgonNgu.tsx`, `LiveSearch.tsx`, `MobileNav.tsx`, `Topbar.tsx`, `NavShell.tsx`.
- No `"use server"` directive was found in source files.
- `src/config/env/server.ts` now uses `import 'server-only'`, so Next.js rejects accidental imports from Client Components.
- No Client Component imports `src/config/env/server.ts`, `WP_API_URL`, or `WP_SITE_URL` after the refactor.
- No Server Component was found using client-only React hooks illegally.

## 5. Dependency findings

- No circular dependency was found in the audited static import graph.
- No import from `lib` or `services` into UI/components was found.
- No service imports UI components.
- `@/` alias is consistently used for project imports; no problematic deep relative import was found.
- `src/hooks/index.ts` contained only `export {}` and had no references. It was removed as confirmed dead code.
- `src/constants/api.ts` is retained because it provides stable aliases used by existing components and server files; it is not a dead-code candidate.

## 6. Duplicate code findings

| Candidate | Evidence | Decision |
| :--- | :--- | :--- |
| WordPress base URLs in `services/search.ts` and `config/env/server.ts` | Search requires a browser-visible WordPress site base URL; server fetch requires a private REST API endpoint | Not merged; different runtime and URL shapes. API alignment deferred to Phase 3. |
| URL validation in `config/env/public.ts` and `config/env/server.ts` | Both validate HTTP/HTTPS URLs independently | Kept separate to preserve server/client import boundaries; extracting a shared utility is optional and should only happen if it remains client-safe. |
| Homepage data access in `lib/api/homepage.ts` and `services/homepage.ts` | `lib/api` fetches endpoint data; service coordinates page use case | Not duplicate; responsibilities are complementary. |

## 7. Dead code candidates

| File | Evidence | Action |
| :--- | :--- | :--- |
| `src/hooks/index.ts` | Only `export {}`; no imports/references; not a Next convention/config entry point | Deleted in Phase 2 |
| Selected unreferenced exported types | Static search may not observe dynamic/type-only uses | Marked needs verification; not deleted |

## 8. Changes completed

- Removed `src/hooks/index.ts`.
- Removed private WordPress environment values from shared barrels reachable by Client Components.
- Kept private values direct-imported only by server data modules and guarded them with `import 'server-only'`.
- Changed public environment access to static `NEXT_PUBLIC_*` references.
- No route, component UI, API endpoint, contract, cache, SEO, or business behavior was changed.

## 9. Deferred issues

- `LiveSearch.tsx:252` uses `<img>` and creates the existing `@next/next/no-img-element` warning. This is a component/image optimization concern, deferred to Phase 6.
- WordPress endpoint contracts, error normalization, timeout handling, and response validation belong to Phase 3.
- Data-fetch/cache policy belongs to Phase 4.
- Search behavior and client search endpoint validation belong to Phase 8.
- ACF `Record<string, unknown>` values are intentional for unstructured WordPress data; schema validation is deferred to Phase 3.

## 10. Remaining risks

- Existing fallback values can silently point a deployment to incorrect WordPress URLs if production environment variables are omitted.
- Static import analysis cannot prove dynamic imports or external runtime consumers; no such use was found.
- There is no automated circular-dependency checker; audit was source-based.

---

# PHASE 2 RESULT

**Overall status:** PASS

**Files inspected:**
- `src/app/**`
- `src/components/**`
- `src/constants/**`
- `src/config/**`
- `src/hooks/**`
- `src/lib/**`
- `src/services/**`
- `src/styles/**`
- `src/types/**`
- `package.json`
- `tsconfig.json`

**Files changed:**
- `src/constants/api.ts`
- `src/config/env/public.ts`
- `src/config/env/server.ts`

Các thay đổi chưa commit từ Phase 1 trong `package.json`, `src/lib/wordpress/client.ts`, `src/lib/api/menus.ts`, `src/config/**` và `.env.example` được giữ nguyên.

**Files created:**
- `docs/nextjs-audit/phase-2-architecture.md`
- `docs/nextjs-audit/target-tree.md`

**Files moved:** None

**Files deleted:**
- `src/hooks/index.ts`

**Server Components found:**
- 4 route page components.
- Root layout và loading boundary.
- Các component không có `"use client"` tiếp tục dùng server boundary mặc định của App Router.

**Client Components found:**
1. `src/app/global-error.tsx`
2. `src/components/ngon-ngu/ChuyenNgonNgu.tsx`
3. `src/components/tim-kiem/LiveSearch.tsx`
4. `src/components/layout/MobileNav.tsx`
5. `src/components/layout/Topbar.tsx`
6. `src/components/layout/NavShell.tsx`

**Server/client boundary issues:**
- 1 issue mức HIGH đã sửa: private server env từng đi qua shared barrel được Client Component import.
- Sau sửa, `WP_API_URL` và `WP_SITE_URL` chỉ được import từ `src/config/env/server.ts` bởi server data modules.
- `src/config/env/server.ts` được bảo vệ bằng `import 'server-only'`.
- Không còn Client Component import private env.

**Circular dependency issues:** Không phát hiện trong static source audit.

**Duplicate candidates:**
- URL validation public/server: giữ riêng để bảo vệ runtime boundary.
- WordPress URL của client search và server REST API: khác runtime và URL shape, không gộp.
- Homepage API adapter và homepage service: trách nhiệm bổ sung, không phải duplicate.

**Dead code candidates:**
- `src/hooks/index.ts`: đã xác minh không có reference và đã xóa.
- Một số exported type chưa có reference rõ ràng: `NEEDS_VERIFICATION`, không xóa.

**Lint:** PASS — exit code 0; còn 1 warning tại `src/components/tim-kiem/LiveSearch.tsx:252`, defer sang Phase 6.

**Typecheck:** PASS — exit code 0.

**Test:** N/A — không có script test.

**Build:** PASS — exit code 0.

**Known limitations:**
- Dependency graph được audit từ source, không cài thêm dependency analyzer.
- Không thể chứng minh mọi external/dynamic consumer chỉ bằng static search.

**Remaining risks:**
- Fallback URL có thể che giấu environment production bị thiếu.
- API contract, response validation và error normalization chưa được audit vì thuộc Phase 3.
- Warning `<img>` của LiveSearch thuộc Phase 6.

**Phase 3 prerequisites:**
- Phải xác minh endpoint và response bằng plugin source, schema hoặc response thực tế.
- Không suy đoán API contract.
- Giữ nguyên ranh giới server/public đã thiết lập.
- Bắt đầu Phase 3 bằng audit riêng; Phase 3 chưa được thực hiện trong lần này.
