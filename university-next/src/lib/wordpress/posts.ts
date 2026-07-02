import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import type { WPPost } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';

const ENDPOINT = '/posts';

/** Locale-aware post list. Passes lang={locale} for Polylang. */
export async function getPosts(
  params: Record<string, unknown> = {},
  locale: Locale = 'vi',
): Promise<WPPost[]> {
  return wpFetch<WPPost[]>(ENDPOINT, {
    params: { _embed: 1, lang: locale, ...params },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS],
  });
}

/** Fetch a single post by slug with locale-specific content via Polylang. */
export async function getPostBySlug(
  slug: string,
  locale: Locale = 'vi',
): Promise<WPPost | null> {
  const posts = await wpFetch<WPPost[]>(ENDPOINT, {
    params: { slug, _embed: 1, lang: locale },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS, `post-${slug}-${locale}`],
  });
  return posts[0] ?? null;
}

/** Fetch a single post by ID. */
export async function getPostById(
  id: number,
  locale: Locale = 'vi',
): Promise<WPPost | null> {
  try {
    return await wpFetch<WPPost>(`${ENDPOINT}/${id}`, {
      params: { _embed: 1, lang: locale },
      revalidate: REVALIDATE_POSTS,
      tags: [CACHE_TAGS.POSTS],
    });
  } catch {
    return null;
  }
}
