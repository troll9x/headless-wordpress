# Runbook deploy frontend Next.js: staging → production

Tài liệu này ghi lại quy trình đã dùng cho `dev.nguyenhongson.vn` và các lỗi cần tránh khi đưa frontend lên `tlu.edu.vn`. Lệnh staging bên dưới là cấu hình cụ thể đã xác nhận; không dùng nguyên hostname, đường dẫn hay service staging cho production.

## 1. Phạm vi đã xác nhận

- Frontend staging: `https://dev.nguyenhongson.vn`.
- Frontend lấy API từ `https://cms.tlu.edu.vn`. Deploy frontend không bao gồm sửa CMS, database, `wp-config.php`, DNS CMS hay website khác.
- Repo trên server staging: `/www/wwwroot/dev.nguyenhongson.vn-app/repo/university-next`.
- systemd: `tlu-next-staging`, user/group `www:www`, listen `127.0.0.1:3001`.
- Nginx proxy include riêng của staging: `/www/server/panel/vhost/nginx/proxy/dev.nguyenhongson.vn/ee3cbdaab4817544a5a521f4aef5bef3_dev.nguyenhongson.vn.conf`.
- Nginx đã có cache zone `cache_one`. Quy tắc cache staging được thêm trong include riêng và cache key có `$host`.
- Frontend production dùng hostname `tlu.edu.vn`; cần build riêng với URL production vì `NEXT_PUBLIC_*` được đóng vào build.

## 2. Trình tự deploy đã dùng trên staging

### Trước khi deploy

Trong repo local, xác nhận commit/branch và không đưa thay đổi không liên quan vào commit:

```powershell
git status --short
git branch --show-current
git rev-parse --short HEAD
```

Tại `university-next`, cài sạch dependency và kiểm tra:

```bash
npm ci
npm audit --omit=dev
npm run lint
npm run typecheck
npm run build
```

Đọc audit đầy đủ trước khi sửa. Không dùng `npm audit fix --force` chỉ để làm audit xanh: có thể kéo theo hạ major Next/ESLint. Sau khi sửa dependency, xem diff lockfile rồi chạy lại lint, typecheck, build.

### Deploy và build trên staging

Quy trình đã dùng cho commit `2b63746` (`Fix production dependency advisories`):

```bash
cd /www/wwwroot/dev.nguyenhongson.vn-app/repo/university-next
git pull --ff-only origin local-full-work
npm ci
chown -R www:www .next
su -s /bin/bash www -c 'npm run build'
systemctl restart tlu-next-staging
```

Kiểm tra sau deploy:

```bash
git rev-parse --short HEAD
systemctl is-active tlu-next-staging
systemctl status tlu-next-staging --no-pager
stat -c '%U:%G %a %n' .next .next/server .next/server/route-cache
journalctl -u tlu-next-staging --since '10 minutes ago' --no-pager
```

Service phải `active`, SHA phải đúng, `.next` và route cache phải ghi được bởi `www`. Với production, ưu tiên build ở release directory riêng rồi chuyển release có rollback; không build đè app đang phục vụ nếu chưa có kế hoạch khôi phục.

## 3. Nginx cache và kiểm tra hiệu năng

Nginx staging có cache zone và include quy tắc cache riêng. Tuy nhiên, kiểm tra response ngày 2026-10-07 thấy `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, không có `Age`/`X-Cache`; vì vậy chưa xác minh được HTML đang được phục vụ từ Nginx cache. Xem [audit hiệu năng](../performance/frontend-performance-audit-2026-10-07.md). Chỉ ghi cache là hoạt động sau khi thấy `MISS` ở request đầu và `HIT` ở request kế tiếp; bảo đảm bypass `/api/`, request có cookie/preview và response có `Set-Cookie`. Chưa cài Redis vì cache zone đã có sẵn, nhưng cần xác minh response được cache thực tế.

Trước mọi reload Nginx, chạy test:

```bash
/www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
```

Chỉ khi cú pháp hợp lệ mới reload:

```bash
/www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf
```

Reload dùng chung Nginx master, dù file sửa chỉ thuộc dev. Không sửa cache zone chung, `proxy.conf` hay vhost production để tối ưu staging. Trước khi bật cache ở production, xác nhận response công khai, không phụ thuộc cookie/đăng nhập; giữ API, search có rate limit, revalidation, TTS và endpoint ghi dữ liệu ngoài cache. Xem xét purge và độ trễ cập nhật nội dung trước khi chọn TTL.

Đo cold/warm hai lượt, ghi status, TTFB và total:

```bash
for u in / /en /en/lecturers-from-thuyloi-university-granted-patent-for-new-measurement-method-49957; do
  for n in 1 2; do
    curl -sk -o /dev/null -D /tmp/dev-headers \
      -w "$u run$n status=%{http_code} ttfb=%{time_starttransfer}s total=%{time_total}s\\n" \
      "https://dev.nguyenhongson.vn$u"
    grep -iE '^(X-Cache:|x-nextjs-cache:|Cache-Control:)' /tmp/dev-headers
  done
done
```

Baseline staging ngày 2026-10-07:

| URL | Cold TTFB | Lần kế tiếp | Status |
|---|---:|---:|---:|
| `/` | 19,03 giây | 0,13 giây | 200 |
| `/en` | 15,47 giây | 0,13 giây | 200 |
| Bài viết tiếng Anh ở lệnh trên | 8,36 giây | 0,06 giây | 200 |
| `/api/search?q=TLU` | khoảng 4,56 giây | Không cache | 200 |

Đây là số đo đã ghi nhận trước đó tại staging, không đảm bảo production tương tự. Tại lần kiểm tra ngày 2026-10-07, response trang chủ không có dấu hiệu cache HIT và trả `no-store`; không nên dùng kết quả warm cũ để kết luận cache hiện vẫn hoạt động. Đo lại sau khi xác nhận Nginx HIT/MISS.

## 4. Lỗi đã gặp và cách xử lý

| Lỗi | Nguyên nhân/ghi chú | Cách xử lý |
|---|---|---|
| `EACCES ... .next/server/route-cache` | Build bằng `root`, service chạy `www`, Next không ghi được cache | Sửa owner `.next` thành `www:www`, build bằng user `www`, kiểm tra `stat`, rồi restart service. |
| Audit còn 5 high sau `npm audit fix` | Chỉ nằm trong dependency lint/dev; `npm audit --omit=dev` là 0. Advisory `braces` chưa có bản vá tại thời điểm xử lý. | Không dùng `--force` để hạ major Next/ESLint. Theo dõi upstream và cập nhật khi có bản tương thích. |
| `wp: command not found` | WP-CLI không được cài global | Chỉ dùng PHAR trong `/tmp` nếu tác vụ CMS thực sự cần; deploy frontend không cần WP-CLI. Xóa PHAR tạm sau khi dùng. |
| WP-CLI `Permission denied` ở `wp-config.php` / `Strange wp-config.php` | User terminal không đọc được file; cấu hình WordPress không được WP-CLI nhận theo cách gọi đó | Không chmod/chown config, không xin/dán DB password. Bỏ qua WP-CLI cho deploy frontend; thao tác CMS phải dùng quyền/đường chạy phù hợp riêng. |
| Cold homepage/article chậm | CMS/API upstream chậm; search API khoảng 4,56 giây | Nginx cache HTML công khai giảm warm TTFB; tiếp tục điều tra fetch/API, không cache mù endpoint cá nhân hóa. |
| Log `AbortError` / digest `DYNAMIC_SERVER_USAGE` | Còn xuất hiện trong đợt đo dù URL trả 200 | Chưa được coi là đã sửa. Tái hiện có kiểm soát, xác định route/API, xác nhận section có đủ dữ liệu; xem journal sau mỗi lần thử. Đây là cổng chặn trước nghiệm thu production nếu gây thiếu nội dung. |
| Ảnh bài viết từ `/Portals/...` trả 404/timeout | URL media cũ không tồn tại hoặc origin media không phản hồi | Cache frontend không sửa ảnh hỏng. Kiểm tra URL ảnh từ server và trình duyệt; xác định kho media chuẩn trước nghiệm thu. |
| Terminal hiện dấu `>` sau khi paste heredoc | Lệnh nhiều dòng bị dán thành một dòng nên shell chờ delimiter | Ngắt bằng Ctrl+C hoặc kết thúc đúng delimiter. Nếu kẹt, mở terminal session mới. Dùng lệnh một dòng đã kiểm tra quoting và xác nhận shell về prompt trước khi chạy tiếp. |

## 5. Checklist trước khi lên `tlu.edu.vn`

### Artifact và cấu hình

- [ ] Chốt SHA đã nghiệm thu staging; lưu SHA trong biên bản deploy.
- [ ] Build riêng với `NEXT_PUBLIC_SITE_URL=https://tlu.edu.vn`; không tái sử dụng build `dev.nguyenhongson.vn`.
- [ ] Xác nhận `WP_SITE_URL`, `WP_API_URL`, media origin và secrets đúng; không commit secrets hoặc đặt chúng trong `NEXT_PUBLIC_*`.
- [ ] Xác minh đường dẫn, service, user, Node version, port, Nginx vhost và SSL production ngay trên server trước khi chạy lệnh.
- [ ] Có backup cấu hình/env và release trước đó; biết thao tác rollback. Không xóa release đang chạy.
- [ ] Lint, typecheck, build và `npm audit --omit=dev` đã hoàn tất; lưu kết quả.

### Nội dung và hiệu năng

- [ ] Trang chủ VI/EN, section, bài viết, chuyên mục, tài liệu, tổ chức, search và chuyển ngôn ngữ hoạt động.
- [ ] Ảnh `/_next/image` và URL media gốc hoạt động; kiểm tra cả media legacy `/Portals/...`.
- [ ] API search/TTS/revalidation không bị cache; cookie/đăng nhập không nhận response cache dùng chung.
- [ ] Không còn `EACCES`; xem log Next/Nginx sau khi mở trang chủ và bài viết.
- [ ] Điều tra `AbortError`/`DYNAMIC_SERVER_USAGE`. Nếu section thiếu dữ liệu, timeout hoặc ảnh quan trọng lỗi thì chưa nghiệm thu production.
- [ ] Đo cold/warm TTFB trên production sau khi triển khai thử và ghi số đo.

### Cutover và rollback

1. Chỉ chuyển traffic/DNS sau khi artifact, env, service, proxy, TLS và smoke test sẵn sàng.
2. Theo dõi HTTP status, TTFB, log Next/Nginx và lỗi API ngay sau cutover; kiểm tra ngôn ngữ, search và một số bài viết.
3. Nếu có 5xx, thiếu section hoặc lỗi nghiêm trọng: quay về release/commit trước. Nếu Nginx gây lỗi, khôi phục include từ backup, chạy `nginx -t`, rồi mới reload.
4. Xác nhận site trả 200 và nội dung đầy đủ sau rollback. Không sửa CMS hay website khác trong rollback frontend.

## 6. Phạm vi an toàn

Deploy frontend không bao gồm thay đổi CMS, database, `wp-config.php`, DNS CMS hoặc website khác. `tlu.edu.vn` có hostname, service và đường dẫn production riêng; xác minh trực tiếp trước mọi thao tác. Số đo staging không đủ để kết luận production sẵn sàng khi lỗi render/API/media còn mở.
