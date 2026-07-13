# Phase 1 — Project Config và Environment Variables Report

## 1. Hiện trạng trước sửa
- **Scripts**: Thiếu `typecheck` trong `package.json`.
- **Environment**: Truy cập `process.env` rải rác tại `src/constants/api.ts` và `src/services/search.ts`.
- **Boundary**: Không có sự phân tách rõ ràng giữa biến server-only và public, dẫn đến rủi ro bundle biến private vào client side.
- **Configuration**: Thiếu `engines` và `packageManager` trong `package.json`.
- **Example**: Thiếu tệp `.env.example`.

## 2. Bảng toàn bộ biến môi trường

| Variable | Public/Private | Required/Optional | Nơi dùng | Runtime | Fallback | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `WP_API_URL` | Private | Required | `lib/wordpress/client.ts` | Server | `.../wp-json/wp/v2` | High |
| `WP_SITE_URL` | Private | Required | `lib/api/menus.ts` | Server | `https://tlu.edu.vn` | Medium |
| `NEXT_PUBLIC_WP_BASE_URL` | Public | Required | `services/search.ts` | Client | `https://tlu.edu.vn` | High |
| `NEXT_PUBLIC_SITE_URL` | Public | Required | `constants/api.ts` | Client | `http://localhost:3000` | Medium |
| `NEXT_PUBLIC_SITE_NAME` | Public | Optional | `constants/api.ts` | Client | `MyLab TLU` | Low |

## 3. Phân loại Public/Private
- **Public (Browser-exposed)**: `NEXT_PUBLIC_WP_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`. Các biến này được định nghĩa trong `src/config/env/public.ts`.
- **Private (Server-only)**: `WP_API_URL`, `WP_SITE_URL`. Các biến này được định nghĩa trong `src/config/env/server.ts` và tuyệt đối không được import vào Client Components.

## 4. Các thay đổi đã thực hiện

### Cấu hình Dự án
- Cập nhật `university-next/package.json`:
  - Thêm script `"typecheck": "tsc --noEmit"`.
  - Thêm `"engines": { "node": ">=20.9.0" }` dựa trên yêu cầu của Next.js 16.
  - Thêm `"packageManager": "npm@11.18.0"` dựa trên môi trường thực tế.

### Quản lý Biến Môi trường
- Tạo module tập trung tại `university-next/src/config/env/`:
  - `public.ts`: Chứa các biến `NEXT_PUBLIC_*`, an toàn cho browser.
  - `server.ts`: Chứa các biến private, chỉ dùng trên server.
  - `constants.ts`: Chứa các hằng số revalidation và cache tags.
- Tạo `university-next/src/config/env.ts` làm entry point để re-export an toàn.
- Cập nhật `university-next/src/constants/api.ts` để đóng vai trò layer tương thích (backward compatibility), chỉ export các biến an toàn cho client.
- Cập nhật import tại `src/lib/wordpress/client.ts` và `src/lib/api/menus.ts` để import trực tiếp từ `env/server`.
- Tạo tệp `university-next/.env.example` làm mẫu.

## 5. Migration Instructions
Không có thay đổi về tên biến môi trường hiện có, nên không cần migration cho các tệp `.env` hiện tại. Các import trong code đã được chuyển đổi để an toàn hơn.

## 6. Cách tạo .env.local
Để chạy dự án, thực hiện sao chép tệp mẫu:
```bash
cp .env.example .env.local
```
Sau đó chỉnh sửa các giá trị trong `.env.local` phù hợp với môi trường WordPress.

## 7. Biến bắt buộc cho Development
- `NEXT_PUBLIC_SITE_URL`: URL của ứng dụng Next.js (ví dụ: `http://localhost:3000`).
- `NEXT_PUBLIC_WP_BASE_URL`: Base URL của WordPress để phục vụ tìm kiếm client-side.

## 8. Biến bắt buộc cho Production
- `WP_API_URL`: Endpoint REST API chính xác của WordPress Production.
- `WP_SITE_URL`: URL chính thức của website WordPress Production.
- `NEXT_PUBLIC_SITE_URL`: Domain production của Next.js.
- `NEXT_PUBLIC_WP_BASE_URL`: Domain production của WordPress.

## 9. Known Limitations
- Hiện tại đang sử dụng fallback values trong code để đảm bảo build không thất bại khi thiếu `.env`.

## 10. Remaining Risks
- **ESLint Warning**: Còn 1 cảnh báo về `no-img-element` tại `src/components/tim-kiem/LiveSearch.tsx`. Vấn đề này thuộc phạm vi Component/UI và sẽ được xử lý tại Phase 6.

## 11. Kết quả kiểm tra sau sửa

| Command | Exit Code | Result | Note |
| :--- | :--- | :--- | :--- |
| `npm run lint` | 0 | PASS | 1 warning (`no-img-element` in `LiveSearch.tsx`) |
| `npm run typecheck` | 0 | PASS | No type errors |
| `npm run build` | 0 | PASS | Build successful, 5 routes generated |

**Chi tiết Build:**
- `/` (Static)
- `/_not-found` (Static)
- `/en` (Static)
- `/en/news/[slug]` (Dynamic)
- `/tin-tuc/[slug]` (Dynamic)