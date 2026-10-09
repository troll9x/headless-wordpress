import { WP_API_URL, WP_SITE_URL, SEARCH_PROXY_SECRET } from '@/config/env/server';
import { signedSearchHeaders } from '@/lib/security/search-proxy';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_TRANSIENT_RETRIES = 1;
const TRANSIENT_RETRY_DELAY_MS = 200;
const RETRYABLE_SEARCH_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

class SearchUpstreamError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`WordPress search returned ${status}.`);
    this.name = 'SearchUpstreamError';
    this.status = status;
  }
}

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
  clientIp = 'unknown',
  signal?: AbortSignal,
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

  let response: Response | undefined;
  for (let attempt = 0; ; attempt += 1) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      response = await fetch(endpoint, {
        headers: { Accept: 'application/json', ...signedSearchHeaders(clientIp, SEARCH_PROXY_SECRET) },
        next: { revalidate: 60 },
        signal: requestSignal,
      });
      if (response.ok) break;

      if (
        signal?.aborted ||
        !RETRYABLE_SEARCH_STATUSES.has(response.status) ||
        attempt >= MAX_TRANSIENT_RETRIES
      ) {
        throw new SearchUpstreamError(response.status);
      }
    } catch (error) {
      if (signal?.aborted || attempt >= MAX_TRANSIENT_RETRIES) throw error;
      // Retry transient network errors once. Do not retry caller cancellation.
      if (
        error instanceof SearchUpstreamError &&
        !RETRYABLE_SEARCH_STATUSES.has(error.status)
      ) {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
  }

  if (!response) throw new Error('WordPress search returned no response.');
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
}
