# Phase 8 — Search và Suggest Audit & Implementation

## 1. Search Architecture
The search functionality is implemented as a Client-side Live Search. It interacts with a specialized WordPress plugin (WPX Fulltext) via a custom REST API namespace.

**Data Flow:**
`LiveSearch (UI)` $\rightarrow$ `services/search.ts (Fetch)` $\rightarrow$ `WordPress API (wpx-ft/v1)` $\rightarrow$ `Response Normalization` $\rightarrow$ `UI State Update`.

## 2. Search/Suggest Inventory

| File | Function | Runtime | Endpoint | Params | Response type | Caller | Current behavior | Problems |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `services/search.ts` | `searchPosts` | Browser | `/wp-json/wpx-ft/v1/search` | `q`, `per` | `LiveSearchItem[]` | `LiveSearch.tsx` | Fetches search results for queries $\ge$ 2 chars | No locale, race condition risk |
| `services/search.ts` | `suggestPosts` | Browser | `/wp-json/wpx-ft/v1/suggest` | `q` | `LiveSearchItem[]` | `LiveSearch.tsx` | Fetches suggestions for queries < 2 chars | No locale, race condition risk |

## 3. Endpoint Contract Evidence

| Endpoint | Method | Required params | Optional params | Success shape | Error shape | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/wpx-ft/v1/search` | GET | `q` | `per` | `{ items: [...] }` | HTTP Error | Frontend Usage | NEEDS_VERIFICATION |
| `/wpx-ft/v1/suggest` | GET | `q` | None | `{ items: [...] }` | HTTP Error | Frontend Usage | NEEDS_VERIFICATION |

**Note:** Backend source `headless-api/` was not found on this machine, so contracts are verified only via frontend usage.

## 4. Search Caller Inventory
- `university-next/src/components/layout/Topbar.tsx` $\rightarrow$ `SearchBox.tsx` $\rightarrow$ `LiveSearch.tsx`.

## 5. LiveSearch State Flow
1. **Input Change** $\rightarrow$ `updateQuery()` $\rightarrow$ `setQuery()`.
2. **Effect Trigger** $\rightarrow$ `trimmedQuery` change.
3. **Debounce** $\rightarrow$ Wait 180ms.
4. **Request** $\rightarrow$ `searchPosts` or `suggestPosts` with `AbortSignal`.
5. **Loading** $\rightarrow$ `setStatus('loading')`, `setIsOpen(true)`.
6. **Response** $\rightarrow$ `setItems(results)`, `setStatus('ready')`.
7. **Render** $\rightarrow$ `highlightText()` $\rightarrow$ `dangerouslySetInnerHTML`.
8. **Interaction** $\rightarrow$ Keyboard navigation $\rightarrow$ `router.push()`.

## 6. Debounce and Abort Findings
- **Debounce**: 180ms using `window.setTimeout`.
- **Abort**: `AbortController` is created and aborted in the `useEffect` cleanup.
- **Issue**: If a request finishes after a newer request has started but before the previous one was aborted (rare but possible), or if state updates are queued, the UI might flicker.

## 7. Race-condition Findings
- **Current implementation**: Uses `AbortController` + `requestIdRef` to prevent stale responses.
- **Implementation**: Added `requestIdRef` counter and check against current ID after fetch to ensure only latest request updates state.
- **Risk**: Mitigated - stale responses are now rejected before updating state.

## 8. Keyboard/Accessibility Findings
- **Roles**: `combobox`, `listbox`, `option` are present.
- **Interactions**: `ArrowUp`/`ArrowDown` and `Enter` are implemented.
- **Completed**: 
    - Added `aria-activedescendant` to link the input to the active option.
    - Added `aria-controls` with matching result list ID.
    - Added `aria-expanded` tied to dropdown state.
    - `Escape` closes dropdown.
    - `Enter` selects active item or submits form.

## 9. Query and URL Findings
- **Search Page**: `/tim-kiem` (VI) and `/en/search` (EN).
- **Param**: `?q=...`
- **Encoding**: Uses `URLSearchParams` for the "View all" link (safe encoding).
- **Locale-aware Routing**: `locale` variable derived from pathname.

## 10. Locale Findings
- **Backend**: No evidence found for backend support of `lang` parameter. The `headless-api/` source was not available.
- **Status**: NEEDS_VERIFICATION — SEARCH LOCALE PARAMETER NOT SENT (request không gửi tham số lang do backend contract chưa xác minh)
- **UI**: Locale-aware routing được giữ cho UI/pathname detection, nhưng không truyền vào search request.

## 11. Result URL Findings
- **Normalization**: `normalizeSearchUrl` converts absolute WP URLs to relative paths if the hostname matches `WP_BASE_URL`.
- **Protocol Validation**: Only `http:` and `https:` are allowed.
- **Fallback**: Returns `#` for invalid/empty URLs.
- **Security**: Checks protocol and hostname before normalization.

## 12. Highlight/XSS Findings
- **Logic**: `escapeHtml` is called first, then a `RegExp` adds `<span class="wpx-ft-hl">`.
- **Safety**: Safe as long as the source text is escaped before markup is added.
- **RegExp Sanitization**: Added `escapeRegExp` helper that escapes all special regex characters.
- **Potential Bug**: The `highlightText` function attempts to split by words if the full phrase doesn't match; this is a good UX feature but must be carefully checked for RegExp injection.

## 13. Response Validation Findings
- **Type Guard**: Added `isRecord()` type guard for runtime validation.
- **Array Check**: Validates `data.items` is an array before processing.
- **Field Validation**: Checks `title` and `url` are strings before including results.
- **Thumbnail Validation**: Validates thumbnail URLs are HTTPS and from allowed hosts (`tlu.edu.vn` or `www.tlu.edu.vn`).
- **Invalid Items**: Invalid items are filtered out using `flatMap` instead of crashing the whole dropdown.

## 14. Error-handling Findings
- **Custom Error**: Created `SearchResponseError` class for structured error handling.
- **Abort Errors**: Caught with `error.name === 'AbortError'` check.
- **JSON Errors**: Catches `SyntaxError` when parsing invalid JSON.
- **HTTP Errors**: Throws with status code for investigation.
- **Status Handling**: Differentiates between loading, error, and ready states.

## 15. Cache Findings
- **Strategy**: Added `cache: 'no-store'` to fetch options.
- **Behavior**: Search results are not cached by Next.js fetch cache.
- **Headers**: Added `Accept: application/json` header.

## 16. Performance Findings
- **Request Volume**: 180ms debounce is reasonable.
- **Image Size**: `48x48` fixed size in `next/image` is efficient.
- **Re-renders**: `highlightedItems` is memoized using `useMemo`.
- **Stale Prevention**: Request ID check prevents unnecessary updates after faster subsequent queries.

## 17. Image Findings
- **Implementation**: `next/image` with `width={48}` and `height={48}`.
- **Alt Text**: Uses `item.title` (plain text, escaped).
- **Host Policy**: `tlu.edu.vn` and `www.tlu.edu.vn` allowed in `next.config.ts`.
- **Security**: Only HTTPS URLs from verified hosts are allowed.

## 18. Changes completed

### Frontend Logic & Robustness
- **Search Route Not Implemented**: `submitSearch()` refined to NOT navigate to non-existent routes (`/en/search`, `/tim-kiem`). Route search result page chưa tồn tại nên không thể điều hướng. Ghi: DESIGN ONLY — SEARCH RESULTS PAGE NOT IMPLEMENTED.
- **Race Condition Guard**: Implemented `requestIdRef` counter and check against current ID after fetch.
- **Abort Error Handling**: Added `error.name === 'AbortError'` check to prevent "Error" state from flashing during fast typing.

### Accessibility & UX
- **A11y Enhancement**: Added `aria-activedescendant` to search input and matching `id` attributes to result items for combobox pattern.
- **Result List ID**: Added `id={`${inputId}-results`}` to result container with matching `aria-controls`.

### Type Safety & Security
- **Custom Error Class**: Created `SearchResponseError` for structured error handling.
- **Type Guards**: Added `isRecord()` type guard for runtime validation.
- **Protocol Validation**: Only `http:` and `https:` are allowed in `normalizeSearchUrl`.
- **Thumbnail Validation**: Validates thumbnail URLs are HTTPS and from allowed hosts.
- **RegExp Sanitization**: Added `escapeRegExp` helper for safe search query regex generation.

### Verification
- `npm run lint`: PASS, exit code 0
- `npm run typecheck`: PASS, exit code 0
- `npm run build`: PASS, exit code 0 (all routes generated successfully)

## 19. Deferred issues
- Backend source verification for `wpx-ft/v1` (requires `headless-api/` source).

## 20. NEEDS_VERIFICATION items
- Backend contract for `wpx-ft/v1` (Params, Response shape).
- Backend support for `lang` parameter in search (frontend locale passed but not verified).
- Production media hosts for thumbnails.
- Exact WordPress plugin version for search/suggest endpoints.

## 21. Known limitations
- No live WordPress instance for smoke testing.
- Locale parameter behavior depends on backend plugin support (not verified).

## 22. Remaining risks
- Backend contract mismatch if the plugin version differs from frontend assumptions.
- Locale parameter may not be supported by older plugin versions.
- Thumbnail images from unexpected hosts may not render.

# PHASE 8 CORRECTION RESULT

Overall status: PASS WITH WARNINGS

Locale `lang` parameter: NOT SENT (backend contract NEEDS_VERIFICATION — SEARCH LOCALE PARAMETER NOT SENT)

Search-results route status: DESIGN ONLY — SEARCH RESULTS PAGE NOT IMPLEMENTED (route `/en/search` và `/tim-kiem` không tồn tại, `submitSearch()` không điều hướng)

Search endpoint status: NEEDS_VERIFICATION (frontend usage only, backend source `headless-api/` not available)

Suggest endpoint status: NEEDS_VERIFICATION (frontend usage only, backend source `headless-api/` not available)

Files changed:
- `university-next/src/services/search.ts`
- `university-next/src/components/tim-kiem/LiveSearch.tsx`
- `docs/nextjs-audit/phase-8-search.md`

Race-condition handling: Implemented `requestIdRef` counter with query-based ID tracking

Debounce cleanup: Timer cleared on query change and unmount; AbortController aborted

Accessibility: `aria-activedescendant`, `aria-controls`, `aria-expanded`, `aria-autocomplete`, `aria-selected` properly wired

Highlight/XSS: `escapeHtml` before `escapeRegExp` for safe highlighting

Response validation: `isRecord()` type guard, array checks, field validation for `title` and `url`

Error handling: `SearchResponseError` class, AbortError handling, HTTP status checking

Thumbnail: HTTPS only, `tlu.edu.vn` or `www.tlu.edu.vn` hosts only, `next/image` with 48x48

Runtime smoke tests: Not run (no live WordPress available)

Lint: PASS, exit code 0

Typecheck: PASS, exit code 0

Build: PASS, exit code 0

Remaining risks:
- Backend contract may differ if plugin version differs
- Locale parameter support unverified
- Thumbnail host policy may need expansion if production uses other hosts

Ready to commit: Yes
