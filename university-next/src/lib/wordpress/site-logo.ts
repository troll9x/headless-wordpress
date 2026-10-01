import 'server-only';

import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const LOGO_OPTIONS_KEY = 'tlu_site_logo';
const LOGO_REQUEST_TIMEOUT_MS = 6_000;
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
type JsonRecord = Record<string, unknown>;

export interface SiteLogo {
  url: string;
  alt: string;
}

export interface SiteLogos {
  header: Record<Locale, SiteLogo | null>;
  footer: Record<Locale, SiteLogo | null>;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

function mediaCandidate(value: unknown): SiteLogo | null {
  if (typeof value === 'string') {
    const url = safeImageUrl(value);
    return url && IMAGE_EXTENSION.test(url) ? { url, alt: '' } : null;
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
  };
}

export function extractSiteLogos(payload: unknown): SiteLogos {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && 'fields' in response ? response.fields : response;

  if (!isRecord(fields)) {
    return {
      header: { vi: null, en: null },
      footer: { vi: null, en: null },
    };
  }

  return {
    header: {
      vi: mediaCandidate(fields.logo_vi),
      en: mediaCandidate(fields.logo_en),
    },
    footer: {
      vi: mediaCandidate(fields.footer_logo_vi),
      en: mediaCandidate(fields.footer_logo_en),
    },
  };
}

export async function getSiteLogos(): Promise<SiteLogos> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: LOGO_OPTIONS_KEY,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, 'site-logo'],
    },
    signal: AbortSignal.timeout(LOGO_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Logo options API returned ${response.status}.`);
  }

  return extractSiteLogos(await response.json());
}
