import 'server-only';

/**
 * Server-only environment variables.
 *
 * Never import this file from Client Components.
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
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const WP_API_URL = validateURL(
  'WP_API_URL',
  optionalEnv('WP_API_URL', 'https://tlu.edu.vn/wp-json/wp/v2'),
);

export const WP_SITE_URL = validateURL(
  'WP_SITE_URL',
  optionalEnv('WP_SITE_URL', 'https://tlu.edu.vn'),
);