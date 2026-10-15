export interface HeadlessSearchItem {
  id: number;
  title: string;
  url: string;
  type: string;
  excerpt: string;
  thumb: string;
}

export interface HeadlessSearchResult {
  items: HeadlessSearchItem[];
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function parseHeadlessSearchResponse(
  payload: unknown,
  locale: 'vi' | 'en',
  page: number,
  perPage: number,
  siteUrl: string,
): HeadlessSearchResult {
  if (!payload || typeof payload !== 'object') throw new Error('CMS search returned an invalid response.');
  const data = payload as Record<string, unknown>;
  const total = data.total;
  const totalPages = data.total_pages;
  if (!Array.isArray(data.items) || !Number.isSafeInteger(total) || !Number.isSafeInteger(totalPages)
    || (total as number) < 0 || (totalPages as number) !== Math.ceil((total as number) / perPage)
    || data.page !== page || (data.per !== perPage && data.per_page !== perPage)
    || data.items.length > perPage) {
    throw new Error('CMS search omitted valid language-scoped pagination metadata.');
  }
  const items = data.items.map((raw): HeadlessSearchItem => {
    if (!raw || typeof raw !== 'object') throw new Error('CMS search returned an invalid item.');
    const item = raw as Record<string, unknown>;
    if (!Number.isSafeInteger(item.id) || (item.id as number) <= 0
      || typeof item.title !== 'string' || !item.title.trim()
      || item.type !== 'post' || item.language !== locale
      || typeof item.url !== 'string' || !item.url
      || typeof item.excerpt !== 'string' || typeof item.thumb !== 'string') {
      throw new Error('CMS search returned an invalid or wrong-language item.');
    }
    const url = new URL(item.url, siteUrl);
    if (url.origin !== new URL(siteUrl).origin) throw new Error('CMS search returned an off-site URL.');
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (path.startsWith('/en/') !== (locale === 'en')) throw new Error('CMS search returned a wrong-language URL.');
    return { id: item.id as number, title: item.title, url: path, type: item.type,
      excerpt: item.excerpt, thumb: item.thumb };
  });
  if (items.length === 0 && (total as number) > 0 && page <= (totalPages as number)) {
    throw new Error('CMS search returned an incomplete result page.');
  }
  return { items, total: total as number, totalPages: totalPages as number, hasMore: page < (totalPages as number) };
}
