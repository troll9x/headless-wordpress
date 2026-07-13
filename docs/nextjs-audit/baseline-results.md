# Baseline Results - Phase 0 Discovery

Kết quả chạy baseline trên môi trường phát triển.

## Bảng tổng hợp

| Hạng mục        | Trạng thái | Bằng chứng     | Mức độ                  |
| --------------- | ---------- | -------------- | ----------------------- |
| Build           | PASS       | `next build` thành công | Low                     |
| TypeScript      | N/A        | Không có script `typecheck` | Medium                  |
| ESLint          | PASS       | 0 errors, 1 warning | Low                     |
| Environment     | FAIL       | Không tìm thấy tệp `.env` | High                    |
| API integration | PASS       | Đã xác minh các hàm fetch trong `lib/wordpress` | Low                     |

## Chi tiết thực hiện

### 1. Build
- **Command**: `npm run build`
- **Kết quả**: Thành công.
- **Routes generated**:
  - `/` (Static)
  - `/_not-found` (Static)
  - `/en` (Static)
  - `/en/news/[slug]` (Dynamic)
  - `/tin-tuc/[slug]` (Dynamic)

### 2. ESLint
- **Command**: `npm run lint`
- **Kết quả**: Pass với 1 cảnh báo.
- **Chi tiết**: 
  - `src/components/tim-kiem/LiveSearch.tsx:252:34`: Warning `no-img-element` (Nên dùng `next/image`).

### 3. TypeScript
- **Trạng thái**: Bỏ qua.
- **Lý do**: `package.json` không định nghĩa script `typecheck`. Cần bổ sung trong Phase 1.

### 4. Test
- **Trạng thái**: Bỏ qua.
- **Lý do**: `package.json` không định nghĩa script `test`.

### 5. Environment
- **Trạng thái**: Fail.
- **Chi tiết**: Không phát hiện bất kỳ tệp `.env` nào trong thư mục gốc hoặc `university-next/`. Ứng dụng hiện đang chạy dựa trên giá trị fallback trong `src/constants/api.ts`.

### 6. API Integration
- **Trạng thái**: Pass.
- **Chi tiết**: Đã rà soát mã nguồn, các endpoint chính (`/posts`, `/pages`, `/categories`, `/menus`) đã được triển khai trong `src/lib/wordpress` và `src/lib/api`.