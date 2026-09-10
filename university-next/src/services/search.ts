import type { LiveSearchItem } from '@/types/search';
import type { Locale } from '@/types/ngon-ngu';

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
    const thumb = typeof item.thumb === 'string' ? item.thumb : '';

    return [{ title, url, excerpt, thumb }];
  });
}

async function fetchLocalSearch(
  query: string,
  locale: Locale,
  limit: number,
  signal?: AbortSignal,
): Promise<LiveSearchItem[]> {
  const params = new URLSearchParams({
    q: query,
    lang: locale,
    limit: String(limit),
  });
  const response = await fetch(`/api/search?${params.toString()}`, {
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
  locale: Locale,
  limit = 5,
  signal?: AbortSignal
): Promise<LiveSearchItem[]> {
  return fetchLocalSearch(query, locale, limit, signal);
}

export function normalizeSearchUrl(url: string): string {
  if (!url) return '#';

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#';
    }

    if (parsed.hostname === 'tlu.edu.vn' || parsed.hostname === 'www.tlu.edu.vn') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }

    return parsed.toString();
  } catch {
    return url.startsWith('/') && !url.startsWith('//') ? url : '#';
  }
}
