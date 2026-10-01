import 'server-only';

import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';

const FAVICON_OPTIONS_KEY = 'tlu_site_favicon';
const FAVICON_REQUEST_TIMEOUT_MS = 6_000;
const IMAGE_EXTENSION = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

type JsonRecord = Record<string, unknown>;

export interface SiteFavicon {
  url: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(text(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function safeImageUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';

  try {
    const url = new URL(raw, WP_SITE_URL);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function mediaCandidate(value: unknown): SiteFavicon | null {
  if (typeof value === 'string') {
    const url = safeImageUrl(value);
    return url && IMAGE_EXTENSION.test(url)
      ? { url, mimeType: null, width: null, height: null }
      : null;
  }

  if (!isRecord(value)) return null;

  const url = safeImageUrl(value.url ?? value.source_url ?? value.src);
  const mimeType = text(value.mime_type ?? value.mimeType ?? value.type).toLowerCase();
  const isImage = mimeType.startsWith('image/') || IMAGE_EXTENSION.test(url);
  if (!url || !isImage) return null;

  return {
    url,
    mimeType: mimeType.startsWith('image/') ? mimeType : null,
    width: positiveInteger(value.width),
    height: positiveInteger(value.height),
  };
}

function findFirstImage(value: unknown): SiteFavicon | null {
  const direct = mediaCandidate(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const favicon = findFirstImage(item);
      if (favicon) return favicon;
    }
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sizes') continue;
      const favicon = findFirstImage(item);
      if (favicon) return favicon;
    }
  }

  return null;
}

export function extractSiteFavicon(payload: unknown): SiteFavicon | null {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && 'fields' in response ? response.fields : response;

  if (!isRecord(fields)) return findFirstImage(fields);

  const preferredKeys = [
    'site_favicon',
    'favicon',
    'favicon_image',
    'site_icon',
    'tlu_site_favicon',
    'icon',
  ];

  for (const key of preferredKeys) {
    const favicon = mediaCandidate(fields[key]);
    if (favicon) return favicon;
  }

  return findFirstImage(fields);
}

export async function getSiteFavicon(): Promise<SiteFavicon | null> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: FAVICON_OPTIONS_KEY,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, 'site-favicon'],
    },
    signal: AbortSignal.timeout(FAVICON_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Favicon options API returned ${response.status}.`);
  }

  return extractSiteFavicon(await response.json());
}
