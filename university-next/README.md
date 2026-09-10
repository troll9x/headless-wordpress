# TLU Headless Web

Nền tảng website Trường Đại học Thủy lợi được xây dựng bằng Next.js và sử dụng WordPress làm hệ quản trị nội dung headless. Sản phẩm cung cấp trải nghiệm web Việt/Anh, giữ cấu trúc permalink của website hiện hữu và tách hoàn toàn lớp trình bày khỏi WordPress.

## Tổng quan sản phẩm

TLU Headless Web phục vụ ba nhóm nhu cầu chính:

- Người dùng truy cập tin tức, thông báo, sự kiện, tài liệu, thư viện ảnh và thông tin tổ chức trên giao diện nhanh, responsive và thân thiện SEO.
- Biên tập viên tiếp tục quản lý nội dung, media, menu, taxonomy và bản dịch trong WordPress.
- Đội kỹ thuật triển khai frontend độc lập, kiểm soát cache, bảo mật, quan sát lỗi và cập nhật giao diện mà không sửa theme WordPress.

### Tính năng nổi bật

| Nhóm | Khả năng |
| --- | --- |
| Nội dung | Trang chủ động, bài viết, trang, chuyên mục và permalink phẳng theo WordPress. |
| Đa ngôn ngữ | Nội dung Việt/Anh, liên kết bản dịch, `hreflang` và route riêng cho từng ngôn ngữ. |
| Tuyển sinh và đào tạo | Khu vực tuyển sinh, đơn vị đào tạo, nghiên cứu, hợp tác quốc tế và liên kết nhanh. |
| Tin tức | Tin nổi bật, thông báo, sự kiện, archive chuyên mục và sidebar điều hướng. |
| Tài liệu | Kho văn bản theo taxonomy, trang chi tiết và tải tệp trực tiếp khi phù hợp. |
| Tổ chức | Cơ cấu tổ chức, danh sách thành viên và hồ sơ cán bộ. |
| Media | Album, thư viện ảnh và gallery trang chủ. |
| Tìm kiếm | Tìm kiếm toàn trang và gợi ý trực tiếp qua API nội bộ. |
| Trợ năng | Đọc bài tiếng Việt bằng Viettel AI và tiếng Anh bằng Web Speech API. |
| SEO | Metadata, canonical, Open Graph, schema, sitemap và robots động. |
| Hiệu năng | Server Components, cache theo loại dữ liệu, ISR và on-demand revalidation. |
| Bảo mật | CSP, HSTS, lọc HTML, rate limit TTS và webhook HMAC chống giả mạo/phát lại. |

## Kiến trúc

```text
Trình duyệt
    │
    ▼
Next.js App Router
    ├── Render giao diện và metadata
    ├── /api/search       Proxy tìm kiếm
    ├── /api/tts          Proxy Viettel AI, giữ token phía server
    └── /api/revalidate   Nhận webhook có chữ ký từ WordPress
    │
    ▼
WordPress REST API
    ├── WordPress Core REST
    ├── Headless API
    ├── Polylang
    ├── ACF
    └── Các dịch vụ tìm kiếm/gallery hiện hữu
```

WordPress là nguồn dữ liệu và nơi biên tập. Next.js chịu trách nhiệm định tuyến, render, cache, SEO và trải nghiệm người dùng. Khi nội dung thay đổi, WordPress gửi webhook tới Next.js để làm mới đúng path và cache tag liên quan.

## Công nghệ

- Next.js 16 App Router.
- React 19 và TypeScript strict.
- Tailwind CSS 4.
- WordPress REST API và Headless API schema `4.7`.
- Polylang, ACF Pro và Rank Math.
- Viettel AI Text-to-Speech.
- Font Awesome, Swiper và `react-countup`.

## Yêu cầu hệ thống

- Node.js `>=20.9.0`; nên dùng một phiên bản Node.js LTS còn được hỗ trợ.
- npm theo phiên bản được khai báo trong `package.json`; dùng `npm ci` để cài đúng lockfile.
- WordPress `>=6.0` với REST API công khai hoạt động.
- HTTPS cho toàn bộ URL frontend và WordPress ở môi trường production.
- Quyền truy cập các endpoint WordPress được liệt kê trong phần tích hợp.

## Bắt đầu nhanh

Clone repository và chuyển vào ứng dụng:

```bash
git clone https://github.com/troll9x/headless-wordpress.git
cd headless-wordpress/university-next
npm ci
```

Tạo file môi trường trên Linux/macOS:

```bash
cp .env.example .env.local
```

Hoặc trên PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Khởi động môi trường phát triển:

```bash
npm run dev
```

Mở `http://localhost:3000`. Chức năng TTS tiếng Việt chỉ hoạt động khi `VIETTEL_TTS_TOKEN` hợp lệ; các phần còn lại không được phụ thuộc vào token này.

## Biến môi trường

Sao chép `.env.example` thành `.env.local` khi phát triển hoặc `.env.production.local` trên máy chủ. Hai file này đã được Git bỏ qua.

### Public variables

Các biến có tiền tố `NEXT_PUBLIC_` có thể xuất hiện trong bundle trình duyệt.

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `NEXT_PUBLIC_WP_BASE_URL` | Có | Origin WordPress dùng cho media và các luồng chạy trên trình duyệt. |
| `NEXT_PUBLIC_SITE_URL` | Có | Origin frontend dùng cho canonical, sitemap, robots và liên kết chia sẻ. |
| `NEXT_PUBLIC_SITE_NAME` | Có | Tên website hiển thị trong metadata và giao diện. |

### Server-only variables

| Biến | Bắt buộc | Mặc định/Mô tả |
| --- | --- | --- |
| `WP_API_URL` | Có | Base URL WordPress Core REST, thường là `/wp-json/wp/v2`. |
| `WP_SITE_URL` | Có | Origin WordPress dùng để xây dựng các endpoint headless. |
| `VIETTEL_TTS_API_URL` | Khi dùng TTS | `https://viettelai.vn/tts/speech_synthesis`. |
| `VIETTEL_TTS_TOKEN` | Khi dùng TTS | Token Viettel AI; không được đưa vào `NEXT_PUBLIC_*`. |
| `VIETTEL_TTS_VOICE` | Không | `hn-quynhanh`. |
| `VIETTEL_TTS_SPEED` | Không | Một trong `0.8`, `0.9`, `1`, `1.1`, `1.2`. |
| `VIETTEL_TTS_WITHOUT_FILTER` | Không | `false`. |
| `TTS_RATE_LIMIT_MAX` | Không | Tối đa `30` request/client trong một cửa sổ. |
| `TTS_RATE_LIMIT_WINDOW_SECONDS` | Không | Cửa sổ rate limit `60` giây. |
| `REVALIDATION_SECRET` | Production | Secret dùng để xác minh webhook HMAC từ WordPress. |
| `REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS` | Không | Sai lệch timestamp tối đa `300` giây. |
| `REVALIDATION_MAX_BODY_BYTES` | Không | Kích thước payload tối đa `262144` byte. |

Ví dụ production:

```dotenv
NEXT_PUBLIC_WP_BASE_URL=https://cms.example.edu.vn
NEXT_PUBLIC_SITE_URL=https://www.example.edu.vn
NEXT_PUBLIC_SITE_NAME=Trường Đại học Thủy lợi

WP_API_URL=https://cms.example.edu.vn/wp-json/wp/v2
WP_SITE_URL=https://cms.example.edu.vn

VIETTEL_TTS_API_URL=https://viettelai.vn/tts/speech_synthesis
VIETTEL_TTS_TOKEN=
VIETTEL_TTS_VOICE=hn-quynhanh
VIETTEL_TTS_SPEED=1
VIETTEL_TTS_WITHOUT_FILTER=false
TTS_RATE_LIMIT_MAX=30
TTS_RATE_LIMIT_WINDOW_SECONDS=60

REVALIDATION_SECRET=
REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS=300
REVALIDATION_MAX_BODY_BYTES=262144
```

Không commit token, secret, Application Password hoặc file `.env.local`.

Nếu hostname WordPress khác `tlu.edu.vn` hoặc `www.tlu.edu.vn`, hãy thêm hostname đó vào `images.remotePatterns` trong `next.config.ts` trước khi build.

## Định tuyến

| Nội dung | Tiếng Việt | Tiếng Anh |
| --- | --- | --- |
| Trang chủ | `/` | `/en` |
| Bài viết/trang động | `/<permalink>` | `/en/<permalink>` |
| Chuyên mục | `/<slug>` | `/en/<slug>` |
| Tìm kiếm | `/tim-kiem` | `/en/search` |
| Kho tài liệu | `/van-ban-tai-lieu[/<slug>]` | `/en/van-ban-tai-lieu[/<slug>]` |
| Chi tiết tài liệu | `/tai-lieu/<slug>` | `/en/tai-lieu/<slug>` |
| Cơ cấu tổ chức | `/co-cau-to-chuc` | `/en/organizational-structure` |
| Hồ sơ tổ chức | `/to-chuc/<slug>` | `/en/to-chuc/<slug>` |
| Thư viện media | `/media[/<album>]` | `/en/media[/<album>]` |

Catch-all route `[...path]` ưu tiên phân giải chuyên mục trước bài viết. Không nên cấu hình bài viết và chuyên mục có cùng slug. URL do WordPress trả về được ưu tiên để giữ permalink hiện hữu; slug thuần chỉ là phương án dự phòng.

## API nội bộ

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/search?q=...&lang=vi&limit=5` | Chuẩn hóa tìm kiếm và giới hạn dữ liệu trả về cho live search. |
| `POST` | `/api/tts` | Xác minh bài viết, gọi Viettel AI và trả dữ liệu âm thanh. |
| `POST` | `/api/revalidate` | Xác minh webhook WordPress, làm mới path và cache tag. |

API revalidation yêu cầu JSON, event ID, timestamp và chữ ký HMAC hợp lệ. Secret rỗng làm endpoint trả `503`; payload quá hạn, trùng lặp hoặc sai chữ ký bị từ chối.

## Tích hợp WordPress

Frontend sử dụng các nhóm endpoint sau:

- WordPress Core: `/wp-json/wp/v2` cho posts, pages, categories và media.
- Nội dung headless: `/wp-json/headless/v1/page`, `/resolve`, `/archive`, `/seo` và taxonomy.
- Menu: `/wp-json/headless/v1/menus`.
- Tìm kiếm: `/wp-json/headless/v1/search`, có fallback cho WPX Fulltext.
- Gallery: `/wp-json/headless/v1/media-gallery/*`.
- Đối tác: `/wp-json/headless/v1/partner-logos`.
- Tổ chức: `/wp-json/headless/v1/organizations/*`.
- Tài liệu: `/wp-json/headless/v1/documents/*`.
- Sidebar cũ: `/wp-json/acw/v1/sidebar`.

Polylang được truyền bằng `lang=vi|en`. Các endpoint đọc nội dung công khai không cần WordPress Application Password. Route ghi dữ liệu, preview, cache và quản trị phải giữ cơ chế xác thực riêng.

### On-demand revalidation

Tạo secret ít nhất 32 byte:

```bash
openssl rand -hex 32
```

Đặt cùng một giá trị vào `REVALIDATION_SECRET` của Next.js và cấu hình WordPress. URL webhook production:

```text
https://www.example.edu.vn/api/revalidate
```

WordPress cần chạy WP-Cron ổn định để queue webhook không bị chậm. Khi sử dụng nhiều instance Next.js, cần chuyển replay state/cache sang hạ tầng dùng chung hoặc bảo đảm webhook được phân phối nhất quán.

## Cấu trúc thư mục

```text
src/
├── app/                 App Router, page, metadata và API route
├── components/          Component theo nghiệp vụ và component dùng chung
├── config/env/          Kiểm tra biến public, server-only và cache constants
├── constants/           Route, chuyên mục và cấu hình website
├── hooks/               React hooks dùng chung
├── lib/
│   ├── security/        HTML sanitization, rate limit và webhook verification
│   ├── seo/             Metadata, hreflang và structured data
│   ├── utils/           Tiện ích dữ liệu, ngày tháng và HTML
│   └── wordpress/       REST client và truy vấn theo miền nghiệp vụ
├── services/            Tổng hợp dữ liệu cho màn hình
├── styles/              Font và công thức giao diện
└── types/               Kiểu dữ liệu ứng dụng, WordPress, SEO và tìm kiếm
```

## Scripts

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy development server bằng Webpack. |
| `npm run lint` | Kiểm tra ESLint. |
| `npm run typecheck` | Kiểm tra TypeScript mà không tạo output. |
| `npm run build` | Tạo production build. |
| `npm run start` | Chạy production server từ thư mục `.next`. |

Trước mỗi lần phát hành:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

## Triển khai production

Ứng dụng phải được triển khai dưới dạng Node.js server; không dùng static export vì project có Server Components, API routes, ISR và on-demand revalidation.

### aaPanel

1. Cài Nginx và Node.js LTS trong aaPanel.
2. Clone repository vào `/www/wwwroot/headless-wordpress`.
3. Tạo `university-next/.env.production.local` trước khi build.
4. Chạy `npm ci`, `npm run lint`, `npm run typecheck` và `npm run build` trong `university-next`.
5. Tạo Node Project với document root là thư mục `university-next`, run script `start`, user `www` và cổng nội bộ `3000`.
6. Bật Domain Mapping, reverse proxy tới `127.0.0.1:3000` và cấp SSL Let's Encrypt.
7. Không mở cổng `3000` ra Internet và không bật proxy cache cho toàn bộ HTML/API.

Nginx proxy tối thiểu:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 300s;
}
```

Sau khi đổi bất kỳ biến `NEXT_PUBLIC_*` nào, phải build lại và restart Node Project.

## Cache và khả năng mở rộng

- Request WordPress sử dụng thời gian revalidate và cache tag riêng theo loại nội dung.
- TTS cache tối đa 100 đoạn trong bộ nhớ tiến trình, thời hạn 6 giờ.
- Rate limit TTS mặc định cũng nằm trong bộ nhớ tiến trình.
- Một instance `next start` phù hợp cho triển khai ban đầu trên aaPanel.
- Với nhiều instance, cần cache/replay store dùng chung và cơ chế đồng bộ revalidation.
- `next.config.ts` hiện để ảnh WordPress ở chế độ `unoptimized`. Chỉ bật Image Optimization sau khi chuỗi chứng chỉ TLS của WordPress được Node.js xác minh ổn định.

## Xử lý sự cố

| Hiện tượng | Kiểm tra |
| --- | --- |
| Build báo URL không hợp lệ | Bốn biến URL phải là URL đầy đủ và dùng HTTPS trong production. |
| Ảnh WordPress không hiển thị | Kiểm tra `NEXT_PUBLIC_WP_BASE_URL`, CSP, TLS và `images.remotePatterns`. |
| API trả `404` | Kiểm tra plugin nguồn, permalink WordPress và endpoint health/schema. |
| CORS bị chặn | Thêm chính xác origin frontend vào allowlist WordPress, không kèm path. |
| Nội dung cũ sau khi sửa bài | Kiểm tra webhook URL, secret, WP-Cron và log revalidation. |
| TTS trả `503` | Chưa cấu hình `VIETTEL_TTS_TOKEN` hoặc dịch vụ nguồn không sẵn sàng. |
| TTS trả `429` | Client đã vượt giới hạn trong cửa sổ rate limit. |
| aaPanel trả `502` | Node Project chưa chạy, sai port hoặc cấu hình reverse proxy sai. |

## Tài liệu liên quan

- [API contract](./API.md)
- [Nhật ký thay đổi](./CHANGELOG.md)
- Tài liệu khảo sát và thiết kế: `../docs/nextjs-audit`

## Bản quyền

Dự án nội bộ phục vụ website Trường Đại học Thủy lợi. Việc sử dụng mã nguồn, nội dung, logo, font và tài nguyên thương hiệu phải tuân theo quyền sở hữu và quy định của đơn vị quản lý.
