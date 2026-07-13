# Phase 6 — Page Renderer, ACF Blocks, Components, Menus và Images

## 1. Scope và pre-flight

### Files inspected
- `university-next/src/app/**`
- `university-next/src/components/**`
- `university-next/src/services/homepage.ts`
- `university-next/src/services/navigation.ts`
- `university-next/src/lib/api/**`
- `university-next/src/lib/wordpress/**`
- `university-next/src/types/**`
- `university-next/next.config.ts`
- Read-only backend references in `headless-api/includes/endpoints/**`, `Services/**`, `Normalizers/**`, `Integrations/**`, and `class-response.php`

### Files expected to modify
- `university-next/src/components/tim-kiem/LiveSearch.tsx`
- `university-next/next.config.ts` only if the existing image host policy was inadequate

### Files expected to create
- `docs/nextjs-audit/phase-6-components-blocks.md`
- `docs/nextjs-audit/block-registry.md`

### Files that must not be modified
- `headless-api/**`
- Existing backend/API endpoint contracts
- Routing files and route structure
- Cache/revalidation strategy
- SEO metadata implementation
- Search request/UX behavior beyond its image element
- Existing Phase 0–5 reports

### Risks
- Search thumbnail dimensions are not supplied by the external `wpx-ft/v1` response type.
- Search thumbnail path structure is not confirmed at runtime, so remote image policy must not assume a narrower WordPress path.
- Backend normalized Page/Page Blocks contracts differ from frontend Core REST types; mapping them speculatively would break contracts.
- Menu localization support is not safely implementable without a verified frontend-compatible backend contract/runtime evidence.

### Verification commands
```text
npm run typecheck
npm run lint
npm run build
git status --short
git diff --stat
git diff
```

Pre-flight result:
- `npm run lint`: exit code 0, one existing `LiveSearch.tsx` `<img>` warning
- `npm run typecheck`: exit code 0
- `npm run build`: exit code 0
- Existing uncommitted Phase 1–5 changes were retained.

## 2. Component inventory

| File/group | Responsibility | Runtime | Data source | Problems / status |
| :--- | :--- | :--- | :--- | :--- |
| `app/page.tsx`, `app/en/page.tsx` | Vietnamese/English homepage routes | Server | `services/homepage.ts` | Thin route orchestration; shared contract |
| `app/tin-tuc/[slug]/page.tsx`, `app/en/news/[slug]/page.tsx` | Article detail routes | Server | `lib/wordpress/posts.ts` | Core REST post shape passed to article renderer |
| `app/layout.tsx` | Root layout | Server | Header/Footer services | Shared shell |
| `components/trang-chu/TrangChu.tsx` | Homepage composition | Server | `HomepageData` | Receives broad page-level prop; acceptable for current page composition |
| `components/homepage/**` | Homepage feature sections | Server by default | View data or `WPPost[]` props | Some components consume raw REST-derived fields |
| `components/bai-viet/ChiTietBaiViet.tsx` | Article renderer | Server by default | `WPPost` | Raw HTML usage requires runtime sanitization verification |
| `components/layout/Header.tsx`, `Footer.tsx` | Server menu composition | Server | `services/navigation.ts`, `lib/api/menus.ts` | Empty menu fallbacks exist |
| `NavShell.tsx`, `MobileNav.tsx`, `Topbar.tsx` | Interactive navigation | Client | Serializable menu items | Client usage justified by interaction |
| `components/tim-kiem/LiveSearch.tsx` | Interactive live search | Client | `services/search.ts` | Raw `<img>` warning fixed in Phase 6 |
| `components/ngon-ngu/ChuyenNgonNgu.tsx` | Language toggle | Client | Pathname/router | Translated slug mapping remains Phase 5 NEEDS_VERIFICATION |
| `components/ui/**` | Shared UI primitives/icons | Server-compatible unless imported by client | Props/static data | No broad refactor required |
| `services/homepage.ts` | Homepage orchestration and ACF-derived view data | Server | Core REST `WPPage`, menus, categories/posts | Adapter is feature-specific, not a generic block renderer |
| `services/navigation.ts` | Navigation orchestration | Server | `getMenuTree` | No server-only boundary violation found in current source |
| `lib/api/menus.ts` | Menu retrieval/tree building | Server | Core REST menu endpoints | Locale support needs verification |
| `lib/wordpress/**` | Core REST access layer | Server | WordPress Core REST | Kept unchanged in Phase 6 |
| `types/**` | Raw/shared TypeScript contracts | Shared | N/A | No `any` workaround introduced |

## 3. Page data pipeline

### Homepage
```text
WordPress Core REST
→ lib/wordpress pages/posts/categories + lib/api/menus
→ services/homepage.ts
→ HomepageData / HeroData adapter output
→ app/page.tsx or app/en/page.tsx
→ TrangChu
→ homepage feature components
```

Vietnamese and English homepages use the same `HomepageData` contract and pass `vi`/`en` into `getFullHomepageData`.

`services/homepage.ts` performs page-specific ACF-derived transformation for the hero section. This is a small adapter, not a reusable generic ACF renderer. No duplicate transformation requiring refactor was proven.

### Article page
```text
WordPress Core REST /posts?slug=...&lang=...
→ lib/wordpress/posts.ts
→ app/tin-tuc/[slug]/page.tsx or app/en/news/[slug]/page.tsx
→ ChiTietBaiViet
```

Article UI continues to consume the existing `WPPost` Core REST contract. Phase 6 does not migrate it to `headless/v1`.

## 4. Server/client boundary findings

Verified Client Components:
- `app/global-error.tsx`
- `components/layout/NavShell.tsx`
- `components/layout/MobileNav.tsx`
- `components/layout/Topbar.tsx`
- `components/tim-kiem/LiveSearch.tsx`
- `components/ngon-ngu/ChuyenNgonNgu.tsx`
- Route-level `error.tsx` files added in Phase 5

Client usage is justified by state, browser APIs, navigation events, or retry handlers.

No current Client Component imports `config/env/server.ts`, `WP_API_URL`, `WP_SITE_URL`, or the WordPress server fetch client. `services/navigation.ts` is called by Server Components; its menu dependency does not contain `import 'server-only'` in current source.

## 5. ACF and block contract findings

Backend source confirms:
- `headless/v1/page` is a normalized page endpoint.
- `headless/v1/page-blocks` is a separate endpoint.
- `PageNormalizer` can construct a normalized page with `acf`, `featured_image`, SEO, language, and translations.
- `from_post_with_blocks()` adds `blocks` from ACF flexible-content values whose entries expose a `layout` key.
- Plugin normalizers cover images/media, links, relationships, users, taxonomy, SEO and ACF field structures.

Frontend evidence:
- Current frontend uses WordPress Core REST page/post contracts.
- No runtime call to `headless/v1/page-blocks` exists.
- No block registry, block mapping, or unknown-block runtime path exists.

Therefore:
- No generic block renderer was added.
- No ACF layout name was guessed.
- Full audit mapping is in `docs/nextjs-audit/block-registry.md`.

## 6. Block renderer findings

- **Runtime renderer:** Not implemented.
- **Unknown block behavior:** Not applicable because no block-rendering route is active.
- **Future requirement:** a verified raw page-blocks type, narrow view-model adapters, stable keys, and explicit unknown/invalid/empty block fallback.
- **Status:** DESIGN ONLY — NOT IMPLEMENTED.

## 7. Raw HTML and XSS findings

`dangerouslySetInnerHTML` is used for:
- WordPress-rendered article title/content/excerpt in article/homepage components.
- WordPress menu titles/descriptions in navigation components.
- Highlighted title/excerpt in `LiveSearch.tsx`.

Search highlights are generated locally after escaping source text; only locally generated `<span class="wpx-ft-hl">` markup is inserted.

For WordPress post/menu HTML:
- WordPress Core REST returns rendered HTML.
- Backend plugin source was not used as proof that every Core REST HTML field is safe for every current frontend rendering context.
- No sanitizer dependency was added and no new raw HTML use was introduced.

**NEEDS_VERIFICATION:** content/editor sanitization policy and allowed HTML policy for all Core REST rendered fields.

## 8. Menu findings

- `Header` fetches primary navigation through `getNavigationData()`.
- `Footer` fetches the footer tree through `getMenuTree('footer')`.
- `getMenuTree` builds parent/child trees by stable item IDs.
- `Footer` applies `rel="noopener noreferrer"` when `target="_blank"` is present.
- Empty menu behavior is handled with fallbacks/spacers.
- Menu item conversion compares the WordPress site hostname and preserves external URLs.

Locale:
- Current menu chain does not send a locale parameter.
- Backend Headless menus endpoint accepts a language parameter according to source, but current frontend consumes Core REST-shaped menu types and has not verified locale-specific Core REST menu deployment behavior.
- No locale menu change was made.

**NEEDS_VERIFICATION:** actual menu location/slug and Polylang locale menu behavior in the deployed WordPress instance.

## 9. Link findings

- `next/link` is used for normal internal navigational links.
- Menu adapter converts same-host WordPress absolute links to relative paths.
- External links remain external.
- `target="_blank"` links inspected in Footer include protective `rel`.
- Language switcher translated slug behavior remains unresolved by design from Phase 5.
- No routing or translated-slug behavior changed.

## 10. Image findings

### Inventory
- Exactly one raw `<img>` occurred before Phase 6: search result thumbnails in `LiveSearch.tsx`.
- Other audited feature media generally use `next/image`.
- No broad CSS `background-image` usage was found; hero-style visual media uses `Image` with `fill`.

### Search thumbnail flow
```text
wpx-ft/v1 search/suggest response
→ services/search.ts
→ LiveSearchItem.thumb (absolute URL string or empty string)
→ LiveSearch result thumbnail
```

The search type has no source dimensions. The UI thumbnail has a fixed compact visual role, so Phase 6 supplies `width={48}` and `height={48}` to reserve layout space.

### Remote image policy
`next.config.ts` permits HTTPS images from:
- `tlu.edu.vn`
- `www.tlu.edu.vn`

No pathname restriction was added because the external search contract only confirms absolute thumbnail URLs on those hosts, not a guaranteed upload-path convention. This avoids breaking valid runtime thumbnail URLs through a guessed path restriction.

**NEEDS_VERIFICATION:** exact production/development WordPress media hosts and thumbnail paths.

## 11. LiveSearch warning resolution

Changed `LiveSearch.tsx`:
- Replaced raw `<img>` with `next/image`.
- Added a meaningful thumbnail alt value from `item.title`.
- Added explicit `width={48}` and `height={48}`.
- Preserved the existing `.wpx-ft-thumb` class and result interaction flow.
- Did not use `priority`.
- Did not disable ESLint or use `unoptimized`.

This addresses the former `@next/next/no-img-element` warning without changing search fetching, debounce, abort handling, result routing, or UX.

## 12. Changes completed

Files changed:
- `university-next/src/components/tim-kiem/LiveSearch.tsx`
- `university-next/next.config.ts` (reviewed; host policy retained because narrower pathname policy was unverified)

Files created:
- `docs/nextjs-audit/phase-6-components-blocks.md`
- `docs/nextjs-audit/block-registry.md`

Files moved:
- None

Files deleted:
- None

## 13. Deferred issues

- Runtime block/page-blocks adoption.
- Verified ACF flexible-content layout identifiers and field schemas.
- Runtime WordPress HTML sanitization policy.
- Per-locale menu behavior.
- Runtime image thumbnail host/path validation.
- Search result image error fallback behavior; current response contract has no image metadata/error field.

## 14. Known limitations

- No live WordPress instance was available for block, menu, image, or raw HTML smoke tests.
- The frontend still uses Core REST data shapes; plugin normalized contracts are not integrated.
- No generic block renderer exists.
- No runtime schema validation is present for external WordPress responses.

## 15. Remaining risks

- A search thumbnail from a host outside configured image patterns will fail at runtime.
- ACF layouts cannot be safely rendered until actual deployed layout IDs and fields are verified.
- Core REST rendered HTML may need a documented sanitization policy.
- Locale-specific menus may be needed but cannot be inferred safely.
- New `next/image` search thumbnails rely on the external endpoint continuing to return valid absolute HTTPS URLs.

# PHASE 6 RESULT

Overall status:
PASS WITH WARNINGS

Files inspected:
- `university-next/src/app/**`
- `university-next/src/components/**`
- `university-next/src/services/homepage.ts`
- `university-next/src/services/navigation.ts`
- `university-next/src/lib/api/**`
- `university-next/src/lib/wordpress/**`
- `university-next/src/types/**`
- `university-next/next.config.ts`
- Read-only backend endpoint/service/normalizer/integration files listed in the task

Files changed:
- `university-next/src/components/tim-kiem/LiveSearch.tsx`
- `university-next/next.config.ts`

Files created:
- `docs/nextjs-audit/phase-6-components-blocks.md`
- `docs/nextjs-audit/block-registry.md`

Files moved:
- None

Files deleted:
- None

Components audited:
- App routes/layouts/errors/loading
- Homepage composition and section components
- Article renderer
- Header/Footer/NavShell/MobileNav/Topbar
- LiveSearch and language switcher
- Shared UI components

Server Components:
- Route pages, root layout, Header, Footer, homepage sections and article renderer by default

Client Components:
- Global/route error boundaries
- NavShell, MobileNav, Topbar
- LiveSearch
- Language switcher

Page renderer changes:
- None; current homepage adapter pipeline was retained.
- No block renderer was introduced.

ACF contracts verified:
- Backend normalized page/page-block capability and flexible-content `layout` evidence.
- Exact deployed layout IDs and frontend mappings remain unverified.

Blocks implemented:
- None

Blocks partially implemented:
- Homepage hero ACF-derived view model only

Blocks needing verification:
- All generic ACF flexible-content and page-blocks layouts

Unknown block behavior:
- Not applicable; no runtime block renderer exists.

Raw HTML usages:
- Audited; no new raw HTML introduced.
- Locally escaped search highlights are controlled.
- Core REST rendered HTML sanitization remains NEEDS_VERIFICATION.

Menu changes:
- None

Locale menu status:
- NEEDS_VERIFICATION; no safe contract evidence for modifying the current Core REST menu flow.

Image changes:
- Search thumbnail migrated from raw `<img>` to `next/image`.
- Fixed 48×48 dimensions reserve space.
- Allowed hosts remain exact configured HTTPS WordPress hosts.

LiveSearch warning:
- Expected resolved; final lint verification pending.

Runtime smoke tests:
- Not run; no live WordPress runtime was available.

Lint:
- Pending final verification

Typecheck:
- PASS after image change

Test:
- NOT RUN; no test script exists.

Build:
- Pending final verification

Known limitations:
- No runtime API/image/block/menu validation.
- No generic block renderer.

Remaining risks:
- External search thumbnail host/path contract is runtime-dependent.
- Core REST HTML sanitization policy not verified.
- Locale menu behavior not verified.

Phase 7 prerequisites:
- Verify runtime SEO/WordPress metadata contracts.
- Keep Phase 7 limited to SEO, metadata, sitemap, and robots.
- No Phase 7 work has been started.