import { searchHeadlessSite } from '@/lib/wordpress/headless-search';
import type { Locale } from '@/types/ngon-ngu';

export interface SiteSearchItem {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
}

export interface SiteSearchPage {
  items: SiteSearchItem[];
  total: number;
  totalPages: number;
}

export async function searchSite(
  query: string,
  locale: Locale,
  page = 1,
  perPage = 10,
): Promise<SiteSearchPage> {
  const cleanQuery = query.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!cleanQuery) return { items: [], total: 0, totalPages: 0 };

  const result = await searchHeadlessSite(cleanQuery, locale, page, perPage);

  return {
    items: result.items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      type: item.type,
      subtype: item.type === 'page' ? 'page' : 'post',
    })),
    total: result.items.length,
    totalPages: result.hasMore ? page + 1 : page,
  };
}
