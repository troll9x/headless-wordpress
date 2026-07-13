# Phase 3 — WordPress API Contract và API Client

## 1. Sources of truth used

Ưu tiên source PHP backend tại commit local:

- Repository: `headless-api/`
- Branch: `master`
- Commit: `20a272542e45377a06e4559de883338c6890d822`
- `headless-api/headless-api.php`
- `headless-api/includes/class-loader.php`
- `headless-api/includes/endpoints/**`
- `headless-api/includes/Services/**`
- `headless-api/includes/Normalizers/**`
- `headless-api/includes/class-response.php`
- `headless-api/includes/Normalizers/PageNormalizer.php`

Source PHP được ưu tiên hơn các nhận định cũ trong tài liệu audit frontend.

## 2. Backend documents available

### Available
- Plugin entry point.
- Endpoint classes.
- Services.
- Normalizers.
- Response factory.
- Loader.

### Missing
Các file được yêu cầu không tồn tại trong checkout backend:

- `headless-api/docs/current-api-routes.md`
- `headless-api/docs/rest-route-registry.md`
- `headless-api/docs/current-architecture.md`

Các route được ghi nhận trong `api-route-map.md` chỉ được đánh dấu `VERIFIED` khi có bằng chứng trực tiếp từ `register_rest_route` hoặc source PHP tương ứng.

## 3. Current frontend API architecture

- `src/lib/wordpress/client.ts` cung cấp `wpFetch<T>` và `wpFetchUrl<T>`.
- `src/lib/wordpress/posts.ts`, `pages.ts`, `categories.ts` dùng WordPress Core REST API shape (`WPPost`, `WPPage`, `WPCategory`).
- `src/lib/api/menus.ts` gọi menu endpoints qua cùng wrapper.
- `src/services/search.ts` thực hiện browser fetch trực tiếp tới namespace `wpx-ft/v1` bằng `NEXT_PUBLIC_WP_BASE_URL`.
- Các route và service hiện tại phụ thuộc vào field shape của WordPress Core REST API.

## 4. API client findings

### Fixed in Phase 3
- Thêm URL builder tại `src/lib/wordpress/url.ts`.
- Chuẩn hóa trailing slash của base URL và leading slash của endpoint.
- Encode query parameters qua `URLSearchParams`.
- Thêm `AbortSignal` và timeout mặc định 10 giây cho `wpFetch`.
- Parse WordPress REST error payload khi có `code`, `message`, `data.status`.
- Phân biệt HTTP/API error với response rỗng hoặc JSON không hợp lệ.
- Không log secret hoặc toàn bộ response.
- Giữ nguyên `next.revalidate` và `next.tags` do cache policy thuộc phạm vi khác.
- Không đổi endpoint core hiện hành sang normalized Headless API khi response shape chưa tương thích.

### Error model
- `WordPressApiError`
  - `status`
  - `code`
  - `endpoint`
  - message an toàn
- `WordPressResponseError`
  - endpoint
  - message an toàn
  - cause nội bộ nếu runtime cung cấp

## 5. URL and environment findings

- `WP_API_URL` có fallback `https://tlu.edu.vn/wp-json/wp/v2`.
- `WP_SITE_URL` là WordPress origin `https://tlu.edu.vn`.
- `NEXT_PUBLIC_WP_BASE_URL` là WordPress origin public cho browser search.
- `NEXT_PUBLIC_SITE_URL` là frontend origin.
- URL builder không dùng thao tác replace mơ hồ trên toàn URL; chỉ loại trailing slash ở base và chuẩn hóa endpoint path.
- Không đưa `WP_API_URL` hoặc `WP_SITE_URL` vào Client Component.
- `src/config/env/server.ts` vẫn là server-only và được bảo vệ bởi `import 'server-only'`.

## 6. Backend contract findings

### Verified namespaces
`headless-api/headless-api.php` định nghĩa:

- Legacy: `tlu/v1`
- Generic: `headless/v1`

`class-loader.php` nạp các endpoint:
- Health
- Settings
- Schema
- Page
- Page Blocks
- Options
- Menus
- SEO
- Search
- Suggest
- Preview
- Preview Token
- Revalidation
- Archive
- Term
- Resolve
- Cache

### Critical response compatibility finding
`class-page.php` gọi `Response::success($data)`, và `PageNormalizer.php` trả object normalized gồm các field như:

- `id`
- `slug`
- `title`
- `excerpt`
- `content`
- `link`
- `type`
- `date`
- `modified`
- `status`
- `template`
- `featured_image`
- `acf`
- `seo`
- `language`
- `translations`

Shape này không phải trực tiếp `WPPage` hiện tại của frontend, vốn dùng `title.rendered`, `excerpt.rendered`, `_embedded` và các field Core REST API. Vì vậy Phase 3 không đổi các caller core sang `headless/v1` nếu chưa có normalizer frontend tương ứng.

## 7. Endpoint status

- Page, Page Blocks, Menus, SEO normalized routes: `PARTIALLY_VERIFIED` từ PHP source; runtime response chưa smoke-tested.
- Health, Settings, Schema, Options, Archive, Term, Preview, Preview Token, Revalidation, Resolve, Cache: backend route source đã được đọc; frontend không dùng trực tiếp.
- Search/Suggest `wpx-ft/v1`: frontend đang gọi namespace này, nhưng namespace này không được chứng minh bởi Headless API source hiện tại; status phải được xem là `NEEDS_VERIFICATION` đối với backend source này.
- Không coi runtime API là PASS khi chưa gọi được WordPress thực tế.

## 8. Response type findings

- Frontend Core REST types vẫn phù hợp với các caller hiện tại đang dùng `/wp/v2`.
- Headless normalized response cần raw types riêng trước khi tích hợp.
- Không thêm `any`.
- `unknown` chỉ nên được chuyển qua type guard/normalizer khi tích hợp response normalized.
- Không dùng cast để giả lập compatibility giữa `PageNormalizer` và `WPPage`.

## 9. Changes completed

Files changed:
- `university-next/src/config/env/server.ts`
- `university-next/src/lib/wordpress/client.ts`

Files created:
- `university-next/src/lib/wordpress/url.ts`
- `university-next/src/lib/wordpress/errors.ts`
- `docs/nextjs-audit/api-route-map.md`
- `docs/nextjs-audit/phase-3-api-contract.md`

Không sửa backend plugin.

## 10. Deferred issues

- Migration từng feature từ `/wp/v2` sang `/headless/v1` cần raw response types và normalizer frontend.
- Xác minh exact runtime response bằng WordPress instance.
- Endpoint `wpx-ft/v1/search` và `wpx-ft/v1/suggest` cần source/runtime riêng.
- Error handling ở các service đang `catch` và chuyển thành `null`/`[]` cần được xem xét theo từng feature, nhưng không đổi behavior trong Phase 3.
- Validation runtime đầy đủ cho generic response chưa thêm dependency mới.

## 11. NEEDS_VERIFICATION

- Ba backend Markdown docs bị thiếu.
- Runtime availability của WordPress.
- CORS và public availability của search/suggest.
- Exact response body của Page, Page Blocks, Menus và SEO.
- Exact route/params của mọi endpoint chưa có đầy đủ bằng chứng trực tiếp trong route map.
- Mapping normalized Headless response sang frontend view model.
- HTTP 401/403/429/5xx thực tế từ deployment.

## 12. Runtime smoke tests

Không thực hiện được runtime WordPress smoke test trong Phase 3 vì không có URL WordPress runtime được xác nhận/khả dụng trong môi trường hiện tại.

Do đó trạng thái không thể là PASS tuyệt đối.

## 13. Verification

| Command | Result | Exit code | Notes |
| :--- | :--- | :---: | :--- |
| `npm run lint` | PASS | 0 | Còn warning `LiveSearch.tsx:252` về `<img>` |
| `npm run typecheck` | PASS | 0 | Không có lỗi TypeScript |
| `npm run build` | PASS | 0 | Build thành công, các route hiện tại vẫn giữ nguyên |
| `npm run test` | NOT RUN | N/A | Không có script test |

## 14. Remaining risks

- Chưa có runtime verification.
- Fallback API URL có thể che giấu environment production thiếu hoặc sai.
- Normalized Headless API chưa được tích hợp vào UI vì khác response contract.
- `wpFetchUrl` hiện dành cho full URL và chưa nhận đầy đủ AbortSignal/timeout như `wpFetch`.
- Warning hình ảnh thuộc phạm vi component/Phase 6.

# PHASE 3 RESULT

Overall status: PASS WITH WARNINGS

Sources of truth:
- `headless-api` PHP source tại commit `20a272542e45377a06e4559de883338c6890d822`
- `headless-api/headless-api.php`
- `headless-api/includes/class-loader.php`
- `headless-api/includes/endpoints/**`
- `headless-api/includes/Services/**`
- `headless-api/includes/Normalizers/**`
- `headless-api/includes/class-response.php`
- `headless-api/includes/Normalizers/PageNormalizer.php`

Backend files inspected:
- `headless-api/headless-api.php`
- `headless-api/includes/class-loader.php`
- endpoint classes trong `headless-api/includes/endpoints/**`
- service classes trong `headless-api/includes/Services/**`
- normalizer classes trong `headless-api/includes/Normalizers/**`
- `headless-api/includes/class-response.php`

Frontend files inspected:
- `university-next/src/lib/wordpress/client.ts`
- `university-next/src/lib/wordpress/posts.ts`
- `university-next/src/lib/wordpress/pages.ts`
- `university-next/src/lib/wordpress/categories.ts`
- `university-next/src/lib/wordpress/seo.ts`
- `university-next/src/lib/api/homepage.ts`
- `university-next/src/lib/api/menus.ts`
- `university-next/src/services/homepage.ts`
- `university-next/src/services/navigation.ts`
- `university-next/src/services/search.ts`
- `university-next/src/components/tim-kiem/LiveSearch.tsx`
- `university-next/src/types/wordpress.ts`
- `university-next/src/types/search.ts`
- `university-next/src/config/env/server.ts`

Files changed:
- `university-next/src/config/env/server.ts`
- `university-next/src/lib/wordpress/client.ts`

Files created:
- `university-next/src/lib/wordpress/url.ts`
- `university-next/src/lib/wordpress/errors.ts`
- `docs/nextjs-audit/api-route-map.md`
- `docs/nextjs-audit/phase-3-api-contract.md`

Files moved: None

Files deleted: None

Endpoints verified:
- Namespace constants `headless/v1` and `tlu/v1`.
- Endpoint registrations read from PHP source.
- Exact runtime response bodies: none.

Endpoints partially verified:
- Page
- Page Blocks
- Menus
- SEO

Endpoints needing verification:
- Runtime responses for all endpoint families.
- `wpx-ft/v1/search`
- `wpx-ft/v1/suggest`
- Missing backend Markdown route documents.
- Exact normalized payload compatibility with current frontend types.

Frontend API callers:
- WordPress Core REST callers in `src/lib/wordpress/*`
- Menu callers in `src/lib/api/menus.ts`
- Browser search caller in `src/services/search.ts` through `LiveSearch.tsx`

API client changes:
- Safe URL joining.
- Encoded query parameters.
- Timeout and caller AbortSignal support in `wpFetch`.
- HTTP/WordPress JSON error parsing.
- Empty/invalid JSON response detection.
- Existing cache/revalidate options preserved.

Error model changes:
- Added `WordPressApiError`.
- Added `WordPressResponseError`.
- Added safe WordPress REST error parser.

Response type changes:
- None; normalized Headless response was intentionally not cast to existing Core REST types.

Runtime smoke tests:
- Not run; no confirmed WordPress runtime endpoint was available.

Lint:
- PASS, exit code 0, one existing `<img>` warning.

Typecheck:
- PASS, exit code 0.

Test:
- NOT RUN; no test script exists.

Build:
- PASS, exit code 0.

Known limitations:
- No runtime API verification.
- Backend Markdown documentation files are absent.
- No frontend normalizer for Headless API response has been introduced.

Remaining risks:
- Existing callers still use Core REST API while Headless API normalized routes are available under a separate namespace.
- Search namespace is not evidenced by the supplied Headless API source.
- `wpFetchUrl` has less complete cancellation/timeout handling than `wpFetch`.

Phase 4 prerequisites:
- Obtain a reachable WordPress runtime or representative real responses.
- Confirm endpoint route/param/response matrix for all frontend-used features.
- Design raw Headless response types and explicit normalizers before migrating Page, Menus or SEO.
- Do not change cache strategy until Phase 4.
- Phase 4 has not been started.