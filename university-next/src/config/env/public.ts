/**
 * Public environment variables safe for browser exposure.
 *
 * All values here are prefixed with NEXT_PUBLIC_ and may be imported by
 * Client Components without leaking private server configuration.
 */

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateURL(key: string, value: string): string {
  if (!isValidHttpUrl(value)) {
    throw new Error(
      `Environment variable ${key} is not a valid HTTP/HTTPS URL: ${value}`,
    );
  }
  const url = new URL(value);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(`Environment variable ${key} must use HTTPS in production.`);
  }
  return value.replace(/\/+$/, '');
}

export const NEXT_PUBLIC_WP_BASE_URL = validateURL(
  'NEXT_PUBLIC_WP_BASE_URL',
  process.env.NEXT_PUBLIC_WP_BASE_URL ?? 'https://tlu.edu.vn',
);

export const NEXT_PUBLIC_SITE_URL = validateURL(
  'NEXT_PUBLIC_SITE_URL',
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tlu.edu.vn',
);

export const NEXT_PUBLIC_SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trường Đại Học Thủy Lợi';
