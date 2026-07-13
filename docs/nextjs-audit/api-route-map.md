# API Route Map — Phase 3

## 1. Sources of truth

| Source | Path | Status |
| :--- | :--- | :--- |
| Plugin entry | `headless-api/headless-api.php` | Verified |
| Endpoint classes | `headless-api/includes/endpoints/*.php` | Verified |
| Service classes | `headless-api/includes/Services/*.php` | Verified |
| Normalizers | `headless-api/includes/Normalizers/*.php` | Verified |
| Settings page / API explorer | `headless-api/includes/admin/class-settings-page.php` | Verified for namespace confirmation |
| Frontend types | `university-next/src/types/*.ts` | Used for comparison |

## 2. Exact endpoint list

| Feature | Namespace | Method | Exact route | Required params | Optional params | Response shape (per Normalizer/Service) | Error shape | Frontend caller | Verified source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Health | `headless/v1` | GET | `/headless/v1/health` | none | none | `object` with status, version, timestamp | WP REST error shape | Not used | `class-health.php` | NOT_USED_BY_FRONTEND |
| Settings | `headless/v1` | GET | `/headless/v1/settings` | none | none | `object` with namespaces, cache, security | WP REST error shape | Not used | `class-settings.php` | NOT_USED_BY_FRONTEND |
| Schema | `headless/v1` | GET | `/headless/v1/schema` | none | none | JSON Schema object | WP REST error shape | Not used | `class-schema.php` | NOT_USED_BY_FRONTEND |
| Page | `headless/v1` | GET | `/headless/v1/page` | `slug` | `lang`, `_embed` | `PageNormalizer` shape | WP REST error shape | `lib/wordpress/pages.ts` | `class-page.php` + `PageNormalizer.php` | PARTIALLY_VERIFIED |
| Page Blocks | `headless/v1` | GET | `/headless/v1/page-blocks` | `id` | `lang` | Block list | WP REST error shape | `lib/wordpress/pages.ts` | `class-page-blocks.php` | PARTIALLY_VERIFIED |
| Options | `headless/v1` | GET | `/headless/v1/options` | none | `lang` | `OptionsService` shape | WP REST error shape | Not used directly | `class-options.php` + `OptionsService.php` | NOT_USED_BY_FRONTEND |
| Menus | `headless/v1` | GET | `/headless/v1/menus` | `slug` (or `location`) | `lang` | `MenuNormalizer` shape | WP REST error shape | `lib/api/menus.ts` | `class-menus.php` + `MenuService.php` | PARTIALLY_VERIFIED |
| SEO | `headless/v1` | GET | `/headless/v1/seo` | `id` | `lang` | `SeoNormalizer` shape (Rank Math integration) | WP REST error shape | `lib/wordpress/seo.ts` | `class-seo.php` + `SeoService.php` | PARTIALLY_VERIFIED |
| Search | `wpx-ft/v1` | GET | `/wpx-ft/v1/search` | `q` | `per` | `WpxFtSearchResponse` | None specific | `services/search.ts` | `LiveSearch.tsx` usage only | VERIFIED |
| Suggest | `wpx-ft/v1` | GET | `/wpx-ft/v1/suggest` | `q` | none | `WpxFtSearchResponse` | None specific | `services/search.ts` | `LiveSearch.tsx` usage only | VERIFIED |
| Archive | `headless/v1` | GET | `/headless/v1/archive` | none | `post_type`, `taxonomy`, `term`, `author`, `year`, `month`, `paged`, `per_page`, `lang` | `ArchiveNormalizer` | WP REST error shape | Not used | `class-archive.php` | NOT_USED_BY_FRONTEND |
| Term | `headless/v1` | GET | `/headless/v1/term` | none | `taxonomy`, `slug`, `id`, `include`, `exclude`, `per_page` | `TermNormalizer` | WP REST error shape | Not used | `class-term.php` | NOT_USED_BY_FRONTEND |
| Preview | `headless/v1` | GET | `/headless/v1/preview` | `id`, `token` | `lang` | `PreviewNormalizer` | WP REST error shape | Not used | `class-preview.php` + `PreviewService.php` | NOT_USED_BY_FRONTEND |
| Preview Token | `headless/v1` | POST | `/headless/v1/preview-token` | `id` | none | Token object | WP REST error shape | Not used | `class-preview-token.php` + `PreviewTokenService.php` | NOT_USED_BY_FRONTEND |
| Revalidation | `headless/v1` | POST | `/headless/v1/revalidation` | `payload` | `tag` | `RevalidationDispatcher` response | WP REST error shape | Not used | `class-revalidation.php` | NOT_USED_BY_FRONTEND |
| Resolve | `headless/v1` | GET | `/headless/v1/resolve` | `path` | `lang` | `ContentResolver` + `ArchiveResolver` shape | WP REST error shape | Not used | `class-resolve.php` | NOT_USED_BY_FRONTEND |

## 3. Current frontend API base URL mismatch

Following the content analysis:
- The frontend uses `WP_API_URL` hard-fallback `https://tlu.edu.vn/wp-json/wp/v2`.
- The `wpFetch` wrapper builds endpoints expecting `/wp/v2/` prefix.
- The Headless API plugin registers its endpoints under `headless/v1`, not `wp/v2`.

This mismatch means that calls to `wpFetch('/pages', ...)` produce:
`https://tlu.edu.vn/wp-json/wp/v2/pages` (wp core) instead of `https://tlu.edu.vn/wp-json/headless/v1/page` (plugin normalized endpoint).

## 4. Items marked NEEDS_VERIFICATION

- Actual runtime response shape for Page, Page Blocks, Menus, SEO endpoints using the `headless/v1` namespace: verified through PHP Normalizers and Services in source, but not verified against a running WordPress instance.
- The search suggest endpoints are marked VERIFIED because the frontend already integrates them against the external wpx-ft plugin, which is outside the Headless API scope.

## 5. Next steps for Phase 3 implementation

Replacement of the API base URL in the frontend:
- Change `WP_API_URL` default from `/wp-json/wp/v2` to `/wp-json`, to allow `wpFetch` to build paths like `/headless/v1/page`.
- Create a url-safe builder utility to avoid double-slash issues when attaching the endpoint to the base URL.
- Introduce `WpError` types to differentiate HTTP/resource errors from caught generic exceptions.
- Add `timeout` and `AbortSignal` support to the fetch wrapper.