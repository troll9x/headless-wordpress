# API cần bổ sung và sửa cho University Next

Ngày kiểm tra: **21/08/2026**
WordPress production: `https://tlu.edu.vn`
Next.js: thư mục `university-next`

## 1. Kết luận nhanh

### Cập nhật 21/08/2026 — Headless API 1.14.0

Production đã kích hoạt đúng Headless API `1.14.0`, schema `4.7`. Kết quả kiểm tra trực tiếp:

| Nhóm | Endpoint thử nghiệm | Kết quả |
| --- | --- | --- |
| Health/schema | `/tlu/v1/health`, `/tlu/v1/schema` | `200` |
| Media | `/media-gallery/home`, `/media-gallery/categories`, `/media-gallery/categories/khoanh-khac-tlu` | `200` |
| Tổ chức | `/organizations/ban-giam-hieu`, `/organizations/members/hieu-truong-nguyen-trung-viet` | `200` |
| Archive tài liệu | `/documents/categories/van-ban-tai-lieu`, `/documents/categories/van-ban-cua-dang` | `200` |
| Chi tiết tài liệu | `/documents/{slug}` với tài liệu ID `53064` | `404` |

Endpoint Media trang chủ đang trả `configured: true` nhưng `selected_images: []`, trong khi HTML trang chủ WordPress vẫn render đúng 15 ảnh đã chọn và ảnh thứ 7 có class `large`. Nguyên nhân là `MediaGalleryService::get_home_gallery()` lọc các ID đã chọn bằng `is_image_in_category()`, nhưng plugin Sondz Gallery cho phép ảnh đã chọn nằm ngoài category `khoanh-khac-dep`. Cần bỏ điều kiện bắt buộc ảnh thuộc category, chỉ kiểm tra attachment công khai và MIME `image/*`. Frontend tạm đọc đúng 15 ảnh từ markup công khai của trang chủ; khi API trả `selected_images` đầy đủ, fallback này tự ngừng dùng.

Tài liệu ID `53064` vẫn đọc được qua `/wp/v2/tai-lieu`, nhưng chưa có ngôn ngữ Polylang. `DocumentService` mặc định lọc `vi`, nên archive chuyên dụng có `count: 1` nhưng `items: []` và endpoint chi tiết trả `404`. Cần gán tài liệu và các term `loai-tai-lieu` sang tiếng Việt trong WordPress. Frontend vẫn dùng core REST fallback nên trang không bị 404.

Next.js hiện đã đọc được bài viết, chuyên mục, khoa/đơn vị, tài liệu, SEO và tìm kiếm từ WordPress. Không cần viết lại các API đó.

Các hạng mục cần làm phía WordPress:

| Ưu tiên | Endpoint | Trạng thái production | Việc cần làm |
| --- | --- | --- | --- |
| P0 | `GET /wp-json/tlu/v1/partner-logos` | `404` | Đăng ký endpoint đọc ACF repeater logo đối tác. |
| P0 | `GET /wp-json/acw/v1/sidebar` | `404` | Kích hoạt REST adapter của Auto Category Widget. |
| P0 | `GET /wp-json/headless/v1/page` | `500` với `page` và `tai-lieu` | Sửa xử lý `WP_Error` và lỗi trong quá trình normalize nội dung. |
| P0 | `GET /wp-json/headless/v1/menus` | `404` với location thử nghiệm; gọi không tham số bị `500` | Chốt location/menu slug thật và sửa endpoint để không fatal. |
| P1 | `GET /wp-json/headless/v1/term/loai-tai-lieu/{slug}` | Trả JSON đúng nhưng HTTP `404` | Sửa status thành `200` khi term tồn tại. |
| P1 | `GET /wp-json/headless/v1/resolve` | Resolve theo slug bài viết được; page/path Permalink Manager lỗi | Sửa resolver và cách trả `WP_Error`. |

Hai endpoint đầu đã có file PHP sẵn trong repository:

- `docs/wordpress/partner-logos-rest.php`
- `docs/wordpress/acw-headless-rest.php`

## 2. API đã hoạt động, không cần viết lại

| Endpoint | Kết quả kiểm tra | Đang phục vụ |
| --- | --- | --- |
| `GET /wp-json/wp/v2/posts` | `200` | Danh sách và chi tiết bài viết, ảnh đại diện, category. |
| `GET /wp-json/wp/v2/categories` | `200` | Chuyên mục VI/EN và cây category. |
| `GET /wp-json/wp/v2/pages` | `200` | Dữ liệu page cơ bản. |
| `GET /wp-json/wp/v2/phan-hieu-khoa` | `200` | Danh sách đơn vị đào tạo. |
| `GET /wp-json/wp/v2/tai-lieu` | `200` | Danh sách custom post type tài liệu. |
| `GET /wp-json/wp/v2/loai-tai-lieu` | `200` | Taxonomy tài liệu. |
| `GET /wp-json/headless/v1/page?...&post_type=post` | `200` với slug hợp lệ | ACF sự kiện, HOT/NEW, tuyển dụng và metadata bài viết. |
| `GET /wp-json/headless/v1/page?...&post_type=phan-hieu-khoa` | `200` | ACF tên khoa, mô tả, ảnh và website khoa. |
| `GET /wp-json/headless/v1/term/category/{slug}` | `200` | Banner ACF của category và thông tin term. |
| `GET /wp-json/headless/v1/seo?...&type=post` | `200` | Rank Math SEO của bài viết. |
| `GET /wp-json/headless/v1/search` | `200` | Tìm kiếm từ Headless API. |
| `GET /wp-json/wpx-ft/v1/search` | `200` | Live search hiện tại của Next.js. |
| `GET /wp-json/wpx-ft/v1/suggest` | Có route | Gợi ý tìm kiếm hiện tại. |
| `GET /wp-json/tlu/v1/health` | `200` | Health check, plugin version `1.14.0`. |
| `GET /wp-json/tlu/v1/settings` | `200` | Cấu hình công khai, ACF/Polylang/Rank Math. |
| `GET /wp-json/tlu/v1/schema` | `200` | Schema và danh sách endpoint plugin. |

Lưu ý namespace:

- `health`, `settings`, `schema` nằm ở `tlu/v1`.
- API nội dung nằm ở `headless/v1`.
- Tài liệu audit cũ ghi health ở `headless/v1`; thông tin đó không còn đúng với production.

## 3. P0 — API logo đối tác

### Mục đích

Đọc toàn bộ ACF repeater:

- Repeater: `danh_sach_doi_tac`
- Ảnh: `logo_cong_ty`
- URL: `link_doi_tac`
- ACF post ID hiện tại: `option`

### Request

```http
GET /wp-json/tlu/v1/partner-logos?lang=vi
```

`lang` có thể bỏ qua nếu hai ngôn ngữ dùng chung danh sách logo.

### Response bắt buộc

```json
{
  "items": [
    {
      "logo_cong_ty": {
        "id": 302,
        "url": "https://tlu.edu.vn/wp-content/uploads/partner.webp",
        "alt": "Tên đối tác",
        "title": "Tên đối tác"
      },
      "link_doi_tac": "https://partner.example.com/"
    }
  ]
}
```

### Yêu cầu

- Trả **toàn bộ** repeater, không giới hạn 6 logo.
- Chỉ trả logo và URL đối tác; không trả toàn bộ ACF Options.
- Chỉ chấp nhận URL `http` hoặc `https` đã sanitize.
- Endpoint chỉ đọc, có thể để public bằng `permission_callback => __return_true`.
- Có thể đặt cache public 5 phút.

### Code đã chuẩn bị

Kích hoạt nội dung file:

```text
docs/wordpress/partner-logos-rest.php
```

### Acceptance test

```bash
curl -i "https://tlu.edu.vn/wp-json/tlu/v1/partner-logos?lang=vi"
```

Đạt khi:

- HTTP `200`.
- `items` là array.
- Số phần tử bằng số dòng trong ACF repeater.
- Mọi phần tử có `logo_cong_ty.url`.

## 4. P0 — API sidebar chuyên mục

### Request

Endpoint phải nhận một trong ba selector:

```http
GET /wp-json/acw/v1/sidebar?post_id=56193&lang=vi
GET /wp-json/acw/v1/sidebar?category_id=1826&lang=vi
GET /wp-json/acw/v1/sidebar?category_slug=tin-tuc&lang=vi
```

### Response bắt buộc

```json
{
  "root": {
    "id": 1816,
    "name": "Tin tức & thông báo",
    "slug": "tin-tuc-thong-bao",
    "url": "https://tlu.edu.vn/tin-tuc-thong-bao/"
  },
  "items": [
    {
      "type": "term",
      "id": 1826,
      "parent": 1816,
      "name": "Hoạt động chung",
      "slug": "tin-tuc",
      "url": "https://tlu.edu.vn/tin-tuc/",
      "children": []
    },
    {
      "type": "custom",
      "label": "Liên kết tùy chỉnh",
      "url": "https://example.com/",
      "children": []
    }
  ]
}
```

### Yêu cầu

- Dùng cấu hình đã lưu của plugin Auto Category Widget.
- Giữ đúng thứ tự, nhãn tùy chỉnh, term bị loại trừ và custom link.
- Hỗ trợ Polylang qua `pll_get_post()` và `pll_get_term()`.
- Endpoint chỉ đọc và chỉ trả dữ liệu vốn đã công khai.

### Code đã chuẩn bị

Ghép REST adapter vào cuối snippet ACW đang chạy:

```text
docs/wordpress/acw-headless-rest.php
```

### Acceptance test

```bash
curl -i "https://tlu.edu.vn/wp-json/acw/v1/sidebar?category_slug=tin-tuc&lang=vi"
```

Đạt khi HTTP `200`, có `root` và `items` là array.

## 5. P0 — Sửa `/headless/v1/page`

### Lỗi đã xác nhận

| Request | Kết quả |
| --- | --- |
| `post_type=post` với slug bài viết hợp lệ | `200` |
| `post_type=phan-hieu-khoa` với slug hợp lệ | `200` |
| `post_type=page`, ví dụ `gioi-thieu` | `500`, WordPress critical error HTML |
| `post_type=page`, ví dụ `classic-shop` | `500` |
| `post_type=tai-lieu` với slug hợp lệ | `500` |
| Slug bài viết không tồn tại | Có thể biến thành `500` thay vì JSON `404` |

### Lỗi cần sửa trong controller

`PageService::get_page()` có thể trả `WP_Error`, nhưng handler chỉ kiểm tra `null` rồi truyền kết quả vào `Response::success(array $data)`. Khi `$data` là `WP_Error`, PHP phát sinh `TypeError` và trả HTML 500.

Handler cần có nhánh này trước `Response::success()`:

```php
$data = $this->service->get_page( $slug, $post_type, $lang );

if ( is_wp_error( $data ) ) {
    return $data;
}

if ( null === $data ) {
    return Response::not_found();
}

return Response::success( $data );
```

### Kiểm tra thêm sau khi sửa `WP_Error`

Nếu page/tài liệu hợp lệ vẫn lỗi, ghi log từng bước trong `PageNormalizer::from_post()`:

1. `apply_filters('the_content', $post->post_content)` — shortcode/template cũ có thể fatal khi chạy trong REST.
2. `build_acf()` — kiểm tra repeater/relationship trỏ vòng hoặc field type chưa được normalizer hỗ trợ.
3. `SeoNormalizer::from_post()`.
4. `PolylangIntegration::get_post_translations()`.

Không trả stack trace ra REST production. Chỉ ghi bằng `error_log()` khi `WP_DEBUG_LOG` bật.

### Acceptance tests

```bash
curl -i "https://tlu.edu.vn/wp-json/headless/v1/page?slug=gioi-thieu&post_type=page&lang=vi"
curl -i "https://tlu.edu.vn/wp-json/headless/v1/page?slug=phan-hieu-truong-dai-hoc-thuy-loi&post_type=phan-hieu-khoa&lang=vi"
curl -i "https://tlu.edu.vn/wp-json/headless/v1/page?slug=chi-thi-ve-tang-cuong-su-lanh-dao-cua-dang-trong-cong-tac-pho-bien-giao-duc-phap-luat-nang-cao-y-thuc-chap-hanh-phap-luat-cua-can-bo-nhan-dan&post_type=tai-lieu&lang=vi"
```

Mọi nội dung tồn tại phải trả JSON `200`; nội dung không tồn tại phải trả JSON `404`, tuyệt đối không trả HTML 500.

## 6. P0 — Menu WordPress

### Lỗi đã xác nhận

- `/wp-json/wp/v2/menus` trả `401` đối với khách.
- `/wp-json/wp/v2/menu-items` trả `401` đối với khách.
- Next.js hiện gọi hai core endpoint trên, vì vậy đang rơi về menu hardcode.
- `/headless/v1/menus` không có tham số đang fatal `500`; đúng ra phải trả JSON `400`.
- `/headless/v1/menus?location=primary&lang=vi` hiện `404`.

### Việc cần làm phía WordPress

1. Xác nhận location thực tế được Flatsome đăng ký và menu đang gán vào location nào.
2. Chuẩn hóa ba location dành cho frontend:
   - `primary`
   - `footer`
   - `topbar`
3. Đảm bảo Polylang ánh xạ đúng menu VI/EN.
4. Với request thiếu cả `location` và `slug`, trả `WP_Error` JSON status `400`; không gọi service với `null`.
5. Response menu phải chứa `items` dạng cây hoặc danh sách có `parent` và `menu_order` ổn định.

Response khuyến nghị:

```json
{
  "location": "primary",
  "lang": "vi",
  "id": 12,
  "name": "Menu chính",
  "slug": "menu-chinh",
  "items": [
    {
      "id": 101,
      "parent": 0,
      "title": "GIỚI THIỆU",
      "url": "http://localhost:3000/gioi-thieu",
      "target": "",
      "classes": [],
      "children": []
    }
  ]
}
```

Sau khi API này đạt, frontend cần chuyển `src/lib/api/menus.ts` từ core `/wp/v2/menus` sang `/headless/v1/menus`.

## 7. P1 — Sửa HTTP status của taxonomy tài liệu

Request:

```http
GET /wp-json/headless/v1/term/loai-tai-lieu/van-ban-tai-lieu?lang=vi&page=1&per_page=1
```

Production hiện trả:

- HTTP `404`.
- Body lại là term hợp lệ với `id=105`, `slug=van-ban-tai-lieu`, `children_count=5` và ACF `banner_tin_tuc`.

Đây là response không hợp lệ về mặt HTTP. Khi service trả term hợp lệ và không có key `error`, controller phải trả status `200`.

Acceptance test:

- Term tồn tại: JSON `200`.
- Term không tồn tại: JSON `404` với `code`, `message`, `data.status` thống nhất.
- Không dùng HTTP `404` cho term chỉ vì `count=0`; term cha vẫn hợp lệ dù không có tài liệu gắn trực tiếp.

Frontend đang có workaround đọc body dù status 404, nhưng phải bỏ workaround sau khi plugin được sửa.

## 8. P1 — Sửa resolver cho Permalink Manager và page/CPT

### Lỗi đã xác nhận

- Resolve slug bài viết + `post_type=post`: `200`.
- Resolve bằng slug/ID page hoặc `tai-lieu`: đang trả lỗi `headless_resolver_missing_input` không đúng ngữ cảnh.
- Resolve `path` của permalink do Permalink Manager tạo: `404`.
- Handler hiện dùng `rest_ensure_response($wp_error)`; với `WP_Error` nên trả trực tiếp `$wp_error` để REST server giữ đúng status.

### Yêu cầu

- Chỉ cho phép đúng một selector trong `id`, `slug`, `path`, `url`.
- Không được làm mất selector trong validation/security middleware.
- Khởi tạo `PermalinkManagerIntegration` trong `ContentResolver` khi plugin đang active.
- `resolve_by_path()` phải thử Permalink Manager trước WordPress native.
- Khi có `lang`, xác minh post/term thuộc đúng Polylang language hoặc trả bản dịch tương ứng.
- Chỉ trả nội dung `publish` và public post type.

Acceptance test mẫu:

```bash
curl -i "https://tlu.edu.vn/wp-json/headless/v1/resolve?slug=gioi-thieu&post_type=page&lang=vi"
curl -i "https://tlu.edu.vn/wp-json/headless/v1/resolve?path=/gs-nguyen-trung-viet-nhieu-dh-nhat-ban-tim-kiem-hoc-sinh-tai-nang-viet-nam-37628/&post_type=post&lang=vi"
```

## 9. API Options: không mở toàn bộ

Request sau đang trả `403`:

```http
GET /wp-json/headless/v1/options?key=options&lang=vi
```

Đây là hành vi bảo mật đúng vì key chưa nằm trong allowlist. Không nên allowlist `options` chỉ để lấy logo, vì response có thể chứa tất cả ACF Options, kể cả dữ liệu không dành cho public.

Nguyên tắc:

- Dùng endpoint nhỏ, chuyên biệt như `tlu/v1/partner-logos`.
- Nếu dùng Options API, tạo options `post_id` riêng cho từng nhóm public và chỉ allowlist key đó.
- Không đặt token, API key, mật khẩu, SMTP secret hoặc credential vào response public.

## 10. Việc phía Next.js cần sửa sau khi API hoàn tất

Đây không phải API WordPress còn thiếu, nhưng cần làm để dùng đúng backend:

1. Đổi menu frontend sang `/headless/v1/menus` sau khi location đã chốt.
2. Dùng `/headless/v1/page` cho page cần ACF như trang chủ và tuyển sinh; core `/wp/v2/pages` chỉ đang trả dữ liệu cơ bản.
3. Front page VI thực tế có slug `classic-shop` (`id=93`), còn EN có slug `home` (`id=23401`). `PAGE_SLUGS.HERO` hiện chưa có `classic-shop`.
4. Dữ liệu `translations` của Headless API là array chứa `language`, `locale`, `url`; frontend hiện đang có đoạn kỳ vọng object `{ vi: slug, en: slug }` nên cần chuẩn hóa lại.
5. Sau khi taxonomy tài liệu trả đúng `200`, bỏ workaround chấp nhận body của response `404`.

## 11. Thứ tự triển khai đề xuất

1. Kích hoạt `partner-logos-rest.php`.
2. Ghép và kích hoạt `acw-headless-rest.php` cùng snippet ACW gốc.
3. Sửa `Page` controller để trả trực tiếp `WP_Error`, sau đó xử lý fatal riêng của page/tài liệu.
4. Chốt ba menu location và sửa Menus endpoint.
5. Sửa status taxonomy tài liệu.
6. Sửa ContentResolver + Permalink Manager.
7. Chạy toàn bộ acceptance test trong tài liệu này.
8. Sau khi API ổn định mới đổi các caller tương ứng trong Next.js.

## 12. Checklist bảo mật

- [ ] Các endpoint public chỉ dùng `GET`.
- [ ] Chỉ trả post `publish`, taxonomy public và dữ liệu hiển thị công khai.
- [ ] Không trả toàn bộ `wp_options` hoặc toàn bộ ACF Options.
- [ ] Sanitize URL bằng `esc_url_raw()` và text bằng `sanitize_text_field()`.
- [ ] Không trả stack trace hoặc đường dẫn server khi production lỗi.
- [ ] Giới hạn `per_page` tối đa 100.
- [ ] Cache response GET công khai; không cache preview/private response.
- [ ] Preview, purge, revalidation và các thao tác ghi phải có token/quyền riêng.
- [ ] CORS chỉ mở cho frontend cần thiết nếu request chạy trực tiếp từ browser.
