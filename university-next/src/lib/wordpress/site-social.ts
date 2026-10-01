import 'server-only';

import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { WP_API_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';

const SOCIAL_OPTIONS_KEY = 'tlu_site_social';
const SOCIAL_REQUEST_TIMEOUT_MS = 6_000;

type JsonRecord = Record<string, unknown>;
export type SocialPlatform = 'facebook' | 'youtube' | 'instagram' | 'tiktok';
export type SiteSocialLinks = Record<SocialPlatform, string | null>;

const HOSTS: Record<SocialPlatform, readonly string[]> = {
  facebook: ['facebook.com'],
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSocialUrl(value: unknown, platform: SocialPlatform): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const allowed = HOSTS[platform].some(
      (candidate) => host === candidate || host.endsWith(`.${candidate}`),
    );
    return url.protocol === 'https:' && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export function extractSiteSocialLinks(payload: unknown): SiteSocialLinks {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && isRecord(response.fields) ? response.fields : {};

  return {
    facebook: normalizeSocialUrl(fields.facebook_url, 'facebook'),
    youtube: normalizeSocialUrl(fields.youtube_url, 'youtube'),
    instagram: normalizeSocialUrl(fields.instagram_url, 'instagram'),
    tiktok: normalizeSocialUrl(fields.tiktok_url, 'tiktok'),
  };
}

export async function getSiteSocialLinks(): Promise<SiteSocialLinks> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: SOCIAL_OPTIONS_KEY,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, 'site-social'],
    },
    signal: AbortSignal.timeout(SOCIAL_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Social options API returned ${response.status}.`);
  }

  return extractSiteSocialLinks(await response.json());
}
