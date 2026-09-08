interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Fixed-window limiter for a single Node.js instance. Deployments with more
 * than one replica must enforce the same limit at the reverse proxy as well.
 */
export function consumeRateLimit(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const store = stores.get(namespace) ?? new Map<string, RateLimitEntry>();
  stores.set(namespace, store);

  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  if (store.size > 10_000) {
    for (const [candidate, value] of store) {
      if (value.resetAt <= now) store.delete(candidate);
    }
  }

  const remaining = Math.max(0, limit - entry.count);
  return {
    allowed: entry.count <= limit,
    limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
  };
}

export function getClientIp(request: Request): string {
  const directHeaders = [
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
    'x-real-ip',
  ];
  for (const name of directHeaders) {
    const value = request.headers.get(name)?.trim();
    if (value) return value.slice(0, 64);
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first ? first.slice(0, 64) : 'unknown';
}
