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
  const url = new URL(value);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(`Environment variable ${key} must use HTTPS in production.`);
  }
  return value.replace(/\/+$/, '');
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const WP_API_URL = validateURL(
  'WP_API_URL',
  requiredEnv('WP_API_URL'),
);

export const WP_SITE_URL = validateURL(
  'WP_SITE_URL',
  requiredEnv('WP_SITE_URL'),
);

/** Temporary source for selections rendered only by the legacy homepage. */
export const LEGACY_WP_SITE_URL = validateURL(
  'LEGACY_WP_SITE_URL',
  optionalEnv('LEGACY_WP_SITE_URL', WP_SITE_URL),
);

export const VIETTEL_TTS_API_URL = validateURL(
  'VIETTEL_TTS_API_URL',
  optionalEnv('VIETTEL_TTS_API_URL', 'https://viettelai.vn/tts/speech_synthesis'),
);

/** Server-only Viettel AI credential. Never expose this through NEXT_PUBLIC_*. */
export const VIETTEL_TTS_TOKEN = (
  process.env.VIETTEL_TTS_TOKEN ?? process.env.VIETTEL_TTS_API_KEY ?? ''
).trim();

export const VIETTEL_TTS_VOICE = optionalEnv(
  'VIETTEL_TTS_VOICE',
  'hn-quynhanh',
).trim();

const configuredTtsSpeed = Number.parseFloat(optionalEnv('VIETTEL_TTS_SPEED', '1'));
export const VIETTEL_TTS_SPEED = [0.8, 0.9, 1, 1.1, 1.2].includes(configuredTtsSpeed)
  ? configuredTtsSpeed
  : 1;

export const VIETTEL_TTS_WITHOUT_FILTER =
  optionalEnv('VIETTEL_TTS_WITHOUT_FILTER', 'false').toLowerCase() === 'true';

function boundedInteger(key: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(optionalEnv(key, String(fallback)), 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export const TTS_RATE_LIMIT_MAX = boundedInteger('TTS_RATE_LIMIT_MAX', 30, 1, 300);
export const TTS_RATE_LIMIT_WINDOW_SECONDS = boundedInteger(
  'TTS_RATE_LIMIT_WINDOW_SECONDS',
  60,
  10,
  3_600,
);

/** Set only when the edge proxy overwrites X-Real-IP and Node is not public. */
export const TRUSTED_CLIENT_IP_HEADER = optionalEnv('TRUSTED_CLIENT_IP_HEADER', '').trim().toLowerCase();
if (TRUSTED_CLIENT_IP_HEADER && TRUSTED_CLIENT_IP_HEADER !== 'x-real-ip') {
  throw new Error('TRUSTED_CLIENT_IP_HEADER must be x-real-ip or empty.');
}

/** Shared only with the WordPress search endpoint, never sent to browsers. */
export const SEARCH_PROXY_SECRET = optionalEnv('SEARCH_PROXY_SECRET', '').trim();
if (SEARCH_PROXY_SECRET && SEARCH_PROXY_SECRET.length < 32) {
  throw new Error('SEARCH_PROXY_SECRET must have at least 32 characters.');
}

/** Shared HMAC secret used only by the WordPress revalidation webhook. */
export const REVALIDATION_SECRET = optionalEnv('REVALIDATION_SECRET', '').trim();
export const REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS = boundedInteger(
  'REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS',
  300,
  30,
  900,
);
export const REVALIDATION_MAX_BODY_BYTES = boundedInteger(
  'REVALIDATION_MAX_BODY_BYTES',
  262_144,
  1_024,
  1_048_576,
);
