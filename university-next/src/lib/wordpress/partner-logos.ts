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
  logo_cong_ty?: NormalizedImage | string | null;
  link_doi_tac?: string | null;
}

interface PartnerLogosResponse {
  items?: PartnerLogoRow[];
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
  const imageUrl = typeof image === 'string' ? image : image?.url;
  if (!isHttpUrl(imageUrl)) return null;

  const title = typeof image === 'object' && image
    ? image.alt?.trim() || image.title?.trim() || `Logo đối tác ${index + 1}`
    : `Logo đối tác ${index + 1}`;

  return {
    id: String(typeof image === 'object' && image?.id ? image.id : `${index}-${imageUrl}`),
    title,
    imageUrl,
    linkUrl: isHttpUrl(row.link_doi_tac) ? row.link_doi_tac.trim() : null,
  };
}

/**
 * Đọc endpoint công khai tối thiểu dành riêng cho logo đối tác.
 * Endpoint chỉ nên trả `logo_cong_ty` và `link_doi_tac`, không trả toàn bộ ACF Options.
 */
const getCachedPartnerLogos = unstable_cache(async (locale: Locale): Promise<PartnerLogo[]> => {
  const url = new URL('/wp-json/tlu/v1/partner-logos', WP_SITE_URL);
  url.searchParams.set('lang', locale);

  const payload = await wpFetchUrl<PartnerLogosResponse>(
    url.toString(),
    REVALIDATE_POSTS,
  ).catch(() => null);

  return (payload?.items ?? [])
    .map(normalizeRow)
    .filter((item): item is PartnerLogo => item !== null);
}, ['homepage-partner-logos'], {
  revalidate: REVALIDATE_POSTS,
  tags: ['partner-logos'],
});

export async function getPartnerLogos(locale: Locale): Promise<PartnerLogo[]> {
  return getCachedPartnerLogos(locale);
}
