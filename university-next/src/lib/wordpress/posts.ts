import { WP_SITE_URL } from '@/config/env/server';
import { wpFetch, wpFetchCollection, wpFetchUrl } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import type { WPPost } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';

const ENDPOINT = '/posts';

const POST_SUMMARY_FIELDS = [
  'id',
  'date',
  'date_gmt',
  'modified',
  'modified_gmt',
  'slug',
  'status',
  'type',
  'link',
  'title',
  'excerpt',
  'author',
  'featured_media',
  'sticky',
  'format',
  'categories',
  'tags',
  'meta',
  'acf',
  'post_priority_label',
  'post_priority_order',
  'post_priority_expire_date',
  '_priority_label',
  '_priority_order',
  '_priority_expire',
  '_links',
  '_embedded',
].join(',');

export interface PostsPage {
  posts: WPPost[];
  total: number;
  totalPages: number;
}

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

/** Lightweight post collection for cards/sliders; deliberately excludes full article content. */
export async function getPostSummaries(
  params: Record<string, unknown> = {},
  locale: Locale = 'vi',
): Promise<WPPost[]> {
  return wpFetch<WPPost[]>(ENDPOINT, {
    params: {
      _embed: 1,
      _fields: POST_SUMMARY_FIELDS,
      lang: locale,
      ...params,
    },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS, `post-summaries-${locale}`],
  });
}

/** Fetch a page of posts and retain the exact totals calculated by WP_Query. */
export async function getPostsPage(
  params: Record<string, unknown> = {},
  locale: Locale = 'vi',
): Promise<PostsPage> {
  const result = await wpFetchCollection<WPPost[]>(ENDPOINT, {
    params: { _embed: 1, lang: locale, ...params },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS],
  });

  return {
    posts: result.data,
    total: result.total,
    totalPages: result.totalPages,
  };
}

function normalizePermalinkPath(value: string): string {
  let pathname = value;

  try {
    pathname = new URL(value, WP_SITE_URL).pathname;
  } catch {
    // Treat the value as a pathname when it is not a valid absolute URL.
  }

  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the original pathname if it contains malformed percent encoding.
  }

  return pathname.replace(/^\/+|\/+$/g, '').toLocaleLowerCase('en-US');
}

/**
 * Resolve a public WordPress permalink to a post.
 *
 * The REST `slug` field is the database post_name and does not necessarily
 * match a Permalink Manager URI. TLU permalinks append `-{postId}`, so after a
 * normal slug lookup we resolve that ID and verify its canonical `post.link`.
 * The exact-path comparison prevents an arbitrary numeric suffix from serving
 * the wrong article.
 */
export async function getPostByPermalinkPath(
  path: string,
  locale: Locale = 'vi',
): Promise<WPPost | null> {
  const normalizedPath = normalizePermalinkPath(path);
  const requestedSlug = normalizedPath.split('/').at(-1) ?? '';
  if (!requestedSlug) return null;

  const directPost = await getPostBySlug(requestedSlug, locale).catch(() => null);
  if (directPost && normalizePermalinkPath(directPost.link) === normalizedPath) {
    return directPost;
  }

  const idMatch = requestedSlug.match(/-(\d+)$/);
  if (!idMatch) return null;

  const postId = Number.parseInt(idMatch[1], 10);
  if (!Number.isSafeInteger(postId) || postId <= 0) return null;

  const post = await getPostById(postId, locale);
  if (!post || post.type !== 'post') return null;

  return normalizePermalinkPath(post.link) === normalizedPath ? post : null;
}

interface HeadlessPostDetails {
  acf?: Record<string, unknown>;
}

export interface PostPageData {
  post: WPPost;
  relatedPosts: WPPost[];
  previousPost: WPPost | null;
  nextPost: WPPost | null;
}

export function postHasCategorySlug(post: WPPost, categorySlug: string): boolean {
  return (post._embedded?.['wp:term'] ?? [])
    .flat()
    .some((term) => !('code' in term) && term.taxonomy === 'category' && term.slug === categorySlug);
}

async function enrichPostWithHeadlessAcf(
  post: WPPost,
  locale: Locale,
): Promise<WPPost> {
  const url = new URL('/wp-json/headless/v1/page', WP_SITE_URL);
  url.searchParams.set('slug', post.slug);
  url.searchParams.set('post_type', 'post');
  url.searchParams.set('lang', locale);

  try {
    const details = await wpFetchUrl<HeadlessPostDetails>(url.toString(), REVALIDATE_POSTS);
    return details.acf ? { ...post, acf: details.acf } : post;
  } catch {
    return post;
  }
}

/**
 * Enrich archive summaries with ACF values from the custom Headless API.
 * Core /wp/v2 posts do not expose fields whose ACF group has show_in_rest disabled.
 * A failed detail request never makes the whole category archive unavailable.
 */
export async function enrichPostsWithHeadlessAcf(
  posts: WPPost[],
  locale: Locale = 'vi',
): Promise<WPPost[]> {
  return Promise.all(posts.map((post) => enrichPostWithHeadlessAcf(post, locale)));
}

/** Fetch related articles, same-category previous/next links and recruitment ACF. */
export async function getPostPageData(
  sourcePost: WPPost,
  locale: Locale = 'vi',
): Promise<PostPageData> {
  const categoryFilter = sourcePost.categories.length > 0
    ? { categories: sourcePost.categories }
    : {};
  const dateGmt = `${sourcePost.date_gmt.replace(/Z$/, '')}Z`;

  const relatedPromise = getPosts({
    ...categoryFilter,
    exclude: sourcePost.id,
    per_page: 8,
    orderby: 'date',
    order: 'desc',
  }, locale).catch(() => []);

  const previousPromise = getPosts({
    ...categoryFilter,
    exclude: sourcePost.id,
    before: dateGmt,
    per_page: 1,
    orderby: 'date',
    order: 'desc',
  }, locale).catch(() => []);

  const nextPromise = getPosts({
    ...categoryFilter,
    exclude: sourcePost.id,
    after: dateGmt,
    per_page: 1,
    orderby: 'date',
    order: 'asc',
  }, locale).catch(() => []);

  const detailPromise = postHasCategorySlug(sourcePost, 'thong-tin-tuyen-dung')
    ? enrichPostWithHeadlessAcf(sourcePost, locale)
    : Promise.resolve(sourcePost);

  const [post, relatedPosts, previousPosts, nextPosts] = await Promise.all([
    detailPromise,
    relatedPromise,
    previousPromise,
    nextPromise,
  ]);

  return {
    post,
    relatedPosts,
    previousPost: previousPosts[0] ?? null,
    nextPost: nextPosts[0] ?? null,
  };
}
