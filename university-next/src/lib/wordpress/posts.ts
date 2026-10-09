import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { wpFetch, wpFetchCollection, wpFetchUrl } from '@/lib/wordpress/client';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { WordPressApiError } from '@/lib/wordpress/errors';
import type { WPMedia, WPPost } from '@/types/wordpress';
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
  'canonical_path',
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
  return wpFetch<WPPost>(`${ENDPOINT}/${id}`, {
    params: { _embed: 1, lang: locale },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS],
  });
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

/** Lightweight archive fallback that avoids fetching full article bodies. */
export async function getPostSummariesPage(
  params: Record<string, unknown> = {},
  locale: Locale = 'vi',
): Promise<PostsPage> {
  const result = await wpFetchCollection<WPPost[]>(ENDPOINT, {
    params: {
      _embed: 1,
      _fields: POST_SUMMARY_FIELDS,
      lang: locale,
      ...params,
    },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS, `post-summaries-${locale}`],
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
 * match a Permalink Manager URI. TLU public routes append `-{postId}`; this
 * stable ID also allows legacy custom URLs ending in an ID to resolve after
 * that plugin is removed. The route handler redirects aliases canonically.
 */
export async function getPostByPermalinkPath(
  path: string,
  locale: Locale = 'vi',
): Promise<WPPost | null> {
  const normalizedPath = normalizePermalinkPath(path);
  const requestedSlug = normalizedPath.split('/').at(-1) ?? '';
  if (!requestedSlug) return null;

  const idMatch = requestedSlug.match(/-(\d+)$/);
  if (idMatch) {
    const postId = Number.parseInt(idMatch[1], 10);
    if (!Number.isSafeInteger(postId) || postId <= 0) return null;

    try {
      const post = await getPostById(postId, locale);
      return post?.type === 'post' ? post : null;
    } catch (error) {
      // A real missing post is a 404; upstream timeouts and 5xx must propagate
      // so the route does not misreport a temporary CMS failure as missing content.
      if (error instanceof WordPressApiError && error.status === 404) return null;
      throw error;
    }
  }

  const directPost = await getPostBySlug(requestedSlug, locale);
  if (directPost && normalizePermalinkPath(directPost.link) === normalizedPath) {
    return directPost;
  }
  return null;
}

interface HeadlessPostDetails {
  acf?: Record<string, unknown>;
  featured_image?: {
    id: number;
    url: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    mime_type?: string;
  } | null;
}

interface HeadlessArchivePost {
  id: number;
  acf?: Record<string, unknown>;
}

interface HeadlessArchiveResponse {
  posts?: HeadlessArchivePost[];
}

/** Fetch ACF for an entire category archive in one Headless API request. */
export async function getHeadlessArchiveAcf(
  taxonomy: string,
  term: string,
  locale: Locale = 'vi',
  perPage = 12,
): Promise<Map<number, Record<string, unknown>> | null> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/archive', {
    taxonomy,
    term,
    lang: locale,
    page: 1,
    per_page: perPage,
  });

  try {
    const response = await wpFetchUrl<HeadlessArchiveResponse>(url.toString(), {
      revalidate: REVALIDATE_POSTS,
      tags: [CACHE_TAGS.POSTS, `archive-${taxonomy}-${term}-${locale}`],
    });
    if (!Array.isArray(response.posts)) return null;

    return new Map(
      response.posts.flatMap((post) => (
        post.acf && typeof post.acf === 'object' && !Array.isArray(post.acf)
          ? [[post.id, post.acf] as const]
          : []
      )),
    );
  } catch {
    return null;
  }
}

/** Prefer batch archive ACF and fall back to per-post details on older CMS plugins. */
export async function enrichPostsWithHeadlessArchiveAcf(
  posts: WPPost[],
  taxonomy: string,
  term: string,
  locale: Locale = 'vi',
): Promise<WPPost[]> {
  if (posts.length === 0) return posts;

  const archiveAcf = await getHeadlessArchiveAcf(taxonomy, term, locale, posts.length);
  if (!archiveAcf) return enrichPostsWithHeadlessAcf(posts, locale);

  return posts.map((post) => ({
    ...post,
    ...(archiveAcf.has(post.id) ? { acf: archiveAcf.get(post.id) } : {}),
  }));
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
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/page', {
    slug: post.slug,
    post_type: 'post',
    lang: locale,
  });

  try {
    const details = await wpFetchUrl<HeadlessPostDetails>(url.toString(), REVALIDATE_POSTS);
    const featuredImage = details.featured_image?.url
      ? toEmbeddedMedia(details.featured_image)
      : null;

    return {
      ...post,
      ...(details.acf ? { acf: details.acf } : {}),
      ...(featuredImage
        ? {
            featured_media: featuredImage.id,
            _embedded: {
              ...post._embedded,
              'wp:featuredmedia': [featuredImage],
            },
          }
        : {}),
    };
  } catch {
    return post;
  }
}

function toEmbeddedMedia(
  image: NonNullable<HeadlessPostDetails['featured_image']>,
): WPMedia {
  return {
    id: image.id,
    date: '',
    slug: '',
    status: 'inherit',
    type: 'attachment',
    link: image.url,
    title: { rendered: image.title ?? '' },
    author: 0,
    source_url: image.url,
    alt_text: image.alt ?? '',
    media_type: 'image',
    mime_type: image.mime_type ?? '',
    media_details: {
      width: image.width ?? 0,
      height: image.height ?? 0,
      file: '',
      sizes: {},
    },
  };
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
