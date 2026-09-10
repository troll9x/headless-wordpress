import { unstable_cache } from 'next/cache';
import { REVALIDATE_POSTS } from '@/constants/api';
import { WP_SITE_URL } from '@/config/env/server';
import { wpFetchUrl } from '@/lib/wordpress/client';
import type { PartnerLogo } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

interface NormalizedImage {
  id?: number | null;
  url?: string;
  alt?: string;
  title?: string;
}

interface PartnerLogoRow {
  logo_cong_ty?: NormalizedImage | string | number | null;
  link_doi_tac?: string | { url?: string | null } | null;
}

interface PartnerLogosResponse {
  items?: PartnerLogoRow[];
  total?: number;
  data?: {
    items?: PartnerLogoRow[];
    total?: number;
  };
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeRow(row: PartnerLogoRow, index: number): PartnerLogo | null {
  const image = row.logo_cong_ty;
  const imageUrl = typeof image === 'string'
    ? image
    : typeof image === 'object' && image
      ? image.url
      : undefined;
  if (!isHttpUrl(imageUrl)) return null;

  const title = typeof image === 'object' && image
    ? image.alt?.trim() || image.title?.trim() || `Logo đối tác ${index + 1}`
    : `Logo đối tác ${index + 1}`;

  const rawLink = typeof row.link_doi_tac === 'string'
    ? row.link_doi_tac
    : row.link_doi_tac?.url;

  return {
    id: String(typeof image === 'object' && image?.id ? image.id : `${index}-${imageUrl}`),
    title,
    imageUrl,
    linkUrl: isHttpUrl(rawLink) ? rawLink.trim() : null,
  };
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#038;', '&')
    .replaceAll('&#38;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'");
}

function htmlAttribute(block: string, name: string): string {
  const match = block.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return decodeHtmlAttribute(match?.[1] ?? '');
}

function titleFromImageUrl(imageUrl: string, index: number): string {
  try {
    const filename = decodeURIComponent(new URL(imageUrl).pathname.split('/').at(-1) ?? '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replaceAll('-', ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return filename || `Logo đối tác ${index + 1}`;
  } catch {
    return `Logo đối tác ${index + 1}`;
  }
}

/** Parse only the public partner carousel rendered from the same ACF repeater. */
function parseLegacyPartnerLogos(html: string): PartnerLogo[] {
  const marker = html.search(/<div\b[^>]*class=["'][^"']*\bpartner-slider\b[^"']*["'][^>]*>/i);
  if (marker < 0) return [];

  const scriptStart = html.indexOf('<script', marker);
  const segment = html.slice(marker, scriptStart > marker ? scriptStart : marker + 150_000);
  const itemPattern = /<div\b[^>]*class=["'][^"']*\blogo-slide\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  const result: PartnerLogo[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(segment)) !== null && result.length < 200) {
    const imageTag = match[1].match(/<img\b[^>]*>/i)?.[0] ?? '';
    const anchorTag = match[1].match(/<a\b[^>]*>/i)?.[0] ?? '';
    const rawImageUrl = htmlAttribute(imageTag, 'src');
    if (!isHttpUrl(rawImageUrl)) continue;

    const imageUrl = new URL(rawImageUrl).toString();
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);

    const rawTitle = htmlAttribute(imageTag, 'alt').trim();
    const rawLink = htmlAttribute(anchorTag, 'href');
    result.push({
      id: `legacy-${result.length}-${imageUrl}`,
      title: rawTitle || titleFromImageUrl(imageUrl, result.length),
      imageUrl,
      linkUrl: isHttpUrl(rawLink) ? rawLink.trim() : null,
    });
  }

  return result;
}

async function fetchPartnerLogoApi(locale: Locale): Promise<PartnerLogo[]> {
  const paths = [
    '/wp-json/headless/v1/partner-logos',
    '/wp-json/tlu/v1/partner-logos',
  ];

  const candidates = await Promise.all(paths.map(async (path) => {
    const url = new URL(path, WP_SITE_URL);
    url.searchParams.set('lang', locale);
    const payload = await wpFetchUrl<PartnerLogosResponse>(
      url.toString(),
      REVALIDATE_POSTS,
    ).catch(() => null);
    const rows = payload?.items ?? payload?.data?.items ?? [];
    return rows.map(normalizeRow).filter((item): item is PartnerLogo => item !== null);
  }));

  return candidates.find((items) => items.length > 0) ?? [];
}

async function fetchLegacyPartnerLogos(locale: Locale): Promise<PartnerLogo[]> {
  const url = new URL(locale === 'en' ? '/en/' : '/', WP_SITE_URL);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html' },
      next: { revalidate: REVALIDATE_POSTS, tags: ['partner-logos'] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    return parseLegacyPartnerLogos(await response.text());
  } catch {
    return [];
  }
}

/**
 * Đọc endpoint công khai tối thiểu dành riêng cho logo đối tác.
 * Endpoint chỉ nên trả `logo_cong_ty` và `link_doi_tac`, không trả toàn bộ ACF Options.
 */
const getCachedPartnerLogos = unstable_cache(async (locale: Locale): Promise<PartnerLogo[]> => {
  // Run the temporary HTML fallback concurrently so a missing/slow custom
  // endpoint cannot consume the homepage's entire optional-data timeout.
  const [apiLogos, legacyLogos] = await Promise.all([
    fetchPartnerLogoApi(locale),
    fetchLegacyPartnerLogos(locale),
  ]);
  if (apiLogos.length > 0) return apiLogos;

  // Transitional fallback: production may render the ACF repeater in the old
  // template before the dedicated Headless API endpoint has been deployed.
  return legacyLogos;
}, ['homepage-partner-logos-v2'], {
  revalidate: REVALIDATE_POSTS,
  tags: ['partner-logos'],
});

export async function getPartnerLogos(locale: Locale): Promise<PartnerLogo[]> {
  return getCachedPartnerLogos(locale);
}
