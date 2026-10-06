import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import type { WPPage } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';

const ENDPOINT = '/pages';

/** Fetch a page by slug with locale-specific content via Polylang. */
export async function getPageBySlug(
  slug: string,
  locale: Locale = 'vi',
): Promise<WPPage | null> {
  const pages = await wpFetch<WPPage[]>(ENDPOINT, {
    params: { slug, _embed: 1, lang: locale },
    revalidate: REVALIDATE_PAGES,
    tags: [CACHE_TAGS.PAGES],
  });
  return pages[0] ?? null;
}

/** Fetch fallback page slugs in one REST request, preserving caller priority. */
export async function getPagesBySlugs(
  slugs: readonly string[],
  locale: Locale = 'vi',
): Promise<WPPage[]> {
  if (slugs.length === 0) return [];

  const pages = await wpFetch<WPPage[]>(ENDPOINT, {
    params: { slug: [...slugs], _embed: 1, lang: locale, per_page: 100 },
    revalidate: REVALIDATE_PAGES,
    tags: [CACHE_TAGS.PAGES],
  });
  const bySlug = new Map<string, WPPage>(
    pages.map((page): [string, WPPage] => [page.slug, page]),
  );

  return slugs.flatMap((slug) => {
    const page = bySlug.get(slug);
    return page ? [page] : [];
  });
}

/** Fetch a page by ID. */
export async function getPageById(
  id: number,
  locale: Locale = 'vi',
): Promise<WPPage | null> {
  try {
    return await wpFetch<WPPage>(`${ENDPOINT}/${id}`, {
      params: { _embed: 1, lang: locale },
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES],
    });
  } catch {
    return null;
  }
}
