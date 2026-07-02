import { getPosts } from '@/lib/wordpress/posts';
import { getPageBySlug } from '@/lib/wordpress/pages';
import { getCategoryBySlug } from '@/lib/wordpress/categories';
import type { WPPost, WPPage } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';

/**
 * Tries each slug in order, returning the posts from the first category found
 * that actually has content. Passes lang={locale} for Polylang.
 */
export async function getPostsByCategories(
  slugs: readonly string[],
  perPage: number,
  locale: Locale = 'vi',
): Promise<WPPost[]> {
  for (const slug of slugs) {
    const cat = await getCategoryBySlug(slug).catch(() => null);
    if (!cat) continue;
    const posts = await getPosts({
      categories: cat.id,
      per_page: perPage,
      orderby: 'date',
      order: 'desc',
    }, locale).catch(() => [] as WPPost[]);
    if (posts.length > 0) return posts;
  }
  return [];
}

/**
 * Tries each slug in order, returning the first WordPress page found.
 * Passes lang={locale} for Polylang to return the translated page.
 */
export async function getFirstPageBySlug(
  slugs: readonly string[],
  locale: Locale = 'vi',
): Promise<WPPage | null> {
  for (const slug of slugs) {
    const page = await getPageBySlug(slug, locale).catch(() => null);
    if (page) return page;
  }
  return null;
}
