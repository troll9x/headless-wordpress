# Nhật ký thay đổi

Tài liệu này ghi lại các thay đổi đáng chú ý của frontend Next.js. Định dạng dựa trên Keep a Changelog và project dùng Semantic Versioning.

## [1.0.0] - 2026-09-08

### Production hardening - 2026-09-08

- Upgrade Next.js to 16.3.4 and React to 19.2.8; full and production-only dependency audits report zero vulnerabilities.
- Add explicit allowlist sanitization for every CMS/search HTML render, CSP and standard security response headers.
- Add per-client TTS rate limiting with HTTP 429, Retry-After and RateLimit response headers.
- Require HTTPS production origins, fix HTTP 404 before streaming, and normalize Rank Math robots metadata.
- Verify English International Relations and Research data against the production WordPress API.
- Load the complete 69-item partner-logo ACF repeater through the dedicated Headless API, with a temporary legacy-template fallback until that endpoint is deployed.

### Thêm mới

- Chuyển Son NH Template Gallery sang section Khoảnh khắc TLU: đọc ảnh đã chọn, giữ ảnh nổi bật ở vị trí thứ 7 và mở lightbox có điều hướng bàn phím.
- Thêm trang Media VI/EN tại `/media`, `/en/media` và route album theo slug; có fallback đọc các card công khai từ page WordPress khi API gallery chưa được triển khai.
- Thêm trang Cơ cấu tổ chức VI/EN, các tab Đảng ủy/Ban Giám hiệu/Hội đồng trường, đơn vị đào tạo, phòng–trung tâm và đơn vị KHCN.
- Thêm trang hồ sơ CPT `to-chuc` theo template `single-to-chuc.php`, gồm chức vụ, thông tin cá nhân, quá trình công tác, tiểu sử và TTS.
- Thêm trang chi tiết CPT `tai-lieu` theo template `single-tai-lieu.php`, bảng tệp tải xuống và chuyển hướng khi chỉ có một tệp.
- Bổ sung các route Cơ cấu tổ chức, Media và Tài liệu vào sitemap tĩnh.

### Thay đổi

- Xác minh production đã chạy Headless API `1.14.0`/schema `4.7`; đồng bộ contract Media, Cơ cấu tổ chức và Tài liệu theo response thật.
- Sửa Khoảnh khắc TLU theo đúng plugin Sondz Gallery: lấy đúng 15 ảnh công khai đang được chọn trên trang gốc, đặt ảnh thứ 7 làm ảnh lớn và không trộn ảnh category tháng 9/2025 khi API `1.14.0` lọc sai danh sách.
- Khớp CSS gallery gốc ở các breakpoint 3/4/5 cột, chiều cao hàng 100/120/140/160px, gap 12px và bỏ nút “Xem thư viện media” không có trong template WordPress.
- Chuyển shortcode `[khoa_nganh_slider]` sang component Next.js: lấy custom post type `phan-hieu-khoa`, bổ sung ACF qua Headless API, lọc Polylang VI/EN và chạy slider dọc vô hạn không phụ thuộc Swiper CDN.
- Self-host bộ Open Sans và Raleway của website gốc, gồm subset tiếng Việt, để sửa lỗi font fallback, dấu tiếng Việt và chặn CORS khi chạy local/Docker.
- Dựng lại toàn bộ trang chủ theo ảnh đối chiếu desktop/mobile của `tlu.edu.vn`: banner, tin tức, thông báo, thống kê, tuyển sinh, đơn vị đào tạo, cụm tin, đối tác, thư viện ảnh và footer.
- Chuẩn hóa các cụm Hợp tác quốc tế, Nghiên cứu và Vì cộng đồng thành layout 3 thẻ + danh sách trên desktop, slider + danh sách trên mobile.
- Thống kê hiển thị 5 cột bằng nhau trên desktop và bố cục 1–2–2 trên mobile; giữ hiệu ứng đếm số bằng `react-countup`.
- Bổ sung ảnh và dữ liệu dự phòng từ website chính thức cho các section vẫn hiển thị đầy đủ khi REST API chưa trả trang tuyển sinh, khoa hoặc logo đối tác.
- Tăng số bài lấy cho các cụm tin lên 6 và khoảnh khắc TLU lên 15; bỏ truy vấn menu liên kết nhanh không còn xuất hiện trong thiết kế.
- Thay footer bằng bố cục nhận diện, liên hệ, liên kết, mạng xã hội và bản đồ giống giao diện gốc; bổ sung thanh mạng xã hội cố định.
- Gom toàn bộ component trang chủ vào `src/components/trang-chu`.
- Đổi tên các section trang chủ sang tiếng Việt không dấu để dễ tìm kiếm và tránh lỗi đường dẫn đa nền tảng.
- Khu vực Sự kiện ưu tiên layout sự kiện đang/sắp diễn ra từ lịch ACF; nếu không có thì tự chuyển sang slider card responsive với vòng lặp vô hạn, không dùng nút mũi tên chồng lên “Xem tất cả”.
- Viết lại README theo kiến trúc và quy trình vận hành thực tế của project.

### Loại bỏ

- Xóa `dictionary.ts` và `routing.ts` của cơ chế i18n cũ không còn được import.
- Xóa hai error boundary thuộc route `/tin-tuc/[slug]` và `/en/news/[slug]` đã được thay bằng permalink phẳng.
- Xóa `variables.css` chưa từng được import.
- Gỡ `babel-plugin-react-compiler` vì project chưa bật React Compiler.
- Xóa thư mục `node_modules` thừa ở cấp workspace; dependency thật nằm trong `university-next`.

## [0.1.0] - 2026-08-18

### Thêm mới

- Trang chủ lấy dữ liệu động từ WordPress cho hai ngôn ngữ Việt/Anh.
- Trang chuyên mục có phân trang, banner taxonomy, sidebar động và layout toàn chiều rộng cho nhóm chuyên mục đặc biệt.
- Trang chi tiết bài viết có banner chuyên mục, metadata, chia sẻ, điều hướng trước/sau và bài liên quan.
- Route permalink phẳng cho bài viết và chuyên mục, tương thích Permalink Manager Pro.
- Kho văn bản/tài liệu theo taxonomy `loai-tai-lieu` với chế độ lưới và danh sách.
- Tìm kiếm trực tiếp qua endpoint WPX FT.
- Đọc bài tiếng Việt bằng Viettel AI TTS thông qua API server-only; tiếng Anh dùng Web Speech API.
- Sitemap, robots, canonical, Open Graph và liên kết bản dịch Polylang.
- Bộ đếm số liệu trang chủ dùng `react-countup`.

### Sửa lỗi

- Sửa ảnh nổi bật của bài HOT/NEW và bố cục ảnh phía trên nội dung ở cột slider.
- Ưu tiên URL permalink WordPress để mở đúng các bài có hậu tố ID.
- Sửa parser số thống kê để `24.000+`, `500+`, `95%`, `75` và `60%` đếm tới đúng giá trị.
- Tránh làm hỏng Suspense khi WordPress hoặc ảnh nguồn gặp lỗi chứng chỉ TLS.

### Bảo mật

- Giữ token Viettel AI trong cấu hình server-only và không đưa vào bundle trình duyệt.
- API TTS chỉ chấp nhận ID bài viết công khai rồi tự lấy nội dung từ WordPress, không nhận văn bản tùy ý từ client.
