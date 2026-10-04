# Dựng staging TLU trên aaPanel

Staging là môi trường thử tách khỏi website thật. Tài liệu này là hướng dẫn, **không phải lệnh đã được chạy**. Giữ `tlu.edu.vn` phục vụ website hiện tại cho tới khi mọi cổng kiểm duyệt đạt. Đề xuất hai hostname riêng: `stage.tlu.edu.vn` (Next.js) và `cms-stage.tlu.edu.vn` (bản sao WordPress); thay bằng hostname thực được đội DNS phê duyệt. Nếu chỉ muốn thử frontend tại `*.nguyenhongson.vn` và đọc CMS chính, dùng [hướng dẫn preview frontend](frontend-preview-aapanel.md); phương án đó không thay thế bước kiểm thử backend tách biệt.

## 0. Kiểm kê và xác nhận phạm vi

- Ghi lại webroot, database, tài khoản DB và DNS **production** hiện tại. Xác nhận rõ các đường dẫn/database **staging mới** trước khi sao chép; không chạy thao tác ghi trên webroot hoặc DB production.
- Kiểm tra aaPanel còn đủ CPU, RAM, dung lượng và một cổng loopback riêng cho Node staging. Máy riêng được ưu tiên. Nếu chạy cùng máy production, thử tải phải có giới hạn để không ảnh hưởng người dùng thật.
- Chỉ dùng dữ liệu cá nhân thật trên staging nếu có cơ sở và chính sách bảo vệ phù hợp; ưu tiên làm sạch dữ liệu nhạy cảm, dùng tài khoản kiểm thử. Không gửi backup, mật khẩu hoặc token qua chat/Git.

## 1. Tạo DNS, TLS và giới hạn truy cập

1. Tạo hai subdomain staging trỏ đến máy được chọn và cấp chứng chỉ TLS cho cả hai trong aaPanel.
   - Trong aaPanel, vào **Website → PHP Project → Add site** cho `cms-stage.tlu.edu.vn`. Chọn **webroot mới**, PHP phù hợp và tạo **database mới**; đối chiếu tên DB sau đó trong **Databases → MySQL**. Không chọn webroot hoặc DB đang phục vụ `cms.tlu.edu.vn`. Xem [PHP Project](https://www.aapanel.com/docs/Function/php.html) và [MySQL](https://www.aapanel.com/docs/Function/MySQL.html).
   - Vào **Website → Node.js Project → Add project** cho frontend staging. Chọn path release riêng, lệnh chạy `start`, Node LTS được phê duyệt, user `www`, cổng riêng (ví dụ `3001`), rồi gắn domain và bật mapping/reverse proxy. Tên menu có thể là **Node Project** ở bản aaPanel cũ. Xem [Node.js Project](https://www.aapanel.com/docs/Function/Node.html).
   - Ở cài đặt của từng site/domain, cấp SSL và bật HTTPS. Xác nhận mapping của Node trỏ đúng cổng staging, không trỏ sang cổng production.
2. Tạo hai website/site riêng, webroot và log riêng. Chặn truy cập công khai vào frontend staging bằng VPN/IP allowlist hoặc HTTP Basic Auth. Thêm `X-Robots-Tag: noindex, nofollow` làm lớp phụ; chỉ `robots.txt` không đủ để tránh index.
3. WordPress staging cũng phải giới hạn truy cập. Nếu CMS dùng Basic Auth, cần ngoại lệ được kiểm soát cho request máy chủ Next.js đến REST/media; `next/image` tải media từ phía Node và không tự chuyển tiếp thông tin Basic Auth của trình duyệt. Không mở toàn bộ CMS công khai chỉ để sửa lỗi ảnh.
4. Node staging chỉ nghe `127.0.0.1` trên cổng riêng (ví dụ `3001`). Reverse proxy phải **ghi đè** `X-Real-IP`; không chuyển nguyên header do client tự gửi. Không mở cổng Node ra Internet.

## 2. Tạo bản sao WordPress, không sửa dữ liệu live

1. Tạo backup database và `wp-content` production, lưu ở nơi riêng có kiểm soát truy cập. Xác nhận backup có thể đọc/khôi phục. WP-CLI hỗ trợ [`wp db export`](https://developer.wordpress.org/cli/commands/db/export/).
2. Tạo database, DB user và webroot staging mới; sao chép database và `wp-content` vào **đúng các đích mới**. Xác nhận `wp-config.php` staging kết nối DB staging, không phải DB production, trước bất kỳ lệnh ghi nào.
3. Trong `wp-config.php` staging đặt `WP_ENVIRONMENT_TYPE` là `staging`. Tắt email/webhook/cron gửi ra **production** hoặc chuyển sang đích thử riêng; không dùng chung secret production.
4. Dùng `wp --path=<WP_STAGING_ABSOLUTE_PATH> search-replace <CMS_PRODUCTION_ORIGIN> <CMS_STAGING_ORIGIN> --skip-columns=guid --dry-run` để xem trước. Chỉ khi xác nhận đúng DB staging mới chạy lại không có `--dry-run`. WP-CLI xử lý dữ liệu PHP serialized; xem [tài liệu search-replace](https://developer.wordpress.org/cli/commands/search-replace/). Kiểm tra thêm `home`, `siteurl`, permalink, media và URL trong ACF/Polylang.
5. Cài gói `release/headless-api.zip` (2.0.7) vào WordPress staging; kiểm tra REST/schema, ACF, Polylang, Rank Math và CORS. Cấu hình `TLU_HEADLESS_SEARCH_PROXY_SECRET` riêng cho staging và webhook revalidation trỏ về `stage.tlu.edu.vn`, không trỏ về production.

## 3. Dựng Next.js staging

1. Checkout đúng commit/tag được CI xác nhận; dùng thư mục release riêng, không build đè bản đang phục vụ. Trong `university-next`, chạy `npm ci`, lint, typecheck và build.
2. Tạo `.env.production.local` **chỉ trên server staging**. Giá trị bắt buộc: `NEXT_PUBLIC_SITE_URL=https://stage.tlu.edu.vn`, `NEXT_PUBLIC_WP_BASE_URL=https://cms-stage.tlu.edu.vn`, `WP_SITE_URL=https://cms-stage.tlu.edu.vn` và `WP_API_URL` trỏ REST staging. Thay hostname ví dụ bằng hostname đã cấp. Không sao chép `.env.local` hiện tại vì nó còn dùng origin CMS cho frontend.
3. Dùng `SEARCH_PROXY_SECRET` trùng với WordPress staging, `REVALIDATION_SECRET` riêng cho staging. Chỉ bật `TRUSTED_CLIENT_IP_HEADER=x-real-ip` sau khi xác nhận Nginx ghi đè header và cổng Node không công khai. TTS nên dùng token sandbox/giới hạn; nếu không có, ghi rõ test TTS thật chưa chạy.
4. `NEXT_PUBLIC_*` được đóng vào build: sửa hostname phải build lại. Chạy `next start` ở cổng loopback staging, gắn reverse proxy aaPanel vào hostname frontend staging, rồi kiểm tra TLS từ cả trình duyệt **và Node host**.

## 4. Kiểm tra trước khi bàn giao staging

- `GET /`, `/en`, một bài viết, một chuyên mục, một tài liệu, một hồ sơ tổ chức, `/robots.txt`, `/sitemap.xml`: đúng HTTP status, nội dung và canonical staging; trang không tràn ngang ở mobile/tablet/desktop.
- `GET /api/search`, `POST /api/tts` (nếu có token thử), webhook revalidation ký đúng/sai, CORS, rate limit và log Nginx/Node/WordPress. Không gửi request thử tới endpoint production.
- Kiểm tra ảnh qua `/_next/image`; nếu lỗi, xác minh TLS CMS và quyền truy cập media **từ Node host**.
- Chạy `wp --path=<WP_STAGING_ABSOLUTE_PATH> eval-file <REPO_ABSOLUTE_PATH>/scripts/measure-p2-wordpress-queries.php` để đo tài liệu/tổ chức. Chỉ bật `SAVEQUERIES` tạm thời trên staging nếu cần tổng thời gian SQL, rồi tắt lại. So sánh cold/warm và thử tải có kiểm soát.
- Gửi cho người kiểm duyệt URL staging, commit SHA, kết quả CI, bảng lỗi còn mở và người phụ trách. **Không mở production** nếu staging còn timeout, sai origin, sai canonical hoặc chưa có phương án rollback.

## Thông tin cần cung cấp để Codex tiếp tục kiểm duyệt

Hostname frontend/CMS staging đã chọn; xác nhận môi trường có DB/webroot riêng; URL staging có thể truy cập; phương thức truy cập read-only log/WP-CLI hoặc phiên aaPanel đã đăng nhập được chia sẻ qua cơ chế an toàn của sản phẩm. Không dán mật khẩu, private key hoặc token vào chat.
