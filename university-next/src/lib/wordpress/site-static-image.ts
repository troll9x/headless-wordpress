import 'server-only';

import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const STATIC_IMAGE_OPTIONS_KEY = 'tlu_site_img';
const STATIC_IMAGE_REQUEST_TIMEOUT_MS = 6_000;
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const FIELD_BY_LOCALE: Record<Locale, 'anh_tinh_vi' | 'anh_tinh_en'> = {
  vi: 'anh_tinh_vi',
  en: 'anh_tinh_en',
};

type JsonRecord = Record<string, unknown>;

export interface SiteStaticImage {
  url: string;
  alt: string;
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

function mediaCandidate(value: unknown): SiteStaticImage | null {
  if (typeof value === 'string') {
    const url = safeImageUrl(value);
    return url && IMAGE_EXTENSION.test(url)
      ? { url, alt: '', width: null, height: null }
      : null;
  }

  if (!isRecord(value)) return null;

  const url = safeImageUrl(value.url ?? value.source_url ?? value.src);
  const mimeType = text(value.mime_type ?? value.mimeType ?? value.type).toLowerCase();
  if (!url || (!mimeType.startsWith('image/') && !IMAGE_EXTENSION.test(url))) {
    return null;
  }

  return {
    url,
    alt: text(value.alt ?? value.alt_text),
    width: positiveInteger(value.width),
    height: positiveInteger(value.height),
  };
}

function findFirstImage(value: unknown): SiteStaticImage | null {
  const direct = mediaCandidate(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findFirstImage(item);
      if (image) return image;
    }
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sizes') continue;
      const image = findFirstImage(item);
      if (image) return image;
    }
  }

  return null;
}

export function extractSiteStaticImage(
  payload: unknown,
  locale: Locale,
): SiteStaticImage | null {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && 'fields' in response ? response.fields : response;

  if (!isRecord(fields)) return null;

  // The selected language group is authoritative. Never inspect the other one.
  return findFirstImage(fields[FIELD_BY_LOCALE[locale]]);
}

export async function getSiteStaticImage(
  locale: Locale,
): Promise<SiteStaticImage | null> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: STATIC_IMAGE_OPTIONS_KEY,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, `site-static-image-${locale}`],
    },
    signal: AbortSignal.timeout(STATIC_IMAGE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Static image options API returned ${response.status}.`);
  }

  return extractSiteStaticImage(await response.json(), locale);
}
