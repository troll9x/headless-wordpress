import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildPostUrl } from '@/constants/duong-dan';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const REQUEST_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

interface CoreSearchItem {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  type?: unknown;
  subtype?: unknown;
  _embedded?: { self?: Array<{
    id?: number;
    slug?: string;
    excerpt?: { rendered?: string };
    canonical_path?: string;
    _embedded?: { 'wp:featuredmedia'?: Array<{ source_url?: string }> };
  }> };
}

export interface HeadlessSearchItem {
  id: number;
  title: string;
  url: string;
  type: string;
  excerpt: string;
  thumb: string;
}

export interface HeadlessSearchResult {
  items: HeadlessSearchItem[];
  total: number;
  totalPages: number;
  hasMore: boolean;
}

function sameSitePath(value: string): string | null {
  try {
    const url = new URL(value, WP_SITE_URL);
    if (url.origin !== new URL(WP_SITE_URL).origin) return null;
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return null;
  }
}

/** Search the actual snapshot CMS. Its Headless search route delegates to an
 * absent WPX plugin on this host and returns results from the legacy backend.
 * Core /wp/v2/search has the CMS's published Polylang content and exact totals.
 */
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
  const endpoint = buildWordPressRestUrl(WP_API_URL, '/wp/v2/search', {
    search: cleanQuery,
    lang: locale,
    page: safePage,
    per_page: safePerPage,
    type: 'post',
    subtype: 'post,page',
    _embed: 'self',
  });
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
        signal: requestSignal,
      });
      if (response.ok) break;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === 1) {
        throw new Error(`CMS search returned ${response.status}.`);
      }
    } catch (error) {
      if (signal?.aborted || attempt === 1 || (error instanceof Error && /returned \d+/.test(error.message))) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!response?.ok) throw new Error('CMS search returned no response.');
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('CMS search returned an invalid response.');
  const total = Number.parseInt(response.headers.get('X-WP-Total') || '', 10);
  const totalPages = Number.parseInt(response.headers.get('X-WP-TotalPages') || '', 10);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(totalPages)) throw new Error('CMS search omitted pagination metadata.');
  const items = (payload as CoreSearchItem[]).flatMap((item) => {
    if (typeof item.id !== 'number' || typeof item.title !== 'string' || typeof item.url !== 'string') return [];
    if (item.subtype !== 'post' && item.subtype !== 'page') return [];
    const detail = item._embedded?.self?.[0];
    const url = item.subtype === 'post' && detail?.slug
      ? buildPostUrl(detail.slug, locale, undefined, item.id, detail.canonical_path)
      : sameSitePath(item.url);
    if (!url || !item.title.trim() || (locale === 'en' ? !url.startsWith('/en/') : url.startsWith('/en/'))) return [];
    return [{
      id: item.id,
      title: item.title,
      url,
      type: item.subtype,
      excerpt: detail?.excerpt?.rendered || '',
      thumb: detail?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
    }];
  });
  return { items, total, totalPages, hasMore: safePage < totalPages };
}
