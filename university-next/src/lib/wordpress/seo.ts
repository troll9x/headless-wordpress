import { WP_API_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { HeadlessSeoData } from '@/types/seo';
import type { WPPost, WPPage } from '@/types/wordpress';

interface WpSeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
}

/**
 * Attempts to extract SEO meta from WordPress post/page objects.
 *
 * Supports:
 * - Yoast SEO: `yoast_head_json` REST field (requires Yoast SEO plugin)
 * - RankMath: `rank_math_title` / `rank_math_description` REST fields
 *
 * Returns an empty object when neither plugin is active.
 */
export function extractWpSeoMeta(post: WPPost | WPPage): WpSeoMeta {
  const raw = post as unknown as Record<string, unknown>;

  const yoast = raw['yoast_head_json'] as Record<string, unknown> | undefined;
  if (yoast) {
    return {
      title: yoast['title'] as string | undefined,
      description: (yoast['og_description'] ?? yoast['description']) as string | undefined,
      ogImage: (yoast['og_image'] as Array<{ url: string }> | undefined)?.[0]?.url,
    };
  }

  const rmTitle = raw['rank_math_title'] as string | undefined;
  const rmDesc = raw['rank_math_description'] as string | undefined;
  const rmImage = raw['rank_math_facebook_image'] as string | undefined;
  if (rmTitle ?? rmDesc) {
    return { title: rmTitle, description: rmDesc, ogImage: rmImage };
  }

  return {};
}

const SEO_TIMEOUT_MS = 4_000;
const HOME_SEO_TIMEOUT_MS = 1_500;

function isHeadlessSeoData(value: unknown): value is HeadlessSeoData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HeadlessSeoData>;
  return typeof candidate.id === 'number' && typeof candidate.slug === 'string';
}

interface HomeSeoPayload {
  vi?: { title?: unknown; description?: unknown };
  en?: { title?: unknown; description?: unknown };
}

export interface HeadlessHomeSeoOverride {
  title?: string;
  description?: string;
}

/** Đọc cấu hình SEO trang chủ do biên tập viên nhập trong ACF Options Page. */
export async function getHeadlessHomeSeo(
  lang: 'vi' | 'en',
): Promise<HeadlessHomeSeoOverride | null> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/home-seo');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_POSTS,
        tags: [CACHE_TAGS.POSTS, `seo-home-${lang}`],
      },
      signal: AbortSignal.timeout(HOME_SEO_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') return null;

    const localized = (payload as HomeSeoPayload)[lang];
    if (!localized || typeof localized !== 'object') return null;

    const title = typeof localized.title === 'string' ? localized.title.trim() : '';
    const description = typeof localized.description === 'string'
      ? localized.description.trim()
      : '';
    if (!title && !description) return null;

    return { title, description };
  } catch {
    return null;
  }
}

/** Các trường ACF đã nhập sẽ ưu tiên hơn trường tương ứng của Rank Math. */
export function mergeHomeSeoOverride(
  rankMathSeo: HeadlessSeoData | null,
  homeSeo: HeadlessHomeSeoOverride | null,
): Partial<HeadlessSeoData> | null {
  if (!homeSeo) return rankMathSeo;

  const title = homeSeo.title || rankMathSeo?.title;
  const description = homeSeo.description || rankMathSeo?.description;

  return {
    ...rankMathSeo,
    source: homeSeo.title ? 'acf' : rankMathSeo?.source,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(rankMathSeo?.open_graph || homeSeo.title || homeSeo.description
      ? {
          open_graph: {
            ...rankMathSeo?.open_graph,
            ...(homeSeo.title ? { title: homeSeo.title } : {}),
            ...(homeSeo.description ? { description: homeSeo.description } : {}),
          },
        }
      : {}),
    ...(rankMathSeo?.twitter || homeSeo.title || homeSeo.description
      ? {
          twitter: {
            ...rankMathSeo?.twitter,
            ...(homeSeo.title ? { title: homeSeo.title } : {}),
            ...(homeSeo.description ? { description: homeSeo.description } : {}),
          },
        }
      : {}),
  };
}

/**
 * Gets the normalized Rank Math metadata for a public WordPress object.
 *
 * A short timeout keeps SEO enrichment from making the page unavailable when
 * WordPress is temporarily slow. Callers retain their route-level fallbacks.
 */
export async function getHeadlessSeoById(
  id: number,
  lang: 'vi' | 'en',
): Promise<HeadlessSeoData | null> {
  if (!Number.isInteger(id) || id <= 0) return null;

  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/seo', {
    id,
    lang,
  });

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_POSTS,
        tags: [CACHE_TAGS.POSTS, `seo-${id}-${lang}`],
      },
      signal: AbortSignal.timeout(SEO_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    return isHeadlessSeoData(payload) ? payload : null;
  } catch {
    return null;
  }
}
