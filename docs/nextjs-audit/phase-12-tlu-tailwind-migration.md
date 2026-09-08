# Phase 12 — Chuyển CSS tlu.edu.vn sang Tailwind CSS

## Phạm vi

Nguồn đối chiếu là file CSS tlu.edu.vn gồm 2.592 dòng. Việc chuyển đổi được
thực hiện theo component React đang tồn tại trong `university-next`, không đưa
selector của theme Flatsome/WordPress vào Next.js khi chưa có markup tương ứng.

## Mapping đã thực hiện

| CSS nguồn | Component Next.js | Tailwind tương ứng |
| --- | --- | --- |
| Header tablet/desktop tại 1024/1025px | `Topbar`, `NavShell`, `MobileNav` | `min-[1025px]:...` và mặc định mobile/tablet |
| Search cao 50px, font 17px, inset shadow | `LiveSearch` | `h-[50px]`, `text-[17px]`, arbitrary shadow |
| Menu Raleway, chữ 15px, màu trắng | `MainMenu` | font arbitrary, `text-[15px]`, `bg-[#0118d8]` |
| Dropdown bo 10px, viền trên `#136aa0` | `MainMenu` | radius, border và hover transition bằng utilities |
| Footer xanh, link trắng hover vàng | `Footer` | utilities màu, pseudo-element `after:` và transition |
| `.block-title` viền dưới xanh 3px | `SectionTitle`, `SectionHeader` | `border-b-[3px] border-[#0118d8]` |
| `.home-blog` card bo 10px và shadow | `NewsCard`, `NewsSection`, `EventsSection` | radius/shadow arbitrary, title `#0118d8` |
| Mobile list ảnh 90×90 | `NewsCard` horizontal | `h-[90px] w-[90px]`, đổi lại desktop ở `sm:` |
| `.tuyen-sinh-home` shadow | `AdmissionsSection` | arbitrary box-shadow, bỏ shadow dưới 480px |
| `.so-an-tuong` 5 cột từ 850px | `StatsSection` | `min-[850px]:grid-cols-5` |
| Quote banner bo trái 500px, dấu quote responsive | `RectorBanner` | radius và pseudo-element `after:` |
| Logo đối tác tối đa 150px | `PartnersSection` | `max-w-[150px]` |
| Single post title/category/meta | `ChiTietBaiViet` | utilities màu, căn giữa, responsive và hover |
| WordPress rich HTML/table | `ChiTietBaiViet` | arbitrary descendant variants `[&_tag]:...` |
| `.cke_show_border` | `ChiTietBaiViet` | descendant variants cho table/th/td |

## CSS đã loại bỏ

- Xóa `src/components/tim-kiem/live-search.css`; toàn bộ style đã nằm trong
  `LiveSearch.tsx` dưới dạng utility Tailwind.
- Xóa các selector `.article-body` khỏi `globals.css`; rich content WordPress
  được style ngay tại renderer bằng arbitrary variants.
- `globals.css` chỉ còn import Tailwind, theme tokens và màu nền/chữ toàn cục.

## Catalog dành cho template sẽ bổ sung

Toàn bộ nhóm chưa có markup đã được chuyển trước thành recipe trong
`src/styles/tlu-template-recipes.ts`. File này gồm:

- `blogArchiveStyles` và `categoryBannerStyles`.
- `tabbedContentStyles` và `categorySidebarStyles`.
- `quoteSectionStyles` và `admissionsFeatureStyles`.
- `documentArchiveStyles`.
- `singlePostTemplateStyles`.
- `recruitmentDetailStyles`, `recruitmentPopupStyles`,
  `recruitmentListStyles`.
- `organizationStyles` và `organizationModalStyles`.
- `historyPageStyles`.
- `featuredSliderStyles`.
- `miscTemplateStyles`.

Ví dụ khi có template:

```tsx
import { organizationStyles as styles } from '@/styles/tlu-template-recipes';

<section className={styles.root}>
  <article className={styles.leaderCard}>...</article>
</section>
```

Các trạng thái `active`/`open` là recipe riêng để React ghép theo state. Những
quan hệ hover cha-con dùng named group như `group/submenu`, vì vậy template cần
giữ đúng vai trò semantic được mô tả bởi tên key.

## Kiểm tra

| Lệnh | Kết quả |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS, không phụ thuộc tải Google Fonts |
| `git diff --check` | PASS |

Trình duyệt tích hợp không có phiên khả dụng trong lượt kiểm tra này, vì vậy
visual QA trực tiếp ở 375px/768px/1024px/desktop vẫn là bước xác nhận thủ công
còn lại.
