import { cache } from 'react';
import { connection } from 'next/server';
import { getPostsByCategories, getFirstPageBySlug } from '@/lib/api/homepage';
import { enrichPostsWithHeadlessAcf, getPostSummaries } from '@/lib/wordpress/posts';
import { getCategoryBySlug, getCategoryTreeIds } from '@/lib/wordpress/categories';
import { getFacultySliderItems } from '@/lib/wordpress/faculties';
import { getPartnerLogos } from '@/lib/wordpress/partner-logos';
import { getHomeMediaGallery } from '@/lib/wordpress/media-gallery';
import { applyHomepagePostPriorities } from '@/lib/wordpress/post-priority';
import { CATEGORY_SLUGS, PAGE_SLUGS } from '@/constants/categories';
import { SITE_STATS, SITE_STATS_EN } from '@/constants/site';
import type { Locale } from '@/types/ngon-ngu';
import { stripHtml } from '@/lib/utils/html';
import type { WPApiError, WPPage, WPPost, WPMedia } from '@/types/wordpress';
import type { HomepageData, HeroData, SiteStatistic } from '@/types/homepage';

const HOMEPAGE_DATA_TIMEOUT_MS = 12_000;

/** Prevent one slow optional WordPress integration from blocking the homepage. */
function withHomepageFallback<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = setTimeout(() => {
      console.warn(`[homepage] ${label} timed out after ${HOMEPAGE_DATA_TIMEOUT_MS}ms.`);
      finish(fallback);
    }, HOMEPAGE_DATA_TIMEOUT_MS);

    // Keep observing the source promise after a timeout so a late rejection is handled.
    promise.then(
      finish,
      (error: unknown) => {
        console.warn(`[homepage] ${label} failed; using fallback.`, error);
        finish(fallback);
      },
    );
  });
}

async function getHomepageEvents(locale: Locale) {
  const posts = await getPostsByCategories(CATEGORY_SLUGS.EVENTS, 12, locale);
  return enrichPostsWithHeadlessAcf(posts, locale);
}

async function getHomepageNews(locale: Locale) {
  const posts = await getPostsByCategories(CATEGORY_SLUGS.NEWS, 40, locale, true);
  return applyHomepagePostPriorities(posts, locale);
}

async function getLatestPostByCategoryCandidates(
  slugs: readonly string[],
  locale: Locale,
  includeChildren = false,
) {
  for (const slug of slugs) {
    const category = await getCategoryBySlug(slug, locale).catch(() => null);
    if (!category) continue;

    const categoryIds = includeChildren
      ? await getCategoryTreeIds(category.id, locale)
      : [category.id];
    const posts = await getPostSummaries({
      categories: categoryIds,
      per_page: 1,
      orderby: 'date',
      order: 'desc',
    }, locale).catch(() => []);

    if (posts[0]) return posts[0];
  }

  return null;
}

export const getFullHomepageData = cache(async function getFullHomepageData(
  locale: Locale = 'vi'
): Promise<HomepageData> {
  // Keep production builds independent from live WordPress latency while
  // preserving the existing data-cache revalidation settings at runtime.
  await connection();

  const [
    heroPage,
    announcements,
    news,
    events,
    admissionsPage,
    trainingPost,
    studentPost,
    alumniPost,
    faculties,
    partnerLogos,
    partners,
    cooperation,
    research,
    community,
    moments,
    momentGallery,
  ] = await Promise.all([
    withHomepageFallback('hero', getFirstPageBySlug(PAGE_SLUGS.HERO, locale), null),
    withHomepageFallback('announcements', getPostsByCategories(CATEGORY_SLUGS.ANNOUNCEMENTS, 8, locale), []),
    // Match the WordPress shortcode and merge the selected HOT/NEW posts.
    withHomepageFallback('news', getHomepageNews(locale), []),
    // Bổ sung ACF từ Headless API vì /wp/v2 có thể không công khai lịch sự kiện.
    withHomepageFallback('events', getHomepageEvents(locale), []),
    withHomepageFallback('admissions', getFirstPageBySlug(PAGE_SLUGS.ADMISSIONS, locale), null),
    withHomepageFallback('featured training', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_TRAINING, locale, true), null),
    withHomepageFallback('featured students', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_STUDENTS, locale), null),
    withHomepageFallback('featured alumni', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_ALUMNI, locale), null),
    withHomepageFallback('faculties', getFacultySliderItems(locale), []),
    withHomepageFallback('partner logos', getPartnerLogos(locale), []),
    withHomepageFallback('partners', getPostsByCategories(CATEGORY_SLUGS.PARTNERS, 12, locale), []),
    withHomepageFallback('cooperation', getPostsByCategories(CATEGORY_SLUGS.COOPERATION, 6, locale, true), []),
    withHomepageFallback('research', getPostsByCategories(CATEGORY_SLUGS.RESEARCH, 6, locale, true), []),
    withHomepageFallback('community', getPostsByCategories(CATEGORY_SLUGS.COMMUNITY, 6, locale), []),
    withHomepageFallback('moments', getPostsByCategories(CATEGORY_SLUGS.MOMENTS, 15, locale), []),
    withHomepageFallback('media gallery', getHomeMediaGallery(locale), null),
  ]);

  const compactPosts = (posts: WPPost[]) => posts.map(compactHomepagePost);

  return {
    heroPage,
    announcements: compactPosts(announcements),
    news: compactPosts(news),
    events: compactPosts(events),
    admissionsPage,
    featurePosts: {
      training: trainingPost ? compactHomepagePost(trainingPost) : null,
      students: studentPost ? compactHomepagePost(studentPost) : null,
      alumni: alumniPost ? compactHomepagePost(alumniPost) : null,
    },
    faculties,
    partnerLogos,
    partners: compactPosts(partners),
    cooperation: compactPosts(cooperation),
    research: compactPosts(research),
    community: compactPosts(community),
    moments: compactPosts(moments),
    momentGallery,
  };
});

function compactMedia(media: WPMedia): WPMedia {
  const sizes = media.media_details?.sizes ?? {};
  const preferredSize = sizes.large ?? sizes.medium_large ?? sizes.medium;

  return {
    id: media.id,
    date: '',
    slug: media.slug,
    status: media.status,
    type: media.type,
    link: media.link,
    title: { rendered: media.title?.rendered ?? '' },
    author: media.author,
    // The WordPress origin already generates responsive variants. Homepage
    // cards do not need the original multi-megapixel upload, especially while
    // Next image optimization is disabled for this origin's TLS certificate.
    source_url: preferredSize?.source_url ?? media.source_url,
    alt_text: media.alt_text,
    media_type: media.media_type,
    mime_type: media.mime_type,
    media_details: {
      width: preferredSize?.width ?? media.media_details?.width ?? 0,
      height: preferredSize?.height ?? media.media_details?.height ?? 0,
      file: '',
      sizes: {},
    },
  };
}

function compactFeaturedMedia(post: WPPost): (WPMedia | WPApiError)[] | undefined {
  const media = post._embedded?.['wp:featuredmedia'];
  return media?.map((item) => ('code' in item ? item : compactMedia(item)));
}

/** Keep only fields consumed by homepage cards before crossing a Client Component boundary. */
function compactHomepagePost(post: WPPost): WPPost {
  return {
    id: post.id,
    date: post.date,
    date_gmt: post.date_gmt ?? '',
    modified: post.modified ?? '',
    modified_gmt: post.modified_gmt ?? '',
    slug: post.slug,
    status: post.status ?? 'publish',
    type: post.type ?? 'post',
    link: post.link,
    title: post.title,
    content: { rendered: '' },
    excerpt: post.excerpt ?? { rendered: '' },
    author: post.author ?? 0,
    featured_media: post.featured_media ?? 0,
    comment_status: post.comment_status ?? 'closed',
    ping_status: post.ping_status ?? 'closed',
    sticky: post.sticky ?? false,
    format: post.format ?? 'standard',
    categories: post.categories ?? [],
    tags: post.tags ?? [],
    meta: post.meta,
    acf: post.acf,
    post_priority_label: post.post_priority_label,
    post_priority_order: post.post_priority_order,
    post_priority_expire_date: post.post_priority_expire_date,
    _priority_label: post._priority_label,
    _priority_order: post._priority_order,
    _priority_expire: post._priority_expire,
    _embedded: {
      'wp:featuredmedia': compactFeaturedMedia(post),
      'wp:term': post._embedded?.['wp:term'],
    },
  };
}

function getPageFeaturedImage(page: WPPage): WPMedia | null {
  const media = page._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export function extractHeroData(page: WPPage | null): HeroData {
  const acf = (page?.acf ?? {}) as Record<string, unknown>;
  const media = page ? getPageFeaturedImage(page) : null;

  return {
    title: page ? stripHtml(page.title.rendered) : null,
    subtitle: acf.hero_subtitle
      ? String(acf.hero_subtitle)
      : page?.excerpt.rendered
        ? stripHtml(page.excerpt.rendered)
        : null,
    backgroundImageUrl: media?.source_url ?? null,
    backgroundImageAlt: media?.alt_text ?? null,
    ctaText: acf.cta_text ? String(acf.cta_text) : null,
    ctaUrl: acf.cta_url ? String(acf.cta_url) : null,
    secondaryCtaText: acf.secondary_cta_text ? String(acf.secondary_cta_text) : null,
    secondaryCtaUrl: acf.secondary_cta_url ? String(acf.secondary_cta_url) : null,
  };
}

export function extractStats(page: WPPage | null, locale: Locale = 'vi'): SiteStatistic[] {
  const acf = (page?.acf ?? {}) as Record<string, unknown>;

  for (const key of ['statistics', 'stats', 'so_lieu', 'thong_ke']) {
    const val = acf[key];
    if (!Array.isArray(val) || val.length === 0) continue;

    const result: SiteStatistic[] = val
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null
      )
      .map((item) => ({
        value: String(item.value ?? item.so_lieu ?? item.count ?? ''),
        label: String(item.label ?? item.ten ?? item.name ?? ''),
      }))
      .filter((stat) => stat.value && stat.label);

    if (result.length > 0) return result;
  }

  const fallback = locale === 'en' ? SITE_STATS_EN : SITE_STATS;
  return fallback.map((stat) => ({ value: stat.value, label: stat.label }));
}
