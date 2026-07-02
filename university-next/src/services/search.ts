import type { LiveSearchItem, WpxFtSearchResponse } from '@/types/search';

const WP_BASE_URL = (
  process.env.NEXT_PUBLIC_WP_BASE_URL ?? 'https://tlu.edu.vn'
).replace(/\/$/, '');

function normalizeItems(data: WpxFtSearchResponse): LiveSearchItem[] {
  return (data.items ?? []).map((item) => ({
    title: item.title ?? '',
    url: normalizeSearchUrl(item.url ?? ''),
    excerpt: item.excerpt ?? '',
    thumb: item.thumb ?? '',
  }));
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

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  return normalizeItems((await response.json()) as WpxFtSearchResponse);
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

    if (parsed.hostname === wpBase.hostname) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }
  } catch {
    return url;
  }

  return url;
}
