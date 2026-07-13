# Phase 0 — Discovery và Baseline Report

## 1. Tổng hợp trạng thái

| Hạng mục        | Trạng thái | Bằng chứng     | Mức độ                  |
| --------------- | ---------- | -------------- | ----------------------- |
| Build           | PASS       | `next build` thành công | Low                     |
| TypeScript      | N/A        | Không có script `typecheck` | Medium                  |
| ESLint          | PASS       | 0 errors, 1 warning | Low                     |
| Environment     | FAIL       | Không tìm thấy tệp `.env` | High                    |
| API integration | PASS       | Đã xác minh các hàm fetch trong `lib/wordpress` | Low                     |

## 2. Phát hiện chính

### Kỹ thuật & Kiến trúc
- **Framework**: Next.js 16.2.9 (App Router), React 19.2.4.
- **Styling**: Tailwind CSS 4 với PostCSS.
- **Language**: TypeScript 5 (Strict mode).
- **Routing**: Sử dụng App Router với cấu trúc đa ngôn ngữ (vi/en) cơ bản:
  - `/` (vi) và `/en` (en).
  - Dynamic routes cho tin tức: `/tin-tuc/[slug]` và `/en/news/[slug]`.
- **Data Fetching**: Sử dụng Server Components để fetch dữ liệu trực tiếp từ WordPress API thông qua lớp `lib/wordpress` và `services`.

### Vấn đề & Rủi ro
- **Environment**: Toàn bộ cấu hình API (`WP_API_URL`, `WP_SITE_URL`) đang dùng giá trị fallback trong `src/constants/api.ts`. Thiếu file `.env` khiến việc triển khai lên các môi trường khác nhau trở nên khó khăn.
- **Tooling**: Thiếu các script quan trọng trong `package.json` như `typecheck` và `test`.
- **Performance**: Phát hiện sử dụng thẻ `<img>` thay vì `next/image` tại `src/components/tim-kiem/LiveSearch.tsx`.

## 3. Kiến trúc hiện tại (Current Architecture)
Dự án tuân thủ mô hình phân lớp:
- **App Layer (`src/app`)**: Định nghĩa routes, layouts và server components.
- **Component Layer (`src/components`)**: Chia thành UI (generic) và Feature components.
- **Service Layer (`src/services`)**: Xử lý logic nghiệp vụ và điều phối dữ liệu.
- **API Layer (`src/lib/wordpress`)**: Client giao tiếp trực tiếp với WordPress REST API.
- **Constants & Types**: Quản lý tập trung tại `src/constants` và `src/types`.

---

## PHASE 0 RESULT

**Overall status**: PASS WITH WARNINGS

**Blockers**: 
- Thiếu hệ thống quản lý biến môi trường (`.env` và validation).

**High-priority findings**:
- Thiếu script `typecheck` và `test` trong `package.json`.
- Cấu hình API đang bị hard-code/fallback.

**Current architecture**: 
- Next.js 16 App Router + TS + Tailwind 4 + WordPress Headless API.

**Recommended Phase 1 scope**: 
- Chuẩn hóa `package.json` (thêm scripts).
- Thiết lập hệ thống biến môi trường chuyên nghiệp (tạo `.env.example`, xây dựng `src/config/env.ts` để validate).

**Files proposed for Phase 1**:
- `university-next/package.json`
- `university-next/.env.example`
- `university-next/src/config/env.ts` (tạo mới)