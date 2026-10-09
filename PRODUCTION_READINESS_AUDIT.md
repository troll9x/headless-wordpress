# Final Production Readiness Audit — Trường Đại học Thủy lợi

## Cập nhật candidate 09/10/2026 sau remediation

**Quyết định hiện tại: NO-GO production.** Báo cáo phía dưới là ảnh chụp audit ban đầu trước khi sửa. Phần cập nhật này là trạng thái mới; các mục cũ ghi FAIL/NOT TESTED vì thiếu source/test đã được thay thế bằng bằng chứng sau đây. Xem `PRODUCTION_FIX_REPORT.md` để có danh sách file/commit/benchmark đầy đủ và `RELEASE_CHECKLIST.md` để biết gate còn lại.

| Hạng mục | Trạng thái mới | Bằng chứng |
|---|---|---|
| Frontend candidate | **PASS cho việc tạo branch; BLOCKED để hợp nhất** | `release/tlu-production-rc-2026-10-09` từ `c353a360`, source commit `f0d8470cbba291cd87e4ee62636e8257416af00f`; main-only `c84b4cb` và `e4fad1d` đã phân loại trong fix report; không auto merge do cùng sửa nhiều file. |
| Backend source/artifact | **PASS source; BLOCKED runtime** | `Headless-API` branch `release/tlu-headless-api-rc-2026-10-09`, commit `57e718a`; v2.0.9/schema4.9; deterministic ZIP SHA-256 `67c2acff25544da9163e39d9ebac1f77c92ec99e4e691c20c779f0e57e892a75`; 96 file mirror/artifact khớp. CMS vẫn 2.0.8. |
| Gallery và public options | **PASS unit; NOT TESTED integration** | Backend `tests/gallery-selection.php` (15 ảnh được chọn, loại ảnh private/thiếu URL) và `tests/options-public-fields.php` (deny field/page lạ, lọc transient cũ) đều đạt. Chưa nạp plugin mới vào CMS. |
| Home SEO | **PASS fallback frontend; BLOCKED source route** | `src/lib/seo/home-override.ts` và 2 test fallback đạt. CMS route `home-seo` có trong REST index nhưng WPCode admin yêu cầu đăng nhập; không biết source nên chưa đăng ký bản thay thế. |
| Frontend lint/typecheck/build | **PASS** | `npm run lint`, `npm run typecheck`, `npm run build` đều exit 0 trên candidate source. Build với `.env.local` ở máy audit; chưa chạy CI checkout sạch trên candidate commit. |
| Browser E2E local | **PASS có giới hạn** | Playwright: 11 passed, 1 staging-only check skipped trên local production build. Node gọi CMS có lỗi `UNABLE_TO_VERIFY_LEAF_SIGNATURE` xen kẽ, vì vậy chưa chứng minh nội dung CMS đầy đủ. |
| Browser E2E staging cũ | **FAIL** | 11 passed, 1 failed: `/en` trả HTML ban đầu `<html lang="vi">`; candidate sửa tại `university-next/src/app/layout.tsx`. Cần deploy candidate lên staging và rerun. |
| Cache, performance 1–2 giây | **FAIL / NOT TESTED candidate staging** | Baseline trước audit article 9.546s, search 3.403s; phép đo warm trên old staging nhanh hơn do cache. Local cold homepage 5.894–6.657s, search 2.634s; direct CMS post API 1.96–4.93s. Article secondary calls đã stream nhưng chưa đo cold p50/p95/LCP trên staging candidate. Staging có extra `no-cache` chưa truy nguồn. |
| Public production parity | **FAIL** | `tlu.edu.vn` HTML/WordPress sitemap fingerprints không khớp Next candidate; release header mới chỉ được thử ở local. Chưa có Nginx/Cloudflare config để xác nhận origin. |
| Infra, backup, restore, full HMAC/fault/concurrency | **BLOCKED / NOT TESTED** | Không có read-only server/admin evidence; historical `innodb_force_recovery=6` chưa được xác minh trạng thái hiện tại. Valid revalidation, CMS timeout/500 injection, restore rehearsal và capacity chưa chạy. |

Source fixes materially reduce risk, but **không** giải quyết được release gates phụ thuộc CMS/infra và nghiệm thu staging. Không có production deployment, DB write, migration, route change, merge hay tag nào được thực hiện.

---

**Ngày audit:** 09-10-2026 (Asia/Saigon)
**Phạm vi:** mã nguồn frontend `troll9x/headless-wordpress`, backend `troll9x/Headless-API`, và các URL công khai/staging nêu trong báo cáo.
**Kết quả:** **NO-GO** cho một đợt production release mới.
**Giới hạn an toàn:** audit chỉ đọc. Không deploy, merge, reset, sửa production, ghi database hay chạy migration. Không có quyền đọc aaPanel, cấu hình Nginx/Cloudflare, MariaDB, PHP-FPM, backup hoặc log máy chủ; các mục đó được ghi BLOCKED, không suy đoán là đạt.

## 1. Git branch và commit được kiểm tra

| Repository | Branch/commit đã kiểm tra | Trạng thái và ý nghĩa |
|---|---|---|
| Frontend `troll9x/headless-wordpress` | `local-full-work`, `c353a360db28238e60a60b0c9a8af9aa349fa674` | Worktree có `M university-next/next.config.ts` nhưng `git diff` rỗng và hash file trùng blob HEAD; có file chưa theo dõi `.tmp-capture-har.mjs`. Cả hai trạng thái đã có trước audit và không bị sửa trong audit. |
| Frontend `main` | `e4fad1d` | Nhánh ứng viên không đồng nhất: `local-full-work` có 28 commit riêng và thiếu 2 commit chỉ có trên `main` tính từ merge-base `69e5966606c4678d5e1a389a47cedc4d5b25f36d`. Trong đó có `c84b4cb` (“deploy updated university Next.js app”). Chưa xác định được commit nào là release candidate được phê duyệt. |
| Backend `troll9x/Headless-API` | `main`, `c7c91e25da39fb67611592440968845203a84d22` | Đã clone shallow vào thư mục tạm chỉ để đọc. Source plugin là v1.8.0/schema 4.1, thấp hơn runtime CMS. |

Frontend cũng chứa source plugin đóng gói trong `release/headless-api/` phiên bản 2.0.8/schema 4.9 (`headless-api.php:6,36,39`); endpoint schema công khai của CMS báo cùng phiên bản. Git repository backend độc lập `https://github.com/troll9x/Headless-API` tại commit `c7c91e2` khai báo v1.8.0/schema 4.1 trong `headless-api.php:5,17,20`. Điều này cho thấy source/runtime có một bản khớp trong repository frontend, nhưng repository backend độc lập đã lỗi thời và chưa có quy ước rõ bản nào là nguồn chuẩn.

## 2. Tóm tắt điều hành

Các bước lint, typecheck, production build, một số test PHP/Node, kiểm tra cú pháp PHP và API smoke test đọc dữ liệu đều đạt trong phạm vi đã chạy. Không thấy dấu hiệu secret được nhúng vào 24 file JS tĩnh được quét; file `.env.local` đang được ignore. Đây là các kết quả có giới hạn, không đồng nghĩa toàn bộ website hoặc hạ tầng production đã được chứng nhận.

Chưa thể phát hành an toàn vì commit frontend chưa được chốt, backend Git repo không phản ánh plugin đang chạy, API `home-seo` mà frontend gọi không có trong hai bộ source được audit, production đang phục vụ sitemap/robots theo hợp đồng khác với Next.js hiện tại, và chưa có E2E/capacity/restore test. Đặc biệt, một bài viết trên staging đo được 9.55 giây; do đó mục tiêu tải trang 1–2 giây chưa được chứng minh.

## 3. Bảng trạng thái

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| Chốt frontend release commit | **FAIL** | `local-full-work` phân kỳ với `main` (28 commit riêng, thiếu 2 commit `main`); chưa có release tag/commit được xác nhận. |
| Backend source of truth | **FAIL** | Backend repo `main` là v1.8.0/schema 4.1; CMS và source nhúng frontend là v2.0.8/schema 4.9. |
| Frontend lint | **PASS** | `npm run lint` exit 0. |
| Frontend TypeScript | **PASS** | `npm run typecheck` exit 0. |
| Frontend production build | **PASS** | `npm run build` exit 0 với `.env.local`; build lặp lại với placeholder `.invalid` theo CI cũng đạt. Build cuối audit đã chạy lại với `.env.local`. |
| PHP syntax | **PASS** | 79 file PHP ở backend repo, 93 file source plugin 2.0.8, và 93 file trong ZIP 2.0.9 đều qua `php -l`. |
| Automated tests hiện có | **PASS có giới hạn** | 2/2 Node security test; các script PHP hook/cache/priority/search/rate-limit đều đạt. Không có bộ test bao phủ toàn bộ API hoặc UI. |
| API smoke test public CMS | **PASS có giới hạn** | Health/schema, options VI/EN và gallery đều trả 200; gallery trả 15 selected images. Chưa tải xác nhận từng URL ảnh hoặc kiểm tra đúng nội dung biên tập. |
| API permission/auth review | **PASS có giới hạn** | Routes public có `permission_callback`; routes cache/revalidation có `manage_options`; preview dùng quyền người dùng. Static review không thay thế fuzz/integration test. |
| API bài viết/trang/chuyên mục/menu | **NOT TESTED runtime** | Có source routes/services như `release/headless-api/includes/endpoints/class-page.php`, `class-archive.php`, `class-term.php`, `class-menus.php`; chưa chạy smoke cho từng endpoint, phân trang, permission và dữ liệu VI/EN. |
| API media/gallery | **PASS có giới hạn** | Gallery home VI trả 15 mục; chưa xác minh GET/200 từng ảnh, ảnh EN, kích thước/format, hoặc mọi attachment URL. |
| ACF Hero/Logo/Footer/Social/Favicon | **PASS có giới hạn** | Các options key cho vi/en trả 200 và có field tương ứng; chưa xác minh nội dung biên tập, URL asset, field-level exposure, hay tính đúng của ngôn ngữ. |
| Polylang và luồng đổi ngôn ngữ | **NOT TESTED end-to-end** | HTML production có hreflang quan sát được và options có field VI/EN; chưa chạy luồng đổi ngôn ngữ trên các bài/danh mục có/không có bản dịch. |
| Home SEO endpoint source traceability | **FAIL** | Frontend gọi `/headless/v1/home-seo`, CMS REST index có route, nhưng route không có trong source plugin 2.0.8 nhúng frontend hoặc backend repo 1.8.0. Cần kiểm tra WPCode/plugin khác trên CMS. |
| Tốc độ staging | **FAIL** | Bài viết EN staging: 9.546s; `/api/search`: 3.403s. Hai kết quả là request đơn, không phải benchmark có kiểm soát. |
| Production frontend cutover parity | **FAIL** | Public `robots.txt` trỏ `sitemap_index.xml`; Next source trỏ `/sitemap.xml`. Production sitemap phản hồi WordPress `main-sitemap.xsl`; Next sitemap là route động riêng. Chưa chứng minh production đang chạy đúng candidate Next. |
| Search cache headers | **FAIL** | Staging `/api/search` trả cache header public 60s và đồng thời header `no-cache`; cần xác định header nào do proxy/edge chèn và quy tắc thực tế. |
| Dependency audit | **FAIL (P2)** | `npm audit` đầy đủ báo 5 HIGH trong toolchain lint/development; `npm audit --omit=dev` báo 0. Không chạy `npm audit fix --force` vì gợi ý downgrade major. |
| XSS/static security review | **PASS có giới hạn** | Sink `dangerouslySetInnerHTML` được nối với sanitizer trong các điểm đã rà; chưa có fuzz, DAST hay review mọi payload CMS. |
| E2E, đa ngôn ngữ, responsive, accessibility | **NOT TESTED** | Không có E2E framework/test suite; chưa thực hiện browser-wide visual/accessibility test. |
| URL WordPress cũ, redirect, canonical và toàn sitemap | **NOT TESTED đầy đủ** | Chỉ kiểm tra một số response production/dev và sitemap root; chưa có danh sách URL legacy để so khớp redirect/canonical/hreflang toàn site. |
| MariaDB, Nginx, Cloudflare, PHP-FPM, OS resources | **BLOCKED** | Không có quyền/config/log runtime để xác minh. |
| Backup restore và rollback thực tế | **BLOCKED** | Chưa có artifact backup/biên bản restore hoặc bản triển khai trước để thử rollback. |
| Production tải đồng thời/capacity | **NOT TESTED** | Không chạy load test trên production. Staging chỉ chạy smoke tải thấp 6 request. |

## 4. Critical blockers — P0

### P0-1 — Chưa xác định release candidate frontend

**Bằng chứng:** branch đang checkout là `local-full-work` tại `c353a360`. So với `main` tại `e4fad1d`, merge-base là `69e5966`, thống kê `main...local-full-work` là `2 28`; tức hai commit chỉ có ở main và 28 commit chỉ có ở branch hiện tại. Một commit main-only là `c84b4cb feat(frontend): deploy updated university Next.js app`.

**Ảnh hưởng:** audit trên một nhánh chưa được chốt không chứng minh artifact cần phát hành tương ứng với mã đã duyệt. Chọn hoặc hợp nhất candidate cần quyết định của người sở hữu release; chưa thực hiện thay đổi nhánh.

### P0-2 — Backend repository chính thức không khớp plugin CMS đang chạy

**Bằng chứng:** backend repo `main` commit `c7c91e2` khai báo v1.8.0/schema 4.1; `release/headless-api/headless-api.php` trong frontend commit đang audit khai báo v2.0.8/schema 4.9; `https://cms.tlu.edu.vn/wp-json/tlu/v1/schema` trả v2.0.8/schema 4.9.

Có thêm ZIP `release/headless-api-2.0.9-gallery-selection-fix.zip`, nhưng chưa có source folder tương ứng, changelog vẫn dừng ở 2.0.8, và CI không chạy regression test riêng cho ZIP 2.0.9. Các PHP file trong ZIP lint đạt nhưng điều đó không xác minh hành vi gallery.

**Ảnh hưởng:** không xác định được source/tag chính thức để tái tạo chính xác plugin sẽ phát hành. Cần đồng bộ source, version, changelog và tests trước khi release.

### P0-3 — Không audit được nguồn của API SEO trang chủ

**Bằng chứng:** frontend gọi `/headless/v1/home-seo` tại `university-next/src/lib/wordpress/seo.ts:67`; route xuất hiện trong REST index CMS, nhưng không tìm thấy registration trong plugin source v2.0.8 nhúng frontend hoặc repo backend v1.8.0. Đây có thể là WPCode hoặc plugin khác; nội dung đó không được cung cấp để kiểm tra.

**Ảnh hưởng:** không thể xác minh permission, sanitization, validation, quyền chỉnh sửa, xử lý lỗi hoặc nguồn dữ liệu của endpoint SEO được frontend phụ thuộc. Cần đưa implementation vào source có version hoặc cung cấp source snippet để rà.

### P0-4 — Chưa chứng minh production đang phục vụ frontend candidate

**Bằng chứng runtime:** ngày audit, `https://tlu.edu.vn/robots.txt` trỏ sitemap tới `https://tlu.edu.vn/sitemap_index.xml`; Next source ở `university-next/src/app/robots.ts:24` trỏ `/sitemap.xml`, còn `university-next/src/app/sitemap.ts` triển khai sitemap động. Public `/sitemap.xml` trả XML có stylesheet `main-sitemap.xsl` kiểu WordPress. Production `/` trả 200 và một lần quan sát có `X-Cache: HIT From tlu.edu.vn`, nhưng một request HIT không chứng minh nguồn/cold response/cutover.

**Ảnh hưởng:** bằng chứng hiện tại phù hợp với khả năng production vẫn đi qua WordPress hoặc lớp tương thích cũ; đây là suy luận từ headers/robots/sitemap, không phải xác nhận cấu hình proxy. Chưa thể nghiệm thu đúng bản Next được audit.

## 5. Ưu tiên cao — P1

1. **Hiệu năng chưa đạt yêu cầu.** `https://dev.nguyenhongson.vn/en/lecturers-from-thuyloi-university-granted-patent-for-new-measurement-method-49957` trả 200 trong 9.546s, cache `no-store`; `/api/search?q=water&lang=en&limit=1` trả 200 trong 3.403s. Đây là phép đo đơn lẻ, cần benchmark lặp lại sau khi xác nhận đúng candidate và phân tách TTFB, API, render, cache. Không có cơ sở tuyên bố đạt mục tiêu 1–2 giây.
2. **Options API có rủi ro lộ field trong tương lai.** `release/headless-api/includes/endpoints/class-options.php` allowlist key nhóm option; `OptionsService` lấy toàn bộ ACF field objects và normalize. `AcfIntegration::is_field_public()` tồn tại nhưng không được gọi trong luồng này. Audit không quan sát thấy secret bị lộ trong response đã kiểm tra, nên đây là hardening risk chứ không phải lỗ hổng lộ dữ liệu đã xác nhận. Nên allowlist theo từng field và thêm test deny-by-default.
3. **Cache invalidation chưa xác minh runtime end-to-end.** Có implementation HMAC/revalidation trong frontend và route quản trị trong plugin, nhưng POST sẽ gây side effect invalidating cache nên không gọi trong audit. Chưa xác minh secret, webhook CMS, đồng hồ/timestamp, retry và cache tag mapping ở môi trường đang chạy.
4. **Giới hạn request TTS phụ thuộc process memory/IP proxy.** `university-next/src/lib/security/rate-limit.ts` lưu counter trong bộ nhớ tiến trình; IP tin cậy tùy header/config. Chưa kiểm tra số replica, reverse proxy có ghi đè header, hoặc có shared rate-limit tại edge. TTS dùng nhà cung cấp trả phí; cấu hình runtime và giới hạn ngân sách chưa được xác minh.
5. **Staging search response có Cache-Control mâu thuẫn.** Source `src/app/api/search/route.ts:44` đặt `public, s-maxage=60, stale-while-revalidate=300`; response runtime có thêm `no-cache`. Không thể kết luận cache có hiệu lực như mong muốn cho đến khi xác định response cuối ở Next, Nginx hoặc Cloudflare.

## 6. Ưu tiên trung bình/thấp — P2/P3

### P2

- Full `npm audit` có 5 advisory HIGH trong dependency phát triển/lint (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`); audit production-only có 0. Cần xử lý bằng nâng cấp tương thích và giữ lockfile; không dùng phương án `--force` đang đề xuất downgrade major.
- CI `.github/workflows/ci.yml` build và kiểm tra ZIP v2.0.8; không kiểm tra source/artifact ZIP v2.0.9 mới. Cần artifact parity check và test chức năng gallery cho đúng file sẽ phát hành.
- Hầu hết route Next được build dưới dạng dynamic server-rendered (`ƒ`); homepage gọi 18 nguồn dữ liệu song song tại `university-next/src/services/homepage.ts:156` và ép dynamic bằng `connection()` tại dòng 214. Đây là đường dẫn có nhiều phụ thuộc runtime và cần đo tải/lỗi; dynamic rendering tự nó không phải bug.
- HTML layout đặt `<html lang="vi">` cố định tại `university-next/src/app/layout.tsx:88`; client script ở dòng 92 mới thay locale. Cần xác minh HTML server-rendered cho `/en` và sửa để ngôn ngữ đúng từ response ban đầu nếu chưa được middleware/layout xử lý.
- Các request homepage và layout dùng `Promise.all` (`homepage.ts:156`, `layout.tsx:81`); nếu một dependency bị chậm/lỗi, thời gian hoặc nội dung fallback cần được kiểm thử có chủ đích.
- Không có Playwright/Cypress/Jest/Vitest hoặc script `test` cho toàn ứng dụng. Các test hiện tại là một số regression script hẹp.

### P3

- Health endpoint trả version và host/site URL (`release/headless-api/includes/endpoints/class-health.php`), hữu ích vận hành nhưng làm lộ fingerprint phiên bản; cân nhắc response public tối thiểu và endpoint chi tiết có xác thực.
- Node test chạy qua TypeScript strip/reparse có cảnh báo `MODULE_TYPELESS_PACKAGE_JSON`; không làm test thất bại nhưng nên khai báo module type/test runner thống nhất.
- Một phép đo request đơn và 6 request staging không đủ xác định cold-start, p95 ổn định, tải đồng thời cực đại hoặc giới hạn hạ tầng.

## 7. Bằng chứng kiểm tra chi tiết

### 7.1 Frontend, CI và rendering

- `university-next/package.json`: scripts có build/lint/typecheck nhưng không có test suite tổng thể; Next 16.3.8, Node engine `>=20.9`.
- `.github/workflows/ci.yml`: CI chạy lint, typecheck, Node security tests, PHP scripts/lint, production dependency audit và build bằng URL placeholder `.invalid`. CI dùng Node 24.
- `npm run lint`: exit 0; `npm run typecheck`: exit 0; `npm run build`: exit 0. Build Next báo phần lớn trang là dynamic `ƒ`; `/robots.txt` và `/_not-found` là static.
- Node security tests: 2/2 pass. PHP scripts `test-headless-api-hooks.php`, `test-headless-response-cache.php`, `test-priority-posts-endpoint.php`, `test-p1-search-proxy.php`, `test-p1-rate-limit-cleanup.php` đều pass.
- `university-next/src/app/[...path]/page.tsx:183,225`: dữ liệu bài/category phụ trợ được chờ cùng request song song trên đường render. `university-next/src/services/homepage.ts:156,214`: homepage chạy nhiều dependency và dynamic render.
- `university-next/src/lib/seo/metadata.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`: có code canonical/hreflang, robots và sitemap. Chưa chạy crawler/E2E trên tất cả route và locale.
- `src/app/not-found.tsx`, `src/app/global-error.tsx` tồn tại; URL ngẫu nhiên trên staging trả 404. Chưa chủ động tạo lỗi 500 để xác minh màn hình fallback.
- `src/lib/security/html.ts` được dùng ở các sink nội dung CMS đã tìm thấy. Static review không thay thế payload fuzzing.
- `.env.local` được ignore tại `.gitignore:34`; đã quét 24 file trong `.next/static`, không thấy các secret value được kiểm tra. Không đưa giá trị secret vào báo cáo.

### 7.2 WordPress API/plugin

- `release/headless-api/includes/class-rest-service-provider.php:58–62` đăng ký service/route; public routes dùng callback công khai có chủ đích, các route thao tác cache/revalidation yêu cầu `manage_options`. `class-page.php`, `class-search.php`, `class-options.php` có kiểm tra/sanitize/bounds ở mức mã nguồn.
- `class-options.php:50,106–123` mở GET public nhưng giới hạn option key; `Services/OptionsService.php:57–63` normalize field objects. `Integrations/AcfIntegration.php:82` có helper field-public nhưng luồng options không gọi helper đó.
- `Services/HttpCachePolicy.php:81–89` định nghĩa profile cache public/no-store; `Integrations/RestHttpIntegration.php:164` thêm schema response header. `class-revalidation.php` yêu cầu capability quản trị; frontend `/api/revalidate` kiểm tra chữ ký HMAC và giới hạn payload/path/tag.
- `php -l`: 79/79 PHP files trong repo backend v1.8.0; 93/93 file source v2.0.8; 93/93 PHP file giải nén từ ZIP v2.0.9, tất cả không lỗi cú pháp.
- Runtime CMS: `/wp-json/tlu/v1/health` và `/wp-json/tlu/v1/schema` trả 200; schema endpoint báo plugin 2.0.8/schema 4.9. Options hero/logo/footer/social/favicon cho `vi` và `en` trả 200. Gallery home VI trả 200 với 15 ảnh được chọn. Không gọi API ghi dữ liệu.
- API `global_settings` trả 403 theo allowlist hiện có; phù hợp với việc không công khai key đó, không tính là lỗi.
- Có một lần gọi thử load-test ban đầu mã hóa sai dấu `&` thành `%26` nên nhận 400; đã sửa URL và chạy lại thành công. Đây là lỗi cú pháp lệnh thử, không phải lỗi sản phẩm.
- Corrected bounded read-only smoke: options hero VI, 6 request tổng / concurrency 3, 6×200, 0 lỗi, 5 cache HIT và 1 MISS, p50 1506ms, p95/max 1643ms, khoảng 2 request/giây. Đây chỉ là smoke rất nhỏ trên endpoint đọc; không phải capacity benchmark.

### 7.3 Public/staging HTTP observations

Các số dưới đây là request quan sát đơn lẻ ngày audit, phụ thuộc mạng, cache và thời điểm; không phải SLA.

| URL/kiểm tra | Kết quả quan sát |
|---|---|
| `https://tlu.edu.vn/` | 200, tổng ~0.277s, `Server: nginx`, HSTS, `X-Cache: HIT From tlu.edu.vn`; không có Cloudflare ray/status trong response quan sát. Một cache HIT không phải cold benchmark. |
| `https://dev.nguyenhongson.vn/` | 200, ~0.349s; Next CSP/HSTS; cache-control có `private, no-cache, no-store...` và `no-cache` trùng. |
| Dev `/en` | 308 sang `/en`, sau đó 200; tổng ~0.493s gồm redirect. |
| Dev bài viết EN `.../new-measurement-method-49957` | 200, ~9.546s, no-store. |
| Dev `/api/search?q=water&lang=en&limit=1` | 200, ~3.403s; public cache header và `no-cache` cùng hiện diện. |
| CMS REST root/health/schema | 200; lần đo ~2.18s root và ~1.99s health. Schema JSON ~19,241 bytes; schema API có cache HIT ở lần kiểm tra tiếp theo. |
| CMS options VI/EN | Các key hero, logo, footer, social, favicon đều 200; một số response mất khoảng 1.4–6.0s, nhiều response là cache MISS. Đã xác nhận tên field/count, không xác nhận nội dung/URL ảnh. |
| CMS media gallery home VI | 200, ~1.569s, 15 `selected_images`; chưa GET từng media URL. |
| CMS `/wp-json/headless/v1/schema` | 404 do sai namespace; endpoint đúng là `/wp-json/tlu/v1/schema`. Không tính là defect. |
| `tlu.edu.vn/robots.txt` và sitemap | robots 200 trỏ `sitemap_index.xml`; `/sitemap.xml` 200 trả WordPress sitemap stylesheet. Source Next lại trỏ `/sitemap.xml` và tạo sitemap động. |
| Production metadata VI/EN | Parser quan sát thấy description, `twitter:description`, canonical/hreflang; root lang `vi`, English `en-GB`. Chưa kiểm tra mọi URL hoặc xác nhận nguồn phản hồi là candidate Next. |

### 7.4 Kiểm thử chưa thực hiện

- Không đăng nhập CMS để xem cấu hình ACF/Polylang/WPCode/plugin, credentials, role/capability hoặc nội dung trang quản trị.
- Không POST endpoint revalidation, không tạo preview token, không chỉnh sửa CMS.
- Không kiểm tra PHP-FPM pool, Nginx vhost/reverse proxy, Cloudflare page/cache rules, TLS chain, database recovery/read-write, RAM/CPU/disk I/O, logs, backup restore.
- Không chạy tải đồng thời trên production; 6 request staging là giới hạn smoke an toàn, không phải tải kiểm thử.
- Không kiểm tra từng ảnh, breakpoint responsive, keyboard/screen reader, toàn bộ luồng VI↔EN, mọi redirect WordPress cũ hoặc UI toàn site bằng browser E2E.

## 8. Công việc bắt buộc trước production

1. **Chốt release candidate:** chủ sở hữu chọn branch và commit; reconcile main-only/branch-only commits, sau đó tạo tag/artifact bất biến và ghi checksum. Không release từ một working tree có trạng thái mơ hồ.
2. **Đồng bộ backend source of truth:** cập nhật/tag repo `Headless-API` để source/version/schema khớp artifact được triển khai; đưa source v2.0.9 (nếu đó là ứng viên) vào Git, cập nhật changelog và kiểm tra artifact từ source. Không chỉ dựa vào ZIP thủ công.
3. **Truy nguyên `/headless/v1/home-seo`:** lấy source WPCode/plugin đang đăng ký route, review quyền truy cập, sanitize, validate, escape và version-control; xác minh frontend có fallback an toàn nếu route lỗi.
4. **Kiểm thử ACF/Polylang:** test nội dung VI/EN của hero, logo, footer, social, favicon, taxonomy Education, bài viết và media; xác nhận trường public được phép xuất hiện trong API theo allowlist từng field.
5. **Tạo E2E trên staging:** Playwright hoặc tương đương cho homepage VI/EN, điều hướng, category, article, gallery/media, search, chuyển ngôn ngữ, SEO metadata, sitemap/robots, URL cũ/redirect, 404, backend timeout/500 và cache revalidation. Lưu kết quả cùng candidate SHA.
6. **Đo hiệu năng đúng mục tiêu:** ít nhất cold/warm lặp lại cho homepage, article, search và CMS API; báo TTFB, LCP, p50/p95, cache hit/miss. Mục tiêu đã nêu là 1–2s: đặt ngưỡng p95 và tải kiểm thử cụ thể; không chấp nhận kết quả 9.55s như hiện trạng. Tải đồng thời chỉ trên staging có giám sát.
7. **Giải quyết header cache:** xác định nguồn header trùng/mâu thuẫn trên Next/Nginx/Cloudflare; test cache MISS/HIT và invalidation sau sửa nội dung.
8. **Xử lý 5 advisory HIGH dev dependencies:** nâng cấp có kiểm tra tương thích, chạy lint/build/test; giữ production audit 0 và không downgrade framework bằng `--force`.
9. **Kiểm tra bảo mật:** field-level options allowlist, role/capability, token, CORS/origin, trusted proxy headers, TTS rate limit dùng cơ chế phù hợp multi-instance, HTML sanitizer với payload kiểm thử; xác nhận không có secret trong Git/artifact.
10. **Hạ tầng/backup gate:** người vận hành server cung cấp xác nhận read/write MariaDB, không ở recovery mode, PHP-FPM health/capacity, Nginx/TLS, Cloudflare rules, CPU/RAM/disk, logs/alerts, backup mới và biên bản restore thử. Các kiểm tra này hiện BLOCKED.
11. **Xác nhận cutover:** đối chiếu host routing, canonical, `robots.txt`, sitemap, redirects và headers thực tế với candidate trên môi trường staging; xác minh Cloudflare purge/revalidation và health checks.

## 9. Quy trình triển khai an toàn (đề xuất, chưa thực hiện)

1. Đóng băng commit frontend/backend đã duyệt; build bằng CI với Node version chuẩn và env production được cấp qua secret store, không commit `.env`.
2. Tạo backup database/files và ghi nhận checksum/restore point; xác nhận restore gần nhất thành công. Không chạy schema/database migration nếu chưa có kế hoạch tương thích và phê duyệt riêng.
3. Đưa artifact bất biến lên staging, cấu hình domain test; chạy PHP lint, unit/integration/E2E, API smoke VI/EN, URL/media, SEO và cache invalidation.
4. Đo tải staging và đối chiếu ngưỡng SLO đã thống nhất; xem error rate, TTFB/p95, PHP-FPM/MariaDB/CPU/RAM, cache HIT/MISS.
5. Production cutover theo thay đổi route/reverse proxy đã review, có người trực, health check, log và thời gian theo dõi; chỉ promote artifact cùng checksum đã nghiệm thu trên staging.
6. Sau cutover kiểm tra GET homepage VI/EN, bài viết, search, media, metadata, sitemap/robots, redirects và lỗi 5xx; không coi HTTP 200 trang chủ đơn lẻ là nghiệm thu.

Không có lệnh hoặc thay đổi production nào được thực hiện trong audit này.

## 10. Rollback plan và điều kiện kích hoạt

**Rollback plan cần chuẩn bị trước release:** giữ artifact frontend hiện tại và artifact trước đó có checksum; lưu bản cấu hình routing/Nginx/Cloudflare đã xác nhận để revert; giữ plugin CMS hiện hành và source tương ứng. Phục hồi tuyến frontend về bản trước bằng quy trình vận hành đã diễn tập. Không downgrade plugin/DB theo phỏng đoán: chỉ rollback plugin nếu tương thích ngược đã được kiểm chứng. Nếu có migration, cần kế hoạch riêng; audit này không thực hiện và không phê duyệt migration.

**Kích hoạt rollback ngay** nếu xảy ra một trong các điều kiện sau trong cửa sổ theo dõi:

- Homepage, bài viết, API nội dung hoặc locale chính trả lỗi 5xx liên tục hoặc tỷ lệ lỗi vượt ngưỡng vận hành đã thống nhất.
- Nội dung/ảnh/ACF bị thiếu đáng kể, chuyển ngôn ngữ sai, canonical/hreflang hoặc sitemap/robots sai gây ảnh hưởng crawl.
- Search/navigation hoặc cache revalidation không hoạt động sau cập nhật nội dung.
- p95 vượt SLO đã duyệt; với mục tiêu hiện tại, không promote nếu chưa chứng minh đạt khoảng 1–2 giây theo phép đo thống nhất.
- CPU/RAM/disk, PHP-FPM queue hoặc MariaDB có dấu hiệu bão hòa, lỗi ghi/đọc hoặc tăng trưởng error log bất thường.

Ngưỡng số cụ thể cho 5xx, p95 và thời gian liên tục cần được SRE/owner điền trước release; hiện chưa có SLO/alert runtime để kiểm chứng.

## 11. Kết luận

# **NO-GO**

Không phát hành production từ trạng thái hiện tại. Các bước kiểm tra code và build đã đạt không bù được những blocker về release commit, backend source-of-truth, route SEO ngoài source, production/candidate parity, hiệu năng và hạ tầng/backup chưa xác minh. Sau khi hoàn thành các P0/P1, chạy E2E và kiểm tra hạ tầng/restore trên đúng candidate, cần thực hiện lại audit trên đúng commit release.
