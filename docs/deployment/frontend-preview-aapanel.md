# Kiểm thử Next.js trên `*.nguyenhongson.vn` với CMS chính

Đây là phương án **preview frontend**, không phải staging đầy đủ: Next.js chạy ở một subdomain thử riêng, đọc dữ liệu công khai từ `https://cms.tlu.edu.vn`. Không đổi DNS `tlu.edu.vn`, không sao chép hay sửa database CMS. Nếu cần kiểm thử thay đổi plugin, đo SQL WordPress bằng `SAVEQUERIES`, webhook ghi dữ liệu hoặc thử tải, dùng [bản sao WordPress riêng](staging-aapanel.md) trước.

Tài liệu này là hướng dẫn; chưa có thao tác nào được thực hiện trên DNS, aaPanel hay CMS. Thay `<TEST_HOST>` bằng hostname thật đã được xác nhận, ví dụ `test-tlu.nguyenhongson.vn`.

## Bước 1: DNS, HTTPS và cô lập preview

1. Tạo bản ghi DNS của `<TEST_HOST>` trỏ tới server chạy Next.js. Trên aaPanel, tạo **Node.js Project** với thư mục release, process và cổng riêng; gắn domain này vào project và cấp SSL. Nếu dùng chung server với production, kiểm tra RAM/CPU/disk trước khi build. Chỉ cho Node lắng nghe loopback; không mở cổng Node trực tiếp ra Internet. Xem [hướng dẫn Node.js Project của aaPanel](https://www.aapanel.com/docs/Function/Node.html).
2. Bảo vệ **toàn bộ hostname preview** bằng Basic Auth, VPN hoặc IP allowlist ở reverse proxy. Thêm header `X-Robots-Tag: noindex, nofollow` cho mọi response như lớp phụ. Đừng coi `robots.txt` là cách bảo mật: ứng dụng hiện tạo `robots.txt` cho site công khai và sitemap/canonical theo `NEXT_PUBLIC_SITE_URL`. Khi dùng Basic Auth, chỉ cấp tài khoản thử cho người kiểm duyệt; không gửi mật khẩu qua chat/Git.
3. Kiểm tra `https://<TEST_HOST>` trả TLS hợp lệ, request chưa đăng nhập bị chặn, response sau đăng nhập có `X-Robots-Tag`, và domain không trỏ nhầm vào website hiện tại.

## Bước 2: Dựng Next.js riêng

1. Chọn đúng commit `local-full-work` có ba job CI xanh; checkout vào thư mục release **riêng** trên server. Không build đè ứng dụng đang phục vụ người dùng.
2. Tạo `.env.production.local` trên server preview, không commit. Các giá trị định tuyến cần có:

   ```dotenv
   NEXT_PUBLIC_SITE_URL=https://<TEST_HOST>
   NEXT_PUBLIC_WP_BASE_URL=https://cms.tlu.edu.vn
   WP_SITE_URL=https://cms.tlu.edu.vn
   WP_API_URL=https://cms.tlu.edu.vn/index.php?rest_route=/wp/v2
   LEGACY_WP_SITE_URL=https://tlu.edu.vn
   ```

   Bổ sung biến khác theo [`university-next/.env.example`](../../university-next/.env.example). Không sao chép `.env.local` từ máy phát triển. Không đặt secret trong biến `NEXT_PUBLIC_*`.
3. Chạy `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` trong `university-next`, rồi chạy production server trên cổng loopback riêng. `NEXT_PUBLIC_*` được đóng vào bundle khi build: đổi hostname phải build lại. Khi cutover sang `tlu.edu.vn`, **build một bản mới** với `NEXT_PUBLIC_SITE_URL=https://tlu.edu.vn`; không chuyển nguyên build preview sang production.
4. Từ chính Node host, xác nhận HTTPS và REST/media của `cms.tlu.edu.vn` truy cập được. Không thêm Basic Auth vào CMS chính chỉ để phục vụ preview.

## Bước 3: Kiểm thử an toàn với CMS chính

- Kiểm tra trang chủ, `/en`, bài viết, chuyên mục, tài liệu, tổ chức, tìm kiếm và ảnh `/_next/image` ở desktop/tablet/mobile. Đối chiếu canonical, sitemap và link chia sẻ đều trỏ về `<TEST_HOST>` trong bản preview. Cần xác nhận `X-Robots-Tag` vẫn có trên HTML, sitemap và các response có thể index.
- Chỉ gửi lượng request thủ công/hợp lý tới CMS. **Không** chạy load test, quét toàn bộ sitemap liên tục, bật `SAVEQUERIES`, thay plugin/cấu hình WordPress hoặc thử webhook ghi vào CMS chính trong phương án này.
- Search proxy có thể cần `SEARCH_PROXY_SECRET` khớp với cấu hình plugin CMS. Nếu CMS chính chưa cấu hình, ghi rõ chức năng tìm kiếm/rate-limit chưa được nghiệm thu; không tự thay `wp-config.php` production. TTS dùng token riêng có giới hạn hoặc ghi là chưa thử.
- Ghi commit SHA, hostname, kết quả từng ca kiểm thử, log lỗi và người kiểm duyệt. Phương án này chỉ xác nhận frontend với dữ liệu live; cổng kiểm thử backend/SQL/plugin/tải vẫn **chưa đạt** cho đến khi có môi trường WordPress tách biệt hoặc kế hoạch rủi ro được phê duyệt.

## Thông tin cần xác nhận

Hostname preview cụ thể; server preview là máy riêng hay chung máy production; ai sẽ tạo DNS/aaPanel và cấp quyền kiểm tra URL/log. Chỉ chia sẻ quyền truy cập qua kênh bảo mật, không dán mật khẩu/token vào chat.
