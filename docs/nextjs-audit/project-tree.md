# Project Tree - Phase 0 Discovery

Dưới đây là cấu trúc thư mục của dự án `university-next` (đã loại bỏ các thư mục artifact như `.next`, `node_modules`, `.git`).

```text
.gitignore
eslint.config.mjs
MASTER-PROMPT.md
next.config.ts
package.json
package-lock.json
postcss.config.mjs
README.md
src/
├── app/
│   ├── en/
│   │   ├── news/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── global-error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── page.tsx
│   └── tin-tuc/
│       └── [slug]/
│           └── page.tsx
├── components/
│   ├── bai-viet/
│   │   └── ChiTietBaiViet.tsx
│   ├── homepage/
│   │   ├── AdmissionsSection.tsx
│   │   ├── AnnouncementsSection.tsx
│   │   ├── CommunitySection.tsx
│   │   ├── CooperationSection.tsx
│   │   ├── EventsSection.tsx
│   │   ├── FeatureCardsSection.tsx
│   │   ├── HeroBanner.tsx
│   │   ├── MomentsGallery.tsx
│   │   ├── NewsSection.tsx
│   │   ├── PartnersSection.tsx
│   │   ├── QuickAccessLinks.tsx
│   │   ├── RectorBanner.tsx
│   │   ├── ResearchSection.tsx
│   │   ├── StatsSection.tsx
│   │   └── TrainingUnitsSection.tsx
│   ├── layout/
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── MainMenu.tsx
│   │   ├── MobileNav.tsx
│   │   ├── navigationUtils.ts
│   │   ├── NavShell.tsx
│   │   ├── SearchBox.tsx
│   │   └── Topbar.tsx
│   ├── ngon-ngu/
│   │   ├── chuyen-ngon-ngu.css
│   │   └── ChuyenNgonNgu.tsx
│   ├── tim-kiem/
│   │   ├── live-search.css
│   │   └── LiveSearch.tsx
│   ├── trang-chu/
│   │   └── TrangChu.tsx
│   └── ui/
│       ├── Breadcrumb.tsx
│       ├── icons.tsx
│       ├── LoadingSpinner.tsx
│       ├── Logo.tsx
│       ├── NewsCard.tsx
│       ├── SectionHeader.tsx
│       └── SectionTitle.tsx
├── constants/
│   ├── api.ts
│   ├── categories.ts
│   ├── duong-dan.ts
│   ├── ngon-ngu.ts
│   ├── seo.ts
│   └── site.ts
├── hooks/
│   ├── index.ts
│   └── useScrollLock.ts
├── lib/
│   ├── api/
│   │   ├── homepage.ts
│   │   └── menus.ts
│   ├── i18n/
│   │   ├── dictionary.ts
│   │   ├── locales.ts
│   │   └── routing.ts
│   ├── seo/
│   │   ├── hreflang.ts
│   │   ├── metadata.ts
│   │   └── schema.ts
│   ├── utils/
│   │   ├── date.ts
│   │   └── html.ts
│   └── wordpress/
│       ├── categories.ts
│       ├── client.ts
│       ├── pages.ts
│       ├── polylang.ts
│       ├── posts.ts
│       └── seo.ts
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
tsconfig.json