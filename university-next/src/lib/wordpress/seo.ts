import { WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
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

function isHeadlessSeoData(value: unknown): value is HeadlessSeoData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HeadlessSeoData>;
  return typeof candidate.id === 'number' && typeof candidate.slug === 'string';
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

  const url = new URL('/wp-json/headless/v1/seo', WP_SITE_URL);
  url.searchParams.set('id', String(id));
  url.searchParams.set('lang', lang);

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
