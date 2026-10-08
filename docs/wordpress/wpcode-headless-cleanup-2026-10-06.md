# WPCode cleanup for the headless CMS (2026-10-06)

Scope: `cms.tlu.edu.vn` only. Frontend-only snippets were deactivated in WPCode, not deleted; snippets 995 and 678 were edited after a private export backup. This does not change `tlu.edu.vn`.

## Kept active

| ID | Snippet | Reason |
| --- | --- | --- |
| 50180 | Quản lý User và giới hạn nhóm người dùng | CMS authoring roles and permissions. |
| 50120 | WP Fulltext Search | Backend for the headless search API. |
| 995 | Template Tổ Chức | Also saves organization leader and display priority metadata used by the headless API. |
| 678 | Logo Đối Tác | Registers the ACF options page holding partner logos used by the headless API. |
| 669 | Ưu tiên bài viết HOT / NEW | Saves HOT/NEW metadata used by the headless API. |

Follow-up on 2026-10-06: snippets 995 and 678 were trimmed in WPCode while left active. Of the three mixed snippets, only 669 still contains legacy frontend rendering. Do not deactivate it without first extracting its CMS data-editing logic.

- 995 `Template Tổ Chức`: removed the `[hien_thi_to_chuc]` shortcode and its WordPress frontend card/modal HTML (7,585 to 2,190 characters). Kept the taxonomy leader selector (`_leader_member_id`) and member display-order metabox (`uu_tien_to_chuc`). The organization API for `dang-uy` still returns HTTP 200, total 3, including one leader and two members.
- 678 `Logo Đối Tác`: removed the `[repeater_partner_logos]` shortcode, Owl Carousel asset enqueue, and frontend HTML/CSS/JS (2,930 to 440 characters). Kept the ACF options page `logo-doi-tac`. The partner-logo API still returns HTTP 200 with 69 items.
- Before editing, exported all 16 PHP snippets using WPCode Tools > Export. The backup is a local JSON download outside the repository; keep it private because it includes the other PHP snippets too.

In the WP Fulltext Search settings, `Bật Live Search (Flatsome)` was disabled. The search REST routes remain active.

## Deactivated in this cleanup

- Frontend-only templates: 276 `Templace Blog bài viết hot`, 278 `Text List Layout with Thumbnails`, 497 `Khoa & Ngành Slider`, 652 `Blog Layout 3 + 1/3`, 696 `Template Sự Kiện`.
- Frontend-only behavior/styles: 451 `Cot 2 Auto Play`, 32349 `Xử lý từ viết tắt khi đọc`, 32384 `Button Ngôn Ngữ`, 32385 `Css Lang toggle`, 32393 `JS Button chuyển ngôn ngữ`.
- Legacy WordPress utilities not used by the headless frontend: 369 `Widget Danh Mục`, 514 `Dashboard Thống Kê Bài Viết`, 50088 `Tắt live search của Flatsome`.

53844 `QSM+SSO+Export Excel` and 226 `Sơn CSS` were already inactive and were not changed.

Some published CMS pages still contain retired shortcodes. Their old WordPress-rendered layout may display raw shortcode text or omit sections. This cleanup preserves the headless APIs, not the legacy CMS frontend.

## Verification

- `GET /wp-json/headless/v1/priority-posts?lang=vi`: 1 item.
- `GET /wp-json/headless/v1/partner-logos?lang=vi`: 69 items.
- `GET /wp-json/headless/v1/search?q=sinh&per=3&page=1`: 3 items.
- `GET /wp-json/headless/v1/organizations/dang-uy?lang=vi`: 2 members.
- Next.js `npm run typecheck` and ESLint on `src/lib/wordpress/post-priority.ts`: passed.
- Local Next.js homepage: HTTP 200 and contains the title of the HOT item returned by the priority API.

Next.js no longer fetches and parses the legacy WordPress homepage for HOT/NEW fallback. If the priority API is unavailable, the regular news feed remains visible. The priority API timeout was raised from 3 to 12 seconds because the homepage issues many CMS requests concurrently. After this adjustment, the local Next.js homepage renders `hot.gif` beside the priority post returned by the API.
