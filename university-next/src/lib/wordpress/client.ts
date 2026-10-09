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
import { coalesce } from '@/lib/utils/coalesce';

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
const MAX_TRANSIENT_RETRIES = 1;
const TRANSIENT_RETRY_DELAY_MS = 200;
// A cold homepage starts several independent category and post requests.
// Keep a moderate ceiling so queued requests can start before the homepage's
// fallback deadline without flooding WordPress.
const MAX_CONCURRENT_WORDPRESS_REQUESTS = 6;
let activeWordPressRequests = 0;
const wordpressRequestQueue: Array<() => void> = [];

function getEndpointLabel(url: URL): string {
  // With index.php?rest_route=..., pathname alone hides which API timed out.
  // Keep query values out of logs because some endpoints contain search terms.
  return url.searchParams.get('rest_route') ?? url.pathname;
}

async function withWordPressRequestSlot<T>(request: () => Promise<T>): Promise<T> {
  if (activeWordPressRequests >= MAX_CONCURRENT_WORDPRESS_REQUESTS) {
    await new Promise<void>((resolve) => wordpressRequestQueue.push(resolve));
  } else {
    activeWordPressRequests += 1;
  }

  try {
    return await request();
  } finally {
    const nextRequest = wordpressRequestQueue.shift();
    if (nextRequest) {
      nextRequest();
    } else {
      activeWordPressRequests -= 1;
    }
  }
}

export interface WpCollectionResult<T> {
  data: T;
  total: number;
  totalPages: number;
}

export interface WpFetchUrlOptions {
  revalidate?: number;
  tags?: string[];
  timeoutMs?: number;
}

interface WpPayloadResult<T> {
  data: T;
  response: Response;
}

/**
 * Typed wrapper around fetch() pre-configured for the WordPress core REST API.
 *
 * Endpoint contracts in current consumers use the `/wp/v2` API. Headless API
 * normalized routes are documented separately and require a dedicated
 * normalization migration before replacing these callers.
 */
export async function wpFetch<T>(
  endpoint: string,
  options: WpFetchOptions = {},
): Promise<T> {
  const result = await fetchWpPayload<T>(endpoint, options);
  return result.data;
}

/** Fetch a REST collection together with WordPress pagination headers. */
export async function wpFetchCollection<T>(
  endpoint: string,
  options: WpFetchOptions = {},
): Promise<WpCollectionResult<T>> {
  const { data, response } = await fetchWpPayload<T>(endpoint, options);
  return {
    data,
    total: Number.parseInt(response.headers.get('X-WP-Total') ?? '0', 10) || 0,
    totalPages: Number.parseInt(response.headers.get('X-WP-TotalPages') ?? '0', 10) || 0,
  };
}

async function fetchWpPayload<T>(
  endpoint: string,
  {
    params,
    revalidate = REVALIDATE_POSTS,
    tags,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: WpFetchOptions = {},
): Promise<WpPayloadResult<T>> {
  const url = buildWordPressUrl(WP_API_URL, endpoint, params);
  const execute = () => executeWpPayload<T>(url, {
    revalidate,
    tags,
    signal,
    timeoutMs,
  });

  // A caller-owned signal has request-specific cancellation semantics and must
  // not be shared with other renders. Normal cacheable GETs are safe to merge.
  if (signal || revalidate === 0) return execute();

  const tagKey = tags?.slice().sort().join(',') ?? '';
  return coalesce(`wp:${url.toString()}:${revalidate}:${tagKey}`, execute);
}

async function executeWpPayload<T>(
  url: URL,
  {
    revalidate,
    tags,
    signal,
    timeoutMs,
  }: Required<Pick<WpFetchOptions, 'revalidate' | 'timeoutMs'>> &
    Pick<WpFetchOptions, 'tags' | 'signal'>,
): Promise<WpPayloadResult<T>> {
  return withWordPressRequestSlot(() => executeWpPayloadNow<T>(url, {
    revalidate,
    tags,
    signal,
    timeoutMs,
  }));
}

async function executeWpPayloadNow<T>(
  url: URL,
  {
    revalidate,
    tags,
    signal,
    timeoutMs,
  }: Required<Pick<WpFetchOptions, 'revalidate' | 'timeoutMs'>> &
    Pick<WpFetchOptions, 'tags' | 'signal'>,
): Promise<WpPayloadResult<T>> {
  for (let attempt = 0; ; attempt += 1) {
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
          endpoint: getEndpointLabel(url),
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
          getEndpointLabel(url),
          'WordPress API returned an empty or invalid JSON response.',
        );
      }

      return { data: payload as T, response };
    } catch (error) {
      const isTimeout = timeoutController.signal.aborted && !signal?.aborted;
      const normalizedError = error instanceof WordPressApiError || error instanceof WordPressResponseError
        ? error
        : new WordPressResponseError(
            getEndpointLabel(url),
            isTimeout
              ? 'WordPress API request timed out.'
              : 'WordPress API request could not be completed.',
            error,
          );

      if (signal?.aborted || attempt >= MAX_TRANSIENT_RETRIES || !isTransientWordPressError(normalizedError)) {
        throw normalizedError;
      }

      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function isTransientWordPressError(error: Error): boolean {
  if (error instanceof WordPressResponseError) return true;
  if (!(error instanceof WordPressApiError)) return false;
  return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
}

/**
 * Fetch a pre-built WordPress REST URL. Intended only for documented root/API
 * URLs that cannot be expressed as an endpoint relative to `WP_API_URL`.
 */
export async function wpFetchUrl<T>(
  fullUrl: string,
  options: number | WpFetchUrlOptions = REVALIDATE_POSTS,
): Promise<T> {
  const normalized = typeof options === 'number' ? { revalidate: options } : options;
  const revalidate = normalized.revalidate ?? REVALIDATE_POSTS;
  const tags = normalized.tags;
  const timeoutMs = normalized.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tagKey = tags?.slice().sort().join(',') ?? '';
  const url = new URL(fullUrl);
  const execute = () => executeWpPayload<T>(url, { revalidate, tags, timeoutMs })
    .then((result) => result.data);

  if (revalidate === 0) return execute();
  return coalesce(`wp-url:${url.toString()}:${revalidate}:${tagKey}`, execute);
}

async function parseJsonSafely(response: Response): Promise<unknown | undefined> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
