# Block Registry — Phase 6

## Scope

Frontend hiện tại không gọi endpoint `headless/v1/page-blocks` và không có page/block renderer runtime. Bảng này là registry audit, không phải registry thực thi.

Không block nào được đánh dấu `IMPLEMENTED` nếu không có mapping runtime được xác minh.

| Backend type | Frontend component | Fields used | Validation | Fallback | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| WordPress Core REST page (`wp/v2/pages`) | `TrangChu` / homepage section components | `title.rendered`, `excerpt.rendered`, `content.rendered`, `_embedded`, `acf` | TypeScript structural types; no runtime schema | Component-specific empty/null handling | PARTIALLY_IMPLEMENTED |
| Homepage hero ACF-derived view model | `HeroBanner` | Normalized `HeroData` from `services/homepage.ts` | Nullable values handled by adapter | Section fallback values / no media | PARTIALLY_IMPLEMENTED |
| Generic ACF flexible-content layout | None | Backend normalizer can identify nested entries with `layout` | No frontend validation | No renderer | NOT_IMPLEMENTED |
| `headless/v1/page-blocks` response | None | Backend response can include normalized page data plus `blocks` | No frontend type or adapter | Not fetched | NOT_IMPLEMENTED |
| Gutenberg/core block | None | Backend page-blocks source requires runtime contract verification before frontend use | No frontend validation | Not fetched | NEEDS_VERIFICATION |
| ACF block layout identifier | None | Exact deployed identifiers and field sets require runtime/schema evidence | No frontend validation | Not fetched | NEEDS_VERIFICATION |
| Unknown block | None | N/A | N/A | No block renderer exists, so no page crash path exists | NOT_APPLICABLE |

## Verified backend capability

Backend source documents that:
- `headless/v1/page` provides a normalized page object.
- `headless/v1/page-blocks` is a separate endpoint.
- `PageNormalizer::from_post_with_blocks()` adds a `blocks` field from ACF flexible-content fields whose entries expose a `layout` key.
- ACF, image, relationship, link, user, repeater, SEO, and language structures are normalized by plugin normalizers.

These normalized contracts are not directly interchangeable with the current frontend's WordPress Core REST `WPPage`/`WPPost` types. Phase 6 therefore does not migrate endpoints or introduce speculative block mappings.

## Design only — not implemented

A future block renderer must:
1. Use a verified raw page-blocks type.
2. Normalize each known `layout` identifier to a narrowly typed view model.
3. Render an explicit safe fallback for unknown/invalid/empty blocks.
4. Avoid rendering arbitrary block HTML as a substitute for a missing mapping.
5. Keep client-only blocks isolated from the server renderer.