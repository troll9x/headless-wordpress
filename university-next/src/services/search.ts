import type { LiveSearchItem } from '@/types/search';

const WP_BASE_URL = (
  process.env.NEXT_PUBLIC_WP_BASE_URL ?? 'https://tlu.edu.vn'
).replace(/\/$/, '');

export class SearchResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchResponseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function isAllowedImageUrl(value: string): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'tlu.edu.vn' || parsed.hostname === 'www.tlu.edu.vn')
    );
  } catch {
    return false;
  }
}

function normalizeItems(data: unknown): LiveSearchItem[] {
  if (!isRecord(data)) {
    throw new SearchResponseError('Search response is not an object.');
  }

  const rawItems = data.items;
  if (rawItems === undefined) return [];

  if (!Array.isArray(rawItems)) {
    throw new SearchResponseError('Search response items is not an array.');
  }

  return rawItems.flatMap((item) => {
    if (!isRecord(item)) return [];

    const rawTitle = item.title;
    const rawUrl = item.url;
    if (typeof rawTitle !== 'string' || typeof rawUrl !== 'string') return [];

    const title = plainText(rawTitle);
    const url = normalizeSearchUrl(rawUrl);
    if (!title || url === '#') return [];

    const excerpt = typeof item.excerpt === 'string' ? plainText(item.excerpt) : '';
    const thumb =
      typeof item.thumb === 'string' && isAllowedImageUrl(item.thumb) ? item.thumb : '';

    return [{ title, url, excerpt, thumb }];
  });
}

async function fetchSearchEndpoint(
  endpoint: 'search' | 'suggest',
  query: string,
  signal?: AbortSignal,
  limit?: number
): Promise<LiveSearchItem[]> {
  const url = new URL(`${WP_BASE_URL}/wp-json/wpx-ft/v1/${endpoint}`);
  url.searchParams.set('q', query);
  if (endpoint === 'search' && limit) {
    url.searchParams.set('per', String(limit));
  }

  const response = await fetch(url.toString(), {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new SearchResponseError(`Search request failed with status ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SearchResponseError('Search response is not valid JSON.');
  }

  return normalizeItems(payload);
}

export function searchPosts(
  query: string,
  limit = 5,
  signal?: AbortSignal
): Promise<LiveSearchItem[]> {
  return fetchSearchEndpoint('search', query, signal, limit);
}

export function suggestPosts(
  query: string,
  signal?: AbortSignal
): Promise<LiveSearchItem[]> {
  return fetchSearchEndpoint('suggest', query, signal);
}

export function normalizeSearchUrl(url: string): string {
  if (!url) return '#';

  try {
    const parsed = new URL(url);
    const wpBase = new URL(WP_BASE_URL);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#';
    }

    if (parsed.hostname === wpBase.hostname) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }

    return parsed.toString();
  } catch {
    return url.startsWith('/') && !url.startsWith('//') ? url : '#';
  }
}
