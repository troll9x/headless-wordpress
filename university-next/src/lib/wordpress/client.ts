import { WP_API_URL, REVALIDATE_POSTS } from '@/constants/api';

type QueryValue = string | number | boolean | (string | number)[] | undefined;
type QueryParams = Record<string, QueryValue>;

interface WpFetchOptions {
  /** Query-string parameters appended to the URL. */
  params?: QueryParams;
  /**
   * Next.js ISR revalidation window in seconds.
   * Defaults to REVALIDATE_POSTS (60 s).
   * Pass 0 to opt into no-store / always fresh.
   */
  revalidate?: number;
  /** Cache tags for on-demand revalidation via revalidateTag(). */
  tags?: string[];
}

/**
 * Typed wrapper around fetch() pre-configured for the WordPress REST API.
 *
 * - Builds the full URL from endpoint + optional query params.
 * - Delegates caching/ISR to Next.js via `next: { revalidate, tags }`.
 * - Throws a descriptive Error on non-2xx responses.
 */
export async function wpFetch<T>(
  endpoint: string,
  { params, revalidate = REVALIDATE_POSTS, tags }: WpFetchOptions = {}
): Promise<T> {
  const url = new URL(`${WP_API_URL}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(
        key,
        Array.isArray(value) ? value.join(',') : String(value)
      );
    }
  }

  const res = await fetch(url.toString(), {
    next: { revalidate, tags },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(
      `WordPress API error ${res.status} ${res.statusText} — ${url.toString()}`
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch from an arbitrary WordPress JSON URL (e.g. the /wp-json root)
 * rather than from the /wp/v2 base.
 */
export async function wpFetchUrl<T>(
  fullUrl: string,
  revalidate = REVALIDATE_POSTS
): Promise<T> {
  const res = await fetch(fullUrl, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(
      `WordPress API error ${res.status} ${res.statusText} — ${fullUrl}`
    );
  }

  return res.json() as Promise<T>;
}
