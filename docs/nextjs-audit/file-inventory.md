# File Inventory - Phase 0 Discovery

Danh sách phân loại toàn bộ các tệp tin quan trọng trong dự án.

## 1. App Router & Pages
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/app/page.tsx` | Route | Homepage (Vietnamese) |
| `src/app/en/page.tsx` | Route | Homepage (English) |
| `src/app/tin-tuc/[slug]/page.tsx` | Route | News Detail (Vietnamese) |
| `src/app/en/news/[slug]/page.tsx` | Route | News Detail (English) |
| `src/app/layout.tsx` | Layout | Root Layout |
| `src/app/loading.tsx` | Layout | Global Loading state |
| `src/app/global-error.tsx` | Layout | Global Error boundary (Client Component) |

## 2. Components
### UI Components (Generic)
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/components/ui/Breadcrumb.tsx` | UI component | |
| `src/components/ui/icons.tsx` | UI component | |
| `src/components/ui/LoadingSpinner.tsx` | UI component | |
| `src/components/ui/Logo.tsx` | UI component | |
| `src/components/ui/NewsCard.tsx` | UI component | |
| `src/components/ui/SectionHeader.tsx` | UI component | |
| `src/components/ui/SectionTitle.tsx` | UI component | |

### Feature Components
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/components/trang-chu/TrangChu.tsx` | Feature component | Main homepage wrapper |
| `src/components/homepage/HeroBanner.tsx` | Feature component | |
| `src/components/homepage/RectorBanner.tsx` | Feature component | |
| `src/components/homepage/NewsSection.tsx` | Feature component | |
| `src/components/homepage/EventsSection.tsx` | Feature component | |
| `src/components/homepage/AdmissionsSection.tsx` | Feature component | |
| `src/components/homepage/AnnouncementsSection.tsx` | Feature component | |
| `src/components/homepage/CommunitySection.tsx` | Feature component | |
| `src/components/homepage/CooperationSection.tsx` | Feature component | |
| `src/components/homepage/FeatureCardsSection.tsx` | Feature component | |
| `src/components/homepage/MomentsGallery.tsx` | Feature component | |
| `src/components/homepage/PartnersSection.tsx` | Feature component | |
| `src/components/homepage/QuickAccessLinks.tsx` | Feature component | |
| `src/components/homepage/ResearchSection.tsx` | Feature component | |
| `src/components/homepage/StatsSection.tsx` | Feature component | |
| `src/components/homepage/TrainingUnitsSection.tsx` | Feature component | |
| `src/components/bai-viet/ChiTietBaiViet.tsx` | Feature component | Article detail content |
| `src/components/ngon-ngu/ChuyenNgonNgu.tsx` | Feature component | Language switcher |
| `src/components/tim-kiem/LiveSearch.tsx` | Feature component | Search with live results |

### Layout Components
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/components/layout/Header.tsx` | Feature component | |
| `src/components/layout/Footer.tsx` | Feature component | |
| `src/components/layout/MainMenu.tsx` | Feature component | |
| `src/components/layout/MobileNav.tsx` | Feature component | |
| `src/components/layout/NavShell.tsx` | Feature component | |
| `src/components/layout/Topbar.tsx` | Feature component | |
| `src/components/layout/SearchBox.tsx` | Feature component | |

## 3. Data Fetching & API
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/lib/wordpress/client.ts` | API client | Base fetcher for WP |
| `src/lib/wordpress/posts.ts` | API client | Post-related endpoints |
| `src/lib/wordpress/pages.ts` | API client | Page-related endpoints |
| `src/lib/wordpress/categories.ts` | API client | Category endpoints |
| `src/lib/wordpress/polylang.ts` | API client | Polylang i18n endpoints |
| `src/lib/wordpress/seo.ts` | API client | SEO endpoints |
| `src/lib/api/homepage.ts` | Data fetching | Aggregated data for homepage |
| `src/lib/api/menus.ts` | Data fetching | Menu data fetching |
| `src/services/homepage.ts` | Data fetching | Business logic for homepage |
| `src/services/navigation.ts` | Data fetching | Navigation logic |
| `src/services/search.ts` | Data fetching | Search logic |

## 4. Core Logic & Config
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/constants/api.ts` | Configuration | API Base URLs & Env fallbacks |
| `src/constants/site.ts` | Configuration | Site-wide constants |
| `src/constants/ngon-ngu.ts` | Configuration | Language settings |
| `src/constants/duong-dan.ts` | Configuration | Path constants |
| `src/constants/categories.ts` | Configuration | Category constants |
| `src/constants/seo.ts` | Configuration | SEO constants |
| `src/lib/i18n/dictionary.ts` | Utility | i18n translation dictionary |
| `src/lib/i18n/locales.ts` | Configuration | Supported locales |
| `src/lib/i18n/routing.ts` | Utility | i18n routing logic |
| `src/lib/seo/metadata.ts` | Utility | Metadata generator |
| `src/lib/seo/hreflang.ts` | Utility | Hreflang generator |
| `src/lib/seo/schema.ts` | Utility | JSON-LD schema generator |
| `src/lib/utils/date.ts` | Utility | Date formatting |
| `src/lib/utils/html.ts` | Utility | HTML sanitization/parsing |
| `src/hooks/useScrollLock.ts` | Hook | scroll lock hook |
| `src/hooks/index.ts` | Hook | Hook entry point |

## 5. Types & Styles
| File | Phân loại | Ghi chú |
| :--- | :--- | :--- |
| `src/types/wordpress.ts` | Type definition | Core WP types |
| `src/types/homepage.ts` | Type definition | Homepage data types |
| `src/types/seo.ts` | Type definition | SEO types |
| `src/types/search.ts` | Type definition | Search types |
| `src/types/ngon-ngu.ts` | Type definition | Language types |
| `src/styles/variables.css` | Configuration | CSS Custom Properties |