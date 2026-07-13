# Target Tree — Phase 2 Architecture

## 1. Cấu trúc hiện tại sau Phase 2

```text
university-next/
├── .env.example                              [created in Phase 1]
├── package.json                              [modified in Phase 1]
└── src/
    ├── app/
    │   ├── en/
    │   │   ├── news/[slug]/page.tsx
    │   │   └── page.tsx
    │   ├── tin-tuc/[slug]/page.tsx
    │   ├── favicon.ico
    │   ├── global-error.tsx
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── loading.tsx
    │   └── page.tsx
    ├── components/
    │   ├── bai-viet/
    │   ├── homepage/
    │   ├── layout/
    │   ├── ngon-ngu/
    │   ├── tim-kiem/
    │   ├── trang-chu/
    │   └── ui/
    ├── config/
    │   ├── env.ts                             [shared public-safe entry point]
    │   └── env/
    │       ├── constants.ts                   [non-environment constants]
    │       ├── public.ts                      [browser-exposed env only]
    │       └── server.ts                      [server-only env only]
    ├── constants/
    │   ├── api.ts                             [public-safe compatibility exports]
    │   ├── categories.ts
    │   ├── duong-dan.ts
    │   ├── ngon-ngu.ts
    │   ├── seo.ts
    │   └── site.ts
    ├── hooks/
    │   └── useScrollLock.ts
    ├── lib/
    │   ├── api/
    │   ├── i18n/
    │   ├── seo/
    │   ├── utils/
    │   └── wordpress/
    ├── services/
    │   ├── homepage.ts
    │   ├── navigation.ts
    │   └── search.ts
    ├── styles/
    │   └── variables.css
    └── types/
        ├── homepage.ts
        ├── ngon-ngu.ts
        ├── search.ts
        ├── seo.ts
        └── wordpress.ts
```

## 2. Cấu trúc đề xuất

Cấu trúc hiện tại được giữ nguyên vì các module đã có ranh giới hợp lý cho quy mô dự án hiện tại. Mục tiêu của Phase 2 không phải di chuyển hàng loạt để khớp một mẫu tham khảo.

Các ranh giới được chuẩn hóa:
- `config/env/public.ts`: chỉ biến `NEXT_PUBLIC_*`.
- `config/env/server.ts`: chỉ biến private cho server.
- `config/env.ts`: không re-export môi trường server.
- `constants/api.ts`: không import/re-export private server environment.
- `lib/wordpress/client.ts` và `lib/api/menus.ts`: import trực tiếp môi trường server.

## 3. File thực sự đã di chuyển

Không có file nào được di chuyển trong Phase 2.

## 4. File thực sự đã xóa

| File | Lý do |
| :--- | :--- |
| `src/hooks/index.ts` | Empty barrel (`export {}`), không có import/reference và không phải framework entry point |

## 5. File chỉ đề xuất đánh giá ở phase sau

| Khu vực | Đề xuất | Phase phù hợp | Lý do chưa thực hiện |
| :--- | :--- | :--- | :--- |
| `lib/wordpress` và `lib/api` | Chuẩn hóa endpoint contract, errors, response validation | Phase 3 | Cần bằng chứng API/plugin/schema thực tế |
| `services/search.ts` | Đánh giá URL/contract search client-side | Phase 3 / Phase 8 | Không thay search behavior trong Phase 2 |
| `components/tim-kiem/LiveSearch.tsx` | Chuyển `<img>` sang `next/image` nếu thích hợp | Phase 6 | Là thay đổi component/image, ngoài scope Phase 2 |
| `components/homepage/*` | Đánh giá kích thước feature component và block boundaries | Phase 6 | Không refactor UI/component lớn trong Phase 2 |
| `constants/api.ts` | Cân nhắc bỏ compatibility aliases khi toàn bộ caller đã migration | Phase sau | Tránh đổi import hàng loạt không cần thiết |