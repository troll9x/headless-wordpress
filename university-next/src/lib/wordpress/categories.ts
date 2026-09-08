import { unstable_cache } from 'next/cache';
import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_CATEGORIES } from '@/constants/api';
import { WP_SITE_URL } from '@/config/env/server';
import { stripHtml } from '@/lib/utils/html';
import { coalesce } from '@/lib/utils/coalesce';
import type { Locale } from '@/types/ngon-ngu';
import type {
  CategoryBannerData,
  CategorySidebarData,
  CategorySidebarItem,
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

async function getHeadlessCategoryTerm(
  slug: string,
  locale: Locale,
): Promise<HeadlessCategoryTerm | null> {
  const url = new URL(`/wp-json/headless/v1/term/category/${encodeURIComponent(slug)}`, WP_SITE_URL);
  url.searchParams.set('lang', locale);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '1');

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

async function getChildCategories(parentId: number, locale: Locale): Promise<WPCategory[]> {
  try {
    const categories = await wpFetch<WPCategory[]>(ENDPOINT, {
      params: {
        parent: parentId,
        per_page: 100,
        hide_empty: false,
        orderby: 'name',
        order: 'asc',
        lang: locale,
      },
      revalidate: REVALIDATE_CATEGORIES,
      tags: [CACHE_TAGS.CATEGORIES, `category-children-${parentId}-${locale}`],
    });
    return categories.map(normalizeCategory);
  } catch {
    return [];
  }
}

/** Lấy ID chuyên mục gốc cùng toàn bộ chuyên mục con ở mọi cấp. */
async function buildCategoryTreeIds(
  rootId: number,
  locale: Locale = 'vi',
): Promise<number[]> {
  const categoryIds = new Set<number>([rootId]);
  let parentIds = [rootId];

  while (parentIds.length > 0) {
    const childGroups = await Promise.all(
      parentIds.map((parentId) => getChildCategories(parentId, locale)),
    );
    const nextParentIds: number[] = [];

    for (const child of childGroups.flat()) {
      if (categoryIds.has(child.id)) continue;
      categoryIds.add(child.id);
      nextParentIds.push(child.id);
    }

    parentIds = nextParentIds;
  }

  return [...categoryIds];
}

const getCachedCategoryTreeIds = unstable_cache(
  buildCategoryTreeIds,
  ['wordpress-category-tree-ids-v1'],
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

function normalizeSidebarItem(item: CategorySidebarItem): CategorySidebarItem {
  if (item.type === 'term') {
    return {
      ...item,
      name: stripHtml(item.name),
      children: item.children.map(normalizeSidebarItem),
    };
  }

  return {
    ...item,
    label: stripHtml(item.label),
    children: item.children.map(normalizeSidebarItem),
  };
}

function normalizeSidebarData(data: CategorySidebarData): CategorySidebarData {
  return {
    ...data,
    root: { ...data.root, name: stripHtml(data.root.name) },
    items: data.items.map(normalizeSidebarItem),
  };
}

async function getFallbackCategorySidebar(
  params: CategorySidebarParams,
  locale: Locale,
): Promise<CategorySidebarData | null> {
  const current = await resolveSidebarCategory(params, locale);
  if (!current) return null;

  let root = current;
  const visited = new Set<number>();
  while (root.parent > 0 && !visited.has(root.parent)) {
    visited.add(root.id);
    const parent = await getCategoryById(root.parent, locale);
    if (!parent) break;
    root = parent;
  }

  const firstLevel = await getChildCategories(root.id, locale);
  const items = await Promise.all(
    firstLevel.map(async (category) => {
      const children = await getChildCategories(category.id, locale);
      return toSidebarTerm(category, children.map((child) => toSidebarTerm(child, [])));
    }),
  );

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
 * Fetch the configured Auto Category Widget tree from the companion REST route.
 * Returns null while the WordPress Code Snippet endpoint is not installed.
 */
export async function getCategorySidebar(
  params: CategorySidebarParams,
  locale: Locale = 'vi',
): Promise<CategorySidebarData | null> {
  const url = new URL('/wp-json/acw/v1/sidebar', WP_SITE_URL);
  url.searchParams.set('lang', locale);
  if (params.postId) url.searchParams.set('post_id', String(params.postId));
  if (params.categoryId) url.searchParams.set('category_id', String(params.categoryId));
  if (params.categorySlug) url.searchParams.set('category_slug', params.categorySlug);

  try {
    const data = await coalesce(`category-sidebar:${url.toString()}`, async () => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: {
          revalidate: REVALIDATE_CATEGORIES,
          tags: [CACHE_TAGS.CATEGORIES, `category-sidebar-${locale}`],
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) return null;
      return (await response.json()) as CategorySidebarData;
    });

    if (data?.root && Array.isArray(data.items)) return normalizeSidebarData(data);
  } catch {
    // Fall through to the core taxonomy fallback below.
  }

  return getFallbackCategorySidebar(params, locale);
}
