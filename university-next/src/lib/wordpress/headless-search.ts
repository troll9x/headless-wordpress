import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import { parseHeadlessSearchResponse } from '@/lib/wordpress/headless-search-response';
import type { HeadlessSearchResult } from '@/lib/wordpress/headless-search-response';
import type { Locale } from '@/types/ngon-ngu';

const REQUEST_TIMEOUT_MS = 15_000;
export type { HeadlessSearchItem, HeadlessSearchResult } from '@/lib/wordpress/headless-search-response';

/** Language-scoped CMS search filters through Polylang before pagination. */
export async function searchHeadlessSite(
  query: string,
  locale: Locale,
  page = 1,
  perPage = 10,
  signal?: AbortSignal,
): Promise<HeadlessSearchResult> {
  const cleanQuery = query.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (cleanQuery.length < 2) return { items: [], total: 0, totalPages: 0, hasMore: false };
  const safePage = Math.max(1, Math.trunc(page));
  const safePerPage = Math.min(50, Math.max(1, Math.trunc(perPage)));
  const endpoint = buildWordPressRestUrl(WP_API_URL, '/headless/v1/search', {
    q: cleanQuery, lang: locale, page: safePage, per_page: safePerPage,
  });
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
    signal: requestSignal,
  });
  if (!response.ok) throw new Error(`CMS search returned ${response.status}.`);
  return parseHeadlessSearchResponse(await response.json(), locale, safePage, safePerPage, WP_SITE_URL);
}
