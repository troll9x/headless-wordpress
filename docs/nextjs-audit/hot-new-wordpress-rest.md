# HOT/NEW: hợp đồng dữ liệu WordPress → Next.js

Shortcode `hot_featured_posts` chạy bên trong WordPress nên đọc được `post_meta` trực tiếp. Next.js chỉ gọi REST API; bởi vậy ba meta sau phải được công khai ở `wp-json/wp/v2/posts`:

- `post_priority_label`: `hot`, `new` hoặc rỗng.
- `post_priority_order`: `1`, `2`, `3` hoặc rỗng.
- `post_priority_expire_date`: ngày dạng `Y-m-d` hoặc rỗng.

REST API công khai của `tlu.edu.vn` được kiểm tra ngày 12/08/2026 và hiện chưa trả các trường này. Thêm đoạn dưới đây vào cùng plugin/snippet đang khai báo shortcode:

```php
add_action('init', function () {
    register_post_meta('post', 'post_priority_label', [
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'sanitize_callback' => 'sanitize_key',
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);

    register_post_meta('post', 'post_priority_order', [
        'type' => 'integer',
        'single' => true,
        'show_in_rest' => true,
        'sanitize_callback' => 'absint',
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);

    register_post_meta('post', 'post_priority_expire_date', [
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);
});
```

Sau khi thêm, kiểm tra:

```text
https://tlu.edu.vn/wp-json/wp/v2/posts?per_page=1&_fields=id,meta
```

Kết quả cần có dạng:

```json
{
  "id": 123,
  "meta": {
    "post_priority_label": "hot",
    "post_priority_order": 1,
    "post_priority_expire_date": "2026-12-31"
  }
}
```

`NewsSection.tsx` đọc được cả ba kiểu dữ liệu: trường ở root, trong `meta`, hoặc trong `acf`. Khi WordPress chưa xuất meta, component tự dùng bài mới nhất và vẫn hoạt động như một khối tin thường.

## Quy tắc render đã chuyển sang Next.js

1. Bài HOT còn hạn, thứ tự `1` là bài chính; nếu không có thì dùng bài mới nhất.
2. HOT còn hạn thứ tự `2` và `3` đứng đầu slider.
3. Các vị trí còn lại được bù bằng tin mới nhất, không lặp bài chính.
4. Mỗi slide có hai bài; slide chứa HOT 2/3 dừng 7 giây, slide thường dừng 3 giây.
5. Polylang vẫn lọc dữ liệu bằng `lang=vi|en`; link chi tiết đổi theo locale.

Ảnh `hot.gif` của template hiện hoạt động. Media `new.gif` vẫn có bản ghi trong WordPress nhưng URL công khai trả `404`, nên frontend dùng badge chữ `NEW` bằng Tailwind để không hiện ảnh lỗi.

Hiện frontend lấy 40 bài gần nhất của chuyên mục để tìm meta ưu tiên. Nếu cần bảo đảm tìm được bài ưu tiên ở bất kỳ thời điểm nào, bước tiếp theo nên là một REST endpoint chuyên dụng thực hiện `meta_query` ngay trong WordPress thay cho việc tải một tập bài rộng về Next.js.
