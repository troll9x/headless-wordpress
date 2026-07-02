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
