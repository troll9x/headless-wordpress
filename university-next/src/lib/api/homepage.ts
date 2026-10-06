import { getPostSummaries } from '@/lib/wordpress/posts';
import { getPagesBySlugs } from '@/lib/wordpress/pages';
import { getCategoriesBySlugs, getCategoryTreeIds } from '@/lib/wordpress/categories';
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
  includeChildren = false,
): Promise<WPPost[]> {
  const categories = await getCategoriesBySlugs(slugs, locale).catch(() => []);
  for (const cat of categories) {
    const categoryIds = includeChildren
      ? await getCategoryTreeIds(cat.id, locale)
      : [cat.id];
    const posts = await getPostSummaries({
      categories: categoryIds,
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
  const pages = await getPagesBySlugs(slugs, locale).catch(() => []);
  return pages[0] ?? null;
}
