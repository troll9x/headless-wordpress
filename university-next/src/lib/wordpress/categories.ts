import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_CATEGORIES } from '@/constants/api';
import type { WPCategory } from '@/types/wordpress';

const ENDPOINT = '/categories';

/** Fetch a category by slug. Category slugs are locale-independent. */
export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const categories = await wpFetch<WPCategory[]>(ENDPOINT, {
    params: { slug },
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  });
  return categories[0] ?? null;
}
