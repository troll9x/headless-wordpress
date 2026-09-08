# Category sidebar trong mô hình headless

## Vì sao widget cũ không tự hiển thị trong Next.js

`AutoRecursiveCategoryWidget` chỉ render HTML khi WordPress theme chạy `dynamic_sidebar()`.
Frontend hiện tại là Next.js nên không chạy PHP theme và cũng không nhận HTML của `WP_Widget`.

Giải pháp được dùng:

1. WordPress tiếp tục lưu và quản trị cấu hình `auto_cat_widget_config`.
2. REST adapter đọc cấu hình đó và trả cây menu JSON.
3. Next.js gọi JSON và render bằng `CategorySidebar.tsx`.

## Cài endpoint WordPress

Mở Code Snippets chứa code ACW hiện tại, dán nội dung của
`docs/wordpress/acw-headless-rest.php` vào cuối snippet. Không dán dòng mở `<?php`.

Giữ snippet ở chế độ chạy toàn site. Endpoint công khai chỉ đọc tên, slug, URL và cấu
trúc danh mục; thao tác lưu cấu hình vẫn yêu cầu quyền `manage_options` như code gốc.

## Kiểm tra REST

Theo bài viết:

```text
https://tlu.edu.vn/wp-json/acw/v1/sidebar?post_id=56113&lang=vi
```

Theo danh mục:

```text
https://tlu.edu.vn/wp-json/acw/v1/sidebar?category_id=123&lang=vi
https://tlu.edu.vn/wp-json/acw/v1/sidebar?category_slug=tin-tuc&lang=vi
```

Response phải có `root` và `items`.

## Polylang

Endpoint dùng `pll_get_post()` và `pll_get_term()` khi Polylang đang hoạt động.
Do cấu hình ACW được lưu theo ID của danh mục gốc, cần cấu hình sidebar riêng cho
danh mục gốc tiếng Việt và bản dịch tiếng Anh của nó. Các ID term giữa hai ngôn ngữ
không giống nhau.

## Route Next.js

- Bài viết VI: `/tin-tuc/[slug]`
- Bài viết EN: `/en/news/[slug]`
- Chuyên mục VI: `/chuyen-muc/[slug]`
- Chuyên mục EN: `/en/category/[slug]`

Nếu endpoint chưa được bật hoặc WordPress không truy cập được, Next.js vẫn render nội
dung chính và ẩn sidebar thay vì trả lỗi toàn trang.
