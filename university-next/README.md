# Website Headless WordPress của Trường Đại học Thủy lợi

Frontend Next.js lấy nội dung từ WordPress của `tlu.edu.vn`. Dự án hỗ trợ nội dung Việt/Anh qua Polylang, permalink phẳng, trang chuyên mục, trang bài viết, kho tài liệu, tìm kiếm và đọc bài bằng giọng nói.

## Công nghệ chính

- Next.js 16 App Router, React 19 và TypeScript strict.
- Tailwind CSS 4.
- WordPress REST API và các endpoint headless riêng.
- Polylang để lọc và liên kết bản dịch Việt/Anh.
- Permalink Manager Pro để giữ URL bài viết và chuyên mục dạng phẳng.
- Viettel AI Text-to-Speech cho bài viết tiếng Việt; Web Speech API cho tiếng Anh.
- Font Awesome và `react-countup` cho biểu tượng, số liệu động.

## Yêu cầu môi trường

- Node.js `>=20.9.0`.
- npm theo phiên bản khai báo trong `package.json`.
- WordPress phải bật REST API cho nội dung công khai.
- Các endpoint WordPress tùy biến được liệt kê ở phần tích hợp bên dưới.

## Cài đặt và chạy local

Từ thư mục `university-next`:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Điền token Viettel AI vào `.env.local` nếu cần thử chức năng đọc bài.

Cũng có thể chạy `npm run dev` từ thư mục workspace cha.

## Biến môi trường

File mẫu nằm tại `.env.example`; file dùng thật là `.env.local` và không được commit.

| Biến | Phạm vi | Mục đích |
| --- | --- | --- |
| `NEXT_PUBLIC_WP_BASE_URL` | Trình duyệt | Origin WordPress cho ảnh và tìm kiếm trực tiếp. |
| `NEXT_PUBLIC_SITE_URL` | Trình duyệt | Origin frontend Next.js cho canonical, sitemap và robots. |
| `NEXT_PUBLIC_SITE_NAME` | Trình duyệt | Tên website. |
| `WP_API_URL` | Server | Base URL WordPress REST API, mặc định `/wp-json/wp/v2`. |
| `WP_SITE_URL` | Server | Origin WordPress dùng để tạo endpoint headless. |
| `VIETTEL_TTS_API_URL` | Server | Endpoint tổng hợp giọng nói Viettel AI. |
| `VIETTEL_TTS_TOKEN` | Server | Token bí mật của Viettel AI. |
| `VIETTEL_TTS_VOICE` | Server | Mã giọng đọc, mặc định `hn-quynhanh`. |
| `VIETTEL_TTS_SPEED` | Server | Tốc độ: `0.8`, `0.9`, `1`, `1.1` hoặc `1.2`. |
| `VIETTEL_TTS_WITHOUT_FILTER` | Server | Bật/tắt bộ lọc chất lượng Viettel AI. |
| `TTS_RATE_LIMIT_MAX` | Server | Số request TTS tối đa cho mỗi client trong một cửa sổ, mặc định `30`. |
| `TTS_RATE_LIMIT_WINDOW_SECONDS` | Server | Độ dài cửa sổ rate limit, mặc định `60` giây. |

Không đặt token hoặc khóa bí mật vào biến có tiền tố `NEXT_PUBLIC_`.

## Cấu trúc mã nguồn

```text
src/
├── app/                    # Route, metadata, sitemap, robots và API nội bộ
│   ├── [...path]/          # Bài viết/chuyên mục theo permalink WordPress
│   ├── api/tts/            # Proxy TTS giữ token ở phía server
│   ├── en/                 # Trang chủ tiếng Anh
│   └── van-ban-tai-lieu/   # Kho tài liệu theo taxonomy
├── components/
│   ├── bai-viet/           # Chi tiết bài viết, chia sẻ và đọc bài
│   ├── chuyen-muc/         # Danh sách bài và sidebar chuyên mục
│   ├── layout/             # Header, menu, footer và điều hướng mobile
│   ├── tai-lieu/           # Giao diện taxonomy tài liệu
│   ├── trang-chu/          # Các khu vực trang chủ, đặt tên tiếng Việt
│   └── ui/                 # Component dùng chung
├── config/env/             # Tách biến public và server-only
├── constants/              # Route, slug chuyên mục và thông tin trường
├── lib/wordpress/          # Client và truy vấn WordPress
├── services/               # Tổng hợp dữ liệu cho từng màn hình
├── styles/                 # Công thức Tailwind chuyển từ template cũ
└── types/                  # Kiểu dữ liệu WordPress và ứng dụng
```

Tài liệu khảo sát và thiết kế chi tiết nằm tại `../docs/nextjs-audit`.

## Quy tắc route

| Nội dung | Tiếng Việt | Tiếng Anh |
| --- | --- | --- |
| Trang chủ | `/` | `/en` |
| Bài viết | `/<permalink>` | `/en/<permalink>` |
| Chuyên mục | `/<slug>` | `/en/<slug>` |
| Kho tài liệu | `/van-ban-tai-lieu[/<slug>]` | `/en/van-ban-tai-lieu[/<slug>]` |
| Chi tiết tài liệu | `/tai-lieu/<slug>` | `/en/tai-lieu/<slug>` |
| Cơ cấu tổ chức | `/co-cau-to-chuc` | `/en/organizational-structure` |
| Hồ sơ tổ chức | `/to-chuc/<slug>` | `/en/to-chuc/<slug>` |
| Thư viện Media | `/media[/<album>]` | `/en/media[/<album>]` |

Route `[...path]` kiểm tra chuyên mục trước, sau đó mới kiểm tra bài viết. Không nên đặt bài viết và chuyên mục trùng slug.

URL do WordPress trả về được ưu tiên để giữ đúng permalink có hậu tố ID. Dạng slug thuần chỉ là phương án dự phòng.

## Tích hợp WordPress

Frontend hiện dùng các nhóm endpoint sau:

- WordPress core: posts, pages, categories, media, menus và menu-items dưới `/wp-json/wp/v2`.
- Headless API nội dung: `/wp-json/headless/v1/page`, `/wp-json/headless/v1/term/category/{slug}` và `/wp-json/headless/v1/term/loai-tai-lieu/{slug}`.
- Gallery: `/wp-json/headless/v1/media-gallery/home`, `/media-gallery/categories` và `/media-gallery/categories/{slug}`.
- Cơ cấu tổ chức: `/wp-json/headless/v1/organizations/{slug}` và `/organizations/members/{slug}`.
- Tài liệu: `/wp-json/headless/v1/documents/{slug}` và `/documents/categories/{slug}`.

Production hiện chạy Headless API `1.14.0` (schema `4.7`). Frontend vẫn giữ fallback chỉ đọc từ WordPress core/page cũ để không trả 404 khi nội dung chưa được gán Polylang hoặc một plugin nguồn tạm ngừng hoạt động.

- Sidebar chuyên mục: `/wp-json/acw/v1/sidebar`.
- Tìm kiếm: `/wp-json/wpx-ft/v1/search` và `/wp-json/wpx-ft/v1/suggest`.

Polylang được truyền qua tham số `lang=vi|en`; dữ liệu bản dịch trên bài viết được dùng để tạo liên kết chuyển ngôn ngữ và metadata `hreflang`.

Các endpoint đọc nội dung công khai không cần chứa WordPress Application Password ở frontend. Endpoint ghi dữ liệu hoặc quản trị phải được bảo vệ và không thuộc luồng hiện tại.

## Đọc bài bằng giọng nói

Trình duyệt chỉ gửi `postId`, locale và số thứ tự đoạn tới `POST /api/tts`. Server lấy lại bài viết công khai từ WordPress, chia văn bản, gọi Viettel AI và trả MP3. Token không được gửi xuống trình duyệt.

Âm thanh được cache trong bộ nhớ tối đa 100 đoạn trong 6 giờ. API giới hạn mặc định 30 request/client/phút và trả `429` cùng `Retry-After` khi vượt ngưỡng. Với nhiều replica, reverse proxy phải áp dụng cùng ngưỡng và audio cache nên chuyển sang Redis hoặc object storage.

## Lệnh kiểm tra

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

Chạy cả ba lệnh `lint`, `typecheck` và `build` trước khi triển khai.

## Lưu ý triển khai

- Production phải đặt `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WP_BASE_URL`, `WP_SITE_URL` và `WP_API_URL` bằng URL HTTPS; build sẽ dừng nếu phát hiện HTTP.
- Cấu hình Headless API `frontend_url=https://tlu.edu.vn`; bật Redis Object Cache drop-in trước khi bật response cache của plugin.
- Project chưa có Dockerfile; khi đóng gói Docker, truyền `VIETTEL_TTS_TOKEN` qua secret hoặc biến môi trường lúc chạy, không chép `.env.local` vào image.
- `next.config.ts` đang để ảnh WordPress ở chế độ `unoptimized` do chuỗi chứng chỉ TLS của origin từng không được Node xác minh. Sau khi sửa chứng chỉ tại WordPress nên bật lại Image Optimization.
- Request WordPress dùng thời gian revalidate khác nhau theo loại nội dung; xem `src/config/env/constants.ts`.
- Khi thay đổi permalink, slug Polylang hoặc contract endpoint WordPress, cần kiểm tra đồng thời route VI và EN.

## Nhật ký thay đổi

Xem [CHANGELOG.md](./CHANGELOG.md).
