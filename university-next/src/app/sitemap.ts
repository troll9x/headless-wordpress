import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';
import { WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS } from '@/config/env/constants';
import { wpFetchCollection } from '@/lib/wordpress/client';
import { buildCategoryUrl } from '@/constants/duong-dan';

type Entry = MetadataRoute.Sitemap[number];

interface PublicItem {
  link?: string;
  canonical_path?: string;
  modified?: string;
  status?: string;
  slug?: string;
}

function categoryEntry(item: PublicItem): Entry | null {
  const entry = publicEntry(item);
  if (!entry || !item.slug) return null;
  const locale = new URL(item.link!).pathname.startsWith('/en/') ? 'en' : 'vi';
  return {
    ...entry,
    url: `${baseUrl}${buildCategoryUrl(encodeURIComponent(item.slug), locale)}`,
  };
}

interface DocumentTerm {
  id: number;
  slug: string;
  parent: number;
}

const baseUrl = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
const wpOrigin = new URL(WP_SITE_URL).origin;
const PAGE_SIZE = 100;

const STATIC_PATHS = [
  '/', '/en', '/su-mang-muc-tieu-chien-luoc',
  '/en/mission-goals-strategy', '/co-cau-to-chuc',
  '/en/organizational-structure', '/media', '/en/media',
  '/van-ban-tai-lieu',
];

function publicEntry(item: PublicItem): Entry | null {
  if (!item.link || (item.status && item.status !== 'publish')) return null;
  try {
    const source = new URL(item.link);
    if (source.origin !== wpOrigin || source.search || source.hash) return null;
    const canonicalPath = item.canonical_path;
    const pathname = canonicalPath?.startsWith('/') && !canonicalPath.startsWith('//')
      ? canonicalPath.replace(/\/+$/, '') || '/'
      : source.pathname.replace(/\/+$/, '') || '/';
    if (pathname.startsWith('/wp-') || pathname.startsWith('/index.php')) return null;
    const modified = item.modified ? new Date(item.modified) : null;
    return {
      url: `${baseUrl}${pathname === '/' ? '/' : pathname}`,
      ...(modified && !Number.isNaN(modified.getTime()) ? { lastModified: modified } : {}),
    };
  } catch {
    return null;
  }
}

async function collection<T>(
  endpoint: string,
  maxPages: number,
  tag: string,
  params: Record<string, string | number | boolean>,
): Promise<T[]> {
  const fetchPage = (page: number) => wpFetchCollection<T[]>(endpoint, {
    params: { ...params, per_page: PAGE_SIZE, page },
    revalidate: 3_600,
    tags: [tag],
    timeoutMs: 15_000,
  }).catch((error: unknown) => {
    console.warn(`[sitemap] ${endpoint} page ${page} unavailable.`, error);
    return { data: [] as T[], totalPages: 0, total: 0 };
  });

  const first = await fetchPage(1);
  const pageCount = Math.min(maxPages, first.totalPages);
  if (pageCount <= 1) return first.data;
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)),
  );
  return [...first.data, ...rest.flatMap((page) => page.data)];
}

function documentTermPath(term: DocumentTerm, terms: Map<number, DocumentTerm>): string | null {
  const slugs = [term.slug];
  const visited = new Set<number>([term.id]);
  let parent = term.parent;
  while (parent > 0) {
    if (visited.has(parent)) return null;
    visited.add(parent);
    const ancestor = terms.get(parent);
    if (!ancestor) return null;
    slugs.unshift(ancestor.slug);
    parent = ancestor.parent;
  }
  if (slugs[0] !== 'van-ban-tai-lieu') return null;
  return `/${slugs.map(encodeURIComponent).join('/')}`;
}

const getDynamicEntries = unstable_cache(async (): Promise<Entry[]> => {
  // Bounded to the newest 1,000 posts; the other public content types are
  // small enough to include in full. This avoids flooding the CMS on a miss.
  const [posts, pages, categories, documents, members, terms] = await Promise.all([
    collection<PublicItem>('/posts', 10, CACHE_TAGS.POSTS, {
      status: 'publish', _fields: 'link,canonical_path,modified,status',
    }),
    collection<PublicItem>('/pages', 2, CACHE_TAGS.PAGES, {
      status: 'publish', _fields: 'link,modified,status',
    }),
    collection<PublicItem>('/categories', 5, CACHE_TAGS.CATEGORIES, {
      hide_empty: true, _fields: 'link,slug',
    }),
    collection<PublicItem>('/tai-lieu', 2, CACHE_TAGS.POSTS, {
      status: 'publish', _fields: 'link,modified,status',
    }),
    collection<PublicItem>('/to-chuc', 2, CACHE_TAGS.POSTS, {
      status: 'publish', _fields: 'link,modified,status',
    }),
    collection<DocumentTerm>('/loai-tai-lieu', 2, CACHE_TAGS.CATEGORIES, {
      hide_empty: false, _fields: 'id,slug,parent',
    }),
  ]);

  const result = [...posts, ...pages, ...documents, ...members]
    .flatMap((item) => publicEntry(item) ?? []);
  result.push(...categories.flatMap((item) => categoryEntry(item) ?? []));
  const termsById = new Map(terms.map((term) => [term.id, term]));
  for (const term of terms) {
    const path = documentTermPath(term, termsById);
    if (path) result.push({ url: `${baseUrl}${path}` });
  }
  return result;
}, ['public-sitemap-v2'], {
  revalidate: 900,
  tags: [CACHE_TAGS.POSTS, CACHE_TAGS.PAGES, CACHE_TAGS.CATEGORIES],
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Do not query WordPress during deployment builds.
  await connection();
  const entries = new Map<string, Entry>();
  for (const path of STATIC_PATHS) entries.set(`${baseUrl}${path}`, { url: `${baseUrl}${path}` });
  for (const entry of await getDynamicEntries()) entries.set(entry.url, entry);
  return [...entries.values()].sort((left, right) => left.url.localeCompare(right.url));
}
