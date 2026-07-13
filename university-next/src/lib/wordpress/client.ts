import { REVALIDATE_POSTS } from '@/constants/api';
import { WP_API_URL } from '@/config/env/server';
import {
  parseWordPressRestError,
  WordPressApiError,
  WordPressResponseError,
} from '@/lib/wordpress/errors';
import {
  buildWordPressUrl,
  type WordPressQueryParams,
} from '@/lib/wordpress/url';

interface WpFetchOptions {
  /** Query-string parameters appended to the URL. */
  params?: WordPressQueryParams;
  /**
   * Next.js ISR revalidation window in seconds.
   * Defaults to REVALIDATE_POSTS (60 s).
   * Pass 0 to opt into no-store / always fresh.
   */
  revalidate?: number;
  /** Cache tags for on-demand revalidation via revalidateTag(). */
  tags?: string[];
  /** Optional caller-provided cancellation signal. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds. Defaults to 10 seconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Typed wrapper around fetch() pre-configured for the WordPress core REST API.
 *
 * Endpoint contracts in current consumers use the `/wp/v2` API. Headless API
 * normalized routes are documented separately and require a dedicated
 * normalization migration before replacing these callers.
 */
export async function wpFetch<T>(
  endpoint: string,
  {
    params,
    revalidate = REVALIDATE_POSTS,
    tags,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: WpFetchOptions = {},
): Promise<T> {
  const url = buildWordPressUrl(WP_API_URL, endpoint, params);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate, tags },
      headers: { Accept: 'application/json' },
      signal: requestSignal,
    });

    if (!response.ok) {
      const payload = await parseJsonSafely(response);
      const parsedError = parseWordPressRestError(payload);

      throw new WordPressApiError({
        endpoint: url.pathname,
        status: response.status,
        code: parsedError.code,
        message:
          parsedError.message ??
          `WordPress API request failed with status ${response.status}.`,
      });
    }

    const payload = await parseJsonSafely(response);
    if (payload === undefined || payload === null) {
      throw new WordPressResponseError(
        url.pathname,
        'WordPress API returned an empty or invalid JSON response.',
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof WordPressApiError || error instanceof WordPressResponseError) {
      throw error;
    }

    const isTimeout = timeoutController.signal.aborted && !signal?.aborted;
    throw new WordPressResponseError(
      url.pathname,
      isTimeout
        ? 'WordPress API request timed out.'
        : 'WordPress API request could not be completed.',
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a pre-built WordPress REST URL. Intended only for documented root/API
 * URLs that cannot be expressed as an endpoint relative to `WP_API_URL`.
 */
export async function wpFetchUrl<T>(
  fullUrl: string,
  revalidate = REVALIDATE_POSTS,
): Promise<T> {
  const response = await fetch(fullUrl, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const parsedError = parseWordPressRestError(payload);

    throw new WordPressApiError({
      endpoint: fullUrl,
      status: response.status,
      code: parsedError.code,
      message:
        parsedError.message ??
        `WordPress API request failed with status ${response.status}.`,
    });
  }

  const payload = await parseJsonSafely(response);
  if (payload === undefined || payload === null) {
    throw new WordPressResponseError(
      fullUrl,
      'WordPress API returned an empty or invalid JSON response.',
    );
  }

  return payload as T;
}

async function parseJsonSafely(response: Response): Promise<unknown | undefined> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}