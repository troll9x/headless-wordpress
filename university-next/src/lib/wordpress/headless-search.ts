import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const REQUEST_TIMEOUT_MS = 20_000;

interface RawSearchItem {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  type?: unknown;
  excerpt?: unknown;
  thumb?: unknown;
}

interface RawSearchResponse {
  items?: unknown;
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
  hasMore: boolean;
}

function normalizeUrl(value: string): string {
  try {
    const result = new URL(value, WP_SITE_URL);
    const wordpress = new URL(WP_SITE_URL);
    return result.hostname === wordpress.hostname
      ? `${result.pathname}${result.search}${result.hash}` || '/'
      : result.toString();
  } catch {
    return '#';
  }
}

function isExpectedLocale(url: string, locale: Locale): boolean {
  const isEnglishPath = url === '/en' || url.startsWith('/en/');
  return locale === 'en' ? isEnglishPath : !isEnglishPath;
}

export async function searchHeadlessSite(
  query: string,
  locale: Locale,
  page = 1,
  perPage = 10,
): Promise<HeadlessSearchResult> {
  const cleanQuery = query.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (cleanQuery.length < 2) return { items: [], hasMore: false };

  const safePage = Math.max(1, Math.trunc(page));
  const safePerPage = Math.min(50, Math.max(1, Math.trunc(perPage)));
  const endpoint = buildWordPressRestUrl(WP_API_URL, '/headless/v1/search', {
    q: cleanQuery,
    per: safePerPage + 1,
    page: safePage,
    lang: locale,
  });

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: timeoutController.signal,
    });
    if (!response.ok) {
      throw new Error(`WordPress search returned ${response.status}.`);
    }

    const payload = await response.json() as RawSearchResponse;
    const rawItems = Array.isArray(payload.items) ? payload.items as RawSearchItem[] : [];
    const normalizedItems = rawItems.flatMap((item) => {
      if (
        typeof item.id !== 'number' ||
        typeof item.title !== 'string' ||
        typeof item.url !== 'string'
      ) {
        return [];
      }

      const url = normalizeUrl(item.url);
      if (!item.title.trim() || url === '#' || !isExpectedLocale(url, locale)) return [];

      return [{
        id: item.id,
        title: item.title,
        url,
        type: typeof item.type === 'string' ? item.type : 'post',
        excerpt: typeof item.excerpt === 'string' ? item.excerpt : '',
        thumb: typeof item.thumb === 'string' ? item.thumb : '',
      }];
    });

    return {
      items: normalizedItems.slice(0, safePerPage),
      hasMore: normalizedItems.length > safePerPage,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
