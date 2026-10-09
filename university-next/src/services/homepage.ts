import { cache } from 'react';
import { connection } from 'next/server';
import { getPostsByCategories, getFirstPageBySlug } from '@/lib/api/homepage';
import {
  enrichPostsWithHeadlessAcf,
  enrichPostsWithHeadlessArchiveAcf,
  getPostSummaries,
} from '@/lib/wordpress/posts';
import {
  getCategoriesBySlugs,
  getCategoryTreeIds,
} from '@/lib/wordpress/categories';
import { getFacultySliderItems } from '@/lib/wordpress/faculties';
import { getPartnerLogos } from '@/lib/wordpress/partner-logos';
import { getHomeMediaGallery } from '@/lib/wordpress/media-gallery';
import { getHeroSlides } from '@/lib/wordpress/hero-slides';
import { getSiteStaticImage } from '@/lib/wordpress/site-static-image';
import { applyHomepagePostPriorities } from '@/lib/wordpress/post-priority';
import { getHomepageContentSnapshot } from '@/lib/wordpress/homepage-snapshot';
import {
  CATEGORY_SLUGS,
  HOMEPAGE_NEWS_CATEGORY_IDS,
  PAGE_SLUGS,
} from '@/constants/categories';
import { SITE_STATS, SITE_STATS_EN } from '@/constants/site';
import type { Locale } from '@/types/ngon-ngu';
import { stripHtml } from '@/lib/utils/html';
import type { WPApiError, WPPage, WPPost, WPMedia } from '@/types/wordpress';
import type { HomepageData, HeroData, SiteStatistic } from '@/types/homepage';

// This deadline includes time spent waiting for a WordPress request slot.
// CMS responses can take 2-5 seconds, so 12 seconds caused cold homepage
// requests near the back of the queue to resolve as empty sections.
const HOMEPAGE_DATA_TIMEOUT_MS = 30_000;

/** Prevent one slow optional WordPress integration from blocking the homepage. */
function withHomepageFallback<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
  loadErrors: string[],
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
      loadErrors.push(label);
      finish(fallback);
    }, HOMEPAGE_DATA_TIMEOUT_MS);

    // Keep observing the source promise after a timeout so a late rejection is handled.
    promise.then(
      finish,
      (error: unknown) => {
        if (settled) return;
        console.warn(`[homepage] ${label} failed; using fallback.`, error);
        loadErrors.push(label);
        finish(fallback);
      },
    );
  });
}

async function getHomepageEvents(locale: Locale) {
  const categories = await getCategoriesBySlugs(CATEGORY_SLUGS.EVENTS, locale);

  for (const category of categories) {
    const params = {
      categories: [category.id],
      per_page: 12,
      orderby: 'date',
      order: 'desc',
    } as const;
    const posts = await getPostSummaries(params, locale);
    if (posts.length === 0) continue;

    // Keep core REST's embedded image and term data while batch-loading ACF.
    return enrichPostsWithHeadlessArchiveAcf(posts, 'category', category.slug, locale);
  }

  return [];
}

async function getHomepageNews(locale: Locale) {
  const posts = getPostSummaries({
    categories: [...HOMEPAGE_NEWS_CATEGORY_IDS[locale]],
    // The component renders one featured post plus six side posts. Priority
    // selections outside this window are fetched separately by ID below.
    per_page: 10,
    orderby: 'date',
    order: 'desc',
  }, locale);
  return applyHomepagePostPriorities(posts, locale);
}

async function getLatestPostByCategoryCandidates(
  slugs: readonly string[],
  locale: Locale,
  includeChildren = false,
) {
  const categories = await getCategoriesBySlugs(slugs, locale);
  for (const category of categories) {

    const categoryIds = includeChildren
      ? await getCategoryTreeIds(category.id, locale)
      : [category.id];
    const posts = await getPostSummaries({
      categories: categoryIds,
      per_page: 1,
      orderby: 'date',
      order: 'desc',
    }, locale);

    if (posts[0]) {
      const media = posts[0]._embedded?.['wp:featuredmedia']?.[0];
      if (media && !('code' in media)) return posts[0];

      const [enrichedPost] = await enrichPostsWithHeadlessAcf([posts[0]], locale);
      return enrichedPost ?? posts[0];
    }
  }

  return null;
}

async function loadHomepageData(
  locale: Locale = 'vi'
): Promise<HomepageData> {
  const loadErrors: string[] = [];
  const safe = <T,>(label: string, promise: Promise<T>, fallback: T) =>
    withHomepageFallback(label, promise, fallback, loadErrors);
  let snapshot = null;
  try {
    snapshot = await getHomepageContentSnapshot(locale);
  } catch (error) {
    // Keep the old route plan as a compatibility fallback while the CMS plugin
    // rollout is staged. A failed snapshot is not itself a content failure.
    console.warn('[homepage] snapshot unavailable; using legacy API requests.', error);
  }
  const [
    heroPage,
    heroSlides,
    staticImage,
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
    snapshot ? Promise.resolve(snapshot.heroPage) : safe('hero', getFirstPageBySlug(PAGE_SLUGS.HERO, locale), null),
    safe('hero slides', getHeroSlides(locale), []),
    getSiteStaticImage(locale).catch((error: unknown) => {
      console.warn('[homepage] CMS static image unavailable; section omitted.', error);
      loadErrors.push('static image');
      return null;
    }),
    snapshot ? Promise.resolve(snapshot.announcements) : safe('announcements', getPostsByCategories(CATEGORY_SLUGS.ANNOUNCEMENTS, 8, locale), []),
    // Match the WordPress shortcode and merge the selected HOT/NEW posts.
    snapshot ? Promise.resolve(snapshot.news) : safe('news', getHomepageNews(locale), []),
    // Bổ sung ACF từ Headless API vì /wp/v2 có thể không công khai lịch sự kiện.
    snapshot ? Promise.resolve(snapshot.events) : safe('events', getHomepageEvents(locale), []),
    snapshot ? Promise.resolve(snapshot.admissionsPage) : safe('admissions', getFirstPageBySlug(PAGE_SLUGS.ADMISSIONS, locale), null),
    snapshot ? Promise.resolve(snapshot.featurePosts.training) : safe('featured training', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_TRAINING, locale, true), null),
    snapshot ? Promise.resolve(snapshot.featurePosts.students) : safe('featured students', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_STUDENTS, locale), null),
    snapshot ? Promise.resolve(snapshot.featurePosts.alumni) : safe('featured alumni', getLatestPostByCategoryCandidates(CATEGORY_SLUGS.FEATURE_ALUMNI, locale), null),
    safe('faculties', getFacultySliderItems(locale), []),
    safe('partner logos', getPartnerLogos(locale), []),
    snapshot ? Promise.resolve(snapshot.partners) : safe('partners', getPostsByCategories(CATEGORY_SLUGS.PARTNERS, 12, locale), []),
    snapshot ? Promise.resolve(snapshot.cooperation) : safe('cooperation', getPostsByCategories(CATEGORY_SLUGS.COOPERATION, 6, locale, true), []),
    snapshot ? Promise.resolve(snapshot.research) : safe('research', getPostsByCategories(CATEGORY_SLUGS.RESEARCH, 6, locale, true), []),
    snapshot ? Promise.resolve(snapshot.community) : safe('community', getPostsByCategories(CATEGORY_SLUGS.COMMUNITY, 6, locale), []),
    snapshot ? Promise.resolve(snapshot.moments) : safe('moments', getPostsByCategories(CATEGORY_SLUGS.MOMENTS, 15, locale), []),
    safe('media gallery', getHomeMediaGallery(locale), null),
  ]);

  const compactPosts = (posts: WPPost[]) => posts.map(compactHomepagePost);

  return {
    loadErrors,
    heroPage,
    heroSlides,
    staticImage,
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
}

export const getFullHomepageData = cache(async (locale: Locale = 'vi'): Promise<HomepageData> => {
  // WordPress fetches already use tagged 60-second caching. Do not cache the
  // assembled fallback arrays: a transient upstream error must not turn into
  // a cached "no content" homepage for every visitor.
  await connection();
  return loadHomepageData(locale);
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
    canonical_path: post.canonical_path,
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
