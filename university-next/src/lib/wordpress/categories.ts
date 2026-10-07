import { unstable_cache } from 'next/cache';
import { wpFetch, wpFetchCollection } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_CATEGORIES } from '@/constants/api';
import { WP_API_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import { stripHtml } from '@/lib/utils/html';
import { coalesce } from '@/lib/utils/coalesce';
import type { Locale } from '@/types/ngon-ngu';
import type {
  CategoryBannerData,
  CategorySidebarData,
  CategorySidebarTermItem,
  WPCategory,
  WPPost,
} from '@/types/wordpress';

const ENDPOINT = '/categories';

const FULL_WIDTH_CATEGORY_SLUGS = new Set([
  'tuyen-sinh',
  'admission',
  'admissions',
  'dao-tao',
  'education',
  'dai-hoc-chinh-quy',
  'thac-si',
]);

const LANDING_CATEGORY_SLUGS = new Set(['tuyen-sinh', 'admission', 'admissions', 'dao-tao', 'education']);

interface HeadlessCategoryImage {
  url?: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
}

interface HeadlessCategoryTerm {
  id: number;
  slug: string;
  name: string;
  children_count?: number;
  parent?: HeadlessCategoryTerm | number | null;
  ancestors?: HeadlessCategoryTerm[];
  acf?: {
    banner_tin_tuc?: HeadlessCategoryImage | string | null;
  } | [];
}

export function categoryUsesFullWidthLayout(categorySlug: string): boolean {
  return FULL_WIDTH_CATEGORY_SLUGS.has(categorySlug);
}

export function categoryUsesLandingLayout(categorySlug: string): boolean {
  return LANDING_CATEGORY_SLUGS.has(categorySlug);
}

function normalizeCategory(category: WPCategory): WPCategory {
  return {
    ...category,
    name: stripHtml(category.name),
    description: stripHtml(category.description),
  };
}

/** Fetch a category by slug, filtered by Polylang locale when available. */
export async function getCategoryBySlug(
  slug: string,
  locale: Locale = 'vi',
): Promise<WPCategory | null> {
  const categories = await wpFetch<WPCategory[]>(ENDPOINT, {
    params: { slug, lang: locale },
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES, `category-${slug}-${locale}`],
  });
  return categories[0] ? normalizeCategory(categories[0]) : null;
}

/** Fetch fallback category slugs in one REST request, preserving caller priority. */
export async function getCategoriesBySlugs(
  slugs: readonly string[],
  locale: Locale = 'vi',
): Promise<WPCategory[]> {
  if (slugs.length === 0) return [];

  const categories = await wpFetch<WPCategory[]>(ENDPOINT, {
    params: { slug: [...slugs], lang: locale, per_page: 100 },
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES, ...slugs.map((slug) => `category-${slug}-${locale}`)],
  });
  const bySlug = new Map<string, WPCategory>(
    categories.map((category): [string, WPCategory] => [category.slug, normalizeCategory(category)]),
  );

  return slugs.flatMap((slug) => {
    const category = bySlug.get(slug);
    return category ? [category] : [];
  });
}

async function getHeadlessCategoryTerm(
  slug: string,
  locale: Locale,
): Promise<HeadlessCategoryTerm | null> {
  const url = buildWordPressRestUrl(
    WP_API_URL,
    `/headless/v1/term/category/${encodeURIComponent(slug)}`,
    { lang: locale, page: 1, per_page: 1 },
  );

  try {
    return await coalesce(`category-term:${url.toString()}`, async () => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: {
          revalidate: REVALIDATE_CATEGORIES,
          tags: [CACHE_TAGS.CATEGORIES, `category-term-${slug}-${locale}`],
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) return null;
      return (await response.json()) as HeadlessCategoryTerm;
    });
  } catch {
    return null;
  }
}

function getTermBanner(term: HeadlessCategoryTerm | null): HeadlessCategoryImage | string | null {
  if (!term) return null;

  if (term.acf && !Array.isArray(term.acf)) {
    const banner = term.acf.banner_tin_tuc;
    if (typeof banner === 'string' ? Boolean(banner) : Boolean(banner?.url)) return banner ?? null;
  }

  if (term.parent && typeof term.parent === 'object') {
    const parentBanner = getTermBanner(term.parent);
    if (parentBanner) return parentBanner;
  }

  for (const ancestor of term.ancestors ?? []) {
    const ancestorBanner = getTermBanner(ancestor);
    if (ancestorBanner) return ancestorBanner;
  }

  return null;
}

function toCategoryBanner(
  term: Pick<HeadlessCategoryTerm, 'id' | 'slug' | 'name'>,
  banner: HeadlessCategoryImage | string,
): CategoryBannerData {
  const imageUrl = typeof banner === 'string' ? banner : banner.url ?? '';

  return {
    categoryId: term.id,
    categorySlug: term.slug,
    categoryName: term.name,
    imageUrl,
    imageAlt: typeof banner === 'string' ? term.name : banner.alt || term.name,
    width: typeof banner === 'string' ? 2560 : banner.width || 2560,
    height: typeof banner === 'string' ? 551 : banner.height || 551,
  };
}

/** Resolve a category's ACF banner, inheriting the nearest configured ancestor. */
export async function getCategoryBanner(
  category: WPCategory,
  locale: Locale,
): Promise<CategoryBannerData | null> {
  const term = await getHeadlessCategoryTerm(category.slug, locale);
  const banner = getTermBanner(term);
  return term && banner ? toCategoryBanner(term, banner) : null;
}

/** Reproduces the Flatsome single-post rule: use the first leaf category banner. */
export async function getPostCategoryBanner(
  post: WPPost,
  locale: Locale,
): Promise<CategoryBannerData | null> {
  const categories = (post._embedded?.['wp:term'] ?? [])
    .flat()
    .filter((term): term is WPCategory => !('code' in term) && term.taxonomy === 'category');

  if (categories.length === 0) return null;

  const resolvedTerms = await Promise.all(
    categories.map((category) => getHeadlessCategoryTerm(category.slug, locale)),
  );
  const leafTerm = resolvedTerms.find((term) => term?.children_count === 0)
    ?? resolvedTerms.find(Boolean)
    ?? null;

  if (!leafTerm) return null;

  const banner = getTermBanner(leafTerm);
  return banner ? toCategoryBanner(leafTerm, banner) : null;
}

interface CategorySidebarParams {
  postId?: number;
  categoryId?: number;
  categorySlug?: string;
}

async function getCategoryById(id: number, locale: Locale): Promise<WPCategory | null> {
  try {
    const category = await wpFetch<WPCategory>(`${ENDPOINT}/${id}`, {
      params: { lang: locale },
      revalidate: REVALIDATE_CATEGORIES,
      tags: [CACHE_TAGS.CATEGORIES, `category-${id}-${locale}`],
    });
    return normalizeCategory(category);
  } catch {
    return null;
  }
}

async function resolveSidebarCategory(
  params: CategorySidebarParams,
  locale: Locale,
): Promise<WPCategory | null> {
  if (params.categoryId) return getCategoryById(params.categoryId, locale);
  if (params.categorySlug) return getCategoryBySlug(params.categorySlug, locale).catch(() => null);

  if (params.postId) {
    try {
      const post = await wpFetch<Pick<WPPost, 'categories'>>(`/posts/${params.postId}`, {
        params: { lang: locale },
        revalidate: REVALIDATE_CATEGORIES,
        tags: [CACHE_TAGS.CATEGORIES, `post-categories-${params.postId}-${locale}`],
      });
      return post.categories[0] ? getCategoryById(post.categories[0], locale) : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function fetchAllCategories(locale: Locale): Promise<WPCategory[]> {
  const params = {
    per_page: 100,
    hide_empty: false,
    orderby: 'name',
    order: 'asc',
    lang: locale,
  } as const;
  const cacheOptions = {
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES, `categories-all-${locale}`],
  };
  const firstPage = await wpFetchCollection<WPCategory[]>(ENDPOINT, {
    params: { ...params, page: 1 },
    ...cacheOptions,
  });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      wpFetch<WPCategory[]>(ENDPOINT, {
        params: { ...params, page: index + 2 },
        ...cacheOptions,
      }),
    ),
  );

  return [firstPage.data, ...remainingPages].flat().map(normalizeCategory);
}

const getCachedAllCategories = unstable_cache(
  fetchAllCategories,
  ['wordpress-all-categories-v1'],
  {
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  },
);

/** Lấy ID chuyên mục gốc cùng toàn bộ chuyên mục con ở mọi cấp. */
async function buildCategoryTreeIds(
  rootId: number,
  locale: Locale = 'vi',
): Promise<number[]> {
  const allCategories = await fetchAllCategories(locale);
  const childrenByParent = new Map<number, WPCategory[]>();

  for (const category of allCategories) {
    const siblings = childrenByParent.get(category.parent) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parent, siblings);
  }

  const categoryIds = new Set<number>([rootId]);
  let parentIds = [rootId];

  while (parentIds.length > 0) {
    const nextParentIds: number[] = [];

    for (const parentId of parentIds) {
      for (const child of childrenByParent.get(parentId) ?? []) {
        if (categoryIds.has(child.id)) continue;
        categoryIds.add(child.id);
        nextParentIds.push(child.id);
      }
    }

    parentIds = nextParentIds;
  }

  return [...categoryIds];
}

const getCachedCategoryTreeIds = unstable_cache(
  buildCategoryTreeIds,
  // Bump the key whenever tree-building semantics change. Older versions may
  // contain incomplete trees produced while WordPress was temporarily slow.
  ['wordpress-category-tree-ids-v3'],
  {
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  },
);

/** Cache the complete taxonomy tree because many archive routes share parents. */
export async function getCategoryTreeIds(
  rootId: number,
  locale: Locale = 'vi',
): Promise<number[]> {
  return getCachedCategoryTreeIds(rootId, locale);
}

function toSidebarTerm(category: WPCategory, children: CategorySidebarTermItem[]): CategorySidebarTermItem {
  return {
    type: 'term',
    id: category.id,
    parent: category.parent,
    name: category.name,
    slug: category.slug,
    url: category.link,
    children,
  };
}

async function getFallbackCategorySidebar(
  params: CategorySidebarParams,
  locale: Locale,
): Promise<CategorySidebarData | null> {
  const allCategories = await getCachedAllCategories(locale).catch(() => []);
  const categoriesById = new Map(allCategories.map((category) => [category.id, category]));
  const current = params.categoryId
    ? categoriesById.get(params.categoryId) ?? null
    : params.categorySlug
      ? allCategories.find((category) => category.slug === params.categorySlug) ?? null
      : await resolveSidebarCategory(params, locale);
  if (!current) return null;

  let root = current;
  const visited = new Set<number>();
  while (root.parent > 0 && !visited.has(root.parent)) {
    visited.add(root.id);
    const parent = categoriesById.get(root.parent);
    if (!parent) break;
    root = parent;
  }

  const firstLevel = allCategories.filter((category) => category.parent === root.id);
  const items = firstLevel.map((category) => {
    const children = allCategories.filter((child) => child.parent === category.id);
    return toSidebarTerm(category, children.map((child) => toSidebarTerm(child, [])));
  });

  return {
    root: {
      id: root.id,
      name: root.name,
      slug: root.slug,
      url: root.link,
    },
    items,
  };
}

/**
 * Build the sidebar from the cached WordPress taxonomy. The optional ACW route
 * is not registered on the current CMS and its per-post 404 added a blocking
 * network request before this same fallback could be returned.
 */
export async function getCategorySidebar(
  params: CategorySidebarParams,
  locale: Locale = 'vi',
): Promise<CategorySidebarData | null> {
  return getFallbackCategorySidebar(params, locale);
}
