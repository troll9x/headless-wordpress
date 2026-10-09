import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import ChiTietBaiViet, { ArticleRelatedNavigation } from '@/components/bai-viet/ChiTietBaiViet';
import CategoryArchive from '@/components/chuyen-muc/CategoryArchive';
import CategoryBanner from '@/components/chuyen-muc/CategoryBanner';
import CategoryLanding from '@/components/chuyen-muc/CategoryLanding';
import CategorySidebar from '@/components/chuyen-muc/CategorySidebar';
import { FRONTEND_URL } from '@/constants/api';
import { CATEGORY_POSTS_PER_PAGE } from '@/constants/categories';
import { buildCategoryUrl, buildPostUrl } from '@/constants/duong-dan';
import {
  categoryUsesFullWidthLayout,
  categoryUsesLandingLayout,
  getCategoryBanner,
  getCategoryBySlug,
  getCategorySidebar,
  getCategoryTreeIds,
  getPostCategoryBanner,
} from '@/lib/wordpress/categories';
import {
  enrichPostsWithHeadlessArchiveAcf,
  getPostSummariesPage,
  getPostByPermalinkPath,
  getPostPageData,
  getPostsPage,
  postHasCategorySlug,
} from '@/lib/wordpress/posts';
import { getTranslatedPostUrl } from '@/lib/wordpress/polylang';
import { generateHeadlessMetadata, sanitizeMetaDescription } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMedia } from '@/types/wordpress';

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

// This catch-all resolves arbitrary WordPress paths and category pagination
// from request-time searchParams. Do not opt it into on-demand static generation;
// WordPress fetches retain their own revalidation cache.

interface PermalinkRequest {
  slug: string;
  locale: Locale;
  isFlatContentPath: boolean;
}

function parsePage(value?: string): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function getCategoryPostsPage(
  params: Record<string, unknown>,
  locale: Locale,
  categorySlug: string,
): Promise<Awaited<ReturnType<typeof getPostsPage>>> {
  try {
    return await getPostsPage(params, locale);
  } catch (error) {
    console.warn(`[category-archive] Full post fetch failed for ${categorySlug}; retrying summaries.`, error);
  }

  try {
    return await getPostSummariesPage(params, locale);
  } catch (error) {
    console.error(`[category-archive] Summary fetch failed for ${categorySlug}; refusing to render a false empty archive.`, error);
    throw error;
  }
}

function resolvePermalinkRequest(path: string[]): PermalinkRequest | null {
  const cleanPath = path.map((segment) => decodeURIComponent(segment)).filter(Boolean);
  if (cleanPath.length === 0) return null;

  const locale: Locale = cleanPath[0] === 'en' ? 'en' : 'vi';
  return {
    slug: cleanPath.at(-1)!,
    locale,
    isFlatContentPath: locale === 'en' ? cleanPath.length === 2 : cleanPath.length === 1,
  };
}

function getFeaturedImageUrl(post: NonNullable<Awaited<ReturnType<typeof getPostByPermalinkPath>>>): string | undefined {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && 'source_url' in media ? (media as WPMedia).source_url : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const request = resolvePermalinkRequest((await params).path);
  if (!request) notFound();

  const isPostIdPath = /-\d+$/.test(request.slug);
  const seoId = isPostIdPath
    ? Number.parseInt(request.slug.match(/-(\d+)$/)?.[1] ?? '', 10)
    : null;
  const headlessSeoPromise = seoId && Number.isSafeInteger(seoId) && seoId > 0
    ? getHeadlessSeoById(seoId, request.locale)
    : null;
  const category = isPostIdPath
    ? null
    : await getCategoryBySlug(request.slug, request.locale);
  if (category) {
    const isEn = request.locale === 'en';
    const description = sanitizeMetaDescription(
      category.description,
      isEn
        ? `Posts filed under ${category.name}.`
        : `Các bài viết thuộc chuyên mục ${category.name}.`,
    );
    return {
      title: category.name,
      description,
      twitter: { description },
      openGraph: { description },
      alternates: {
        canonical: `${FRONTEND_URL}${buildCategoryUrl(category.slug, request.locale)}`,
      },
    };
  }

  if (!request.isFlatContentPath) notFound();
  const post = await getPostByPermalinkPath((await params).path.join('/'), request.locale);
  if (!post) notFound();

  const title = stripHtml(post.title.rendered);
  const description = stripHtml(post.excerpt.rendered || post.content.rendered).slice(0, 180);
  const canonical = `${FRONTEND_URL}${buildPostUrl(post.slug, request.locale, post.link, post.id, post.canonical_path)}`;

  const targetLocale: Locale = request.locale === 'vi' ? 'en' : 'vi';
  const translatedUrl = getTranslatedPostUrl(post, targetLocale);
  const headlessSeo = await (headlessSeoPromise ?? getHeadlessSeoById(post.id, request.locale));

  return generateHeadlessMetadata(headlessSeo, {
    title,
    description,
    canonical,
    locale: request.locale,
    type: 'article',
    imageUrl: getFeaturedImageUrl(post),
    imageAlt: title,
    publishedTime: post.date,
    modifiedTime: post.modified,
    viUrl: request.locale === 'vi' ? canonical : translatedUrl ?? undefined,
    enUrl: request.locale === 'en' ? canonical : translatedUrl ?? undefined,
    includeAlternates: Boolean(translatedUrl),
  });
}

async function renderCategory(
  category: NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>,
  request: PermalinkRequest,
  currentPage: number,
) {
  const categoryBanner = await getCategoryBanner(category, request.locale);

  if (categoryUsesLandingLayout(category.slug)) {
    return (
      <>
        {categoryBanner && <CategoryBanner banner={categoryBanner} />}
        <CategoryLanding category={category} locale={request.locale} />
      </>
    );
  }

  const isRecruitment = category.id === 85 || category.slug === 'thong-tin-tuyen-dung';
  // WordPress category archives include descendant terms. Core REST only
  // filters the exact IDs supplied, so expand the tree explicitly.
  const categoryIds = await getCategoryTreeIds(category.id, request.locale);
  const query = {
    categories: categoryIds,
    per_page: CATEGORY_POSTS_PER_PAGE,
    orderby: 'date',
    order: 'desc',
  };

  const [firstPage, sidebar] = await Promise.all([
    getCategoryPostsPage({ ...query, page: 1 }, request.locale, category.slug),
    categoryUsesFullWidthLayout(category.slug)
      ? Promise.resolve(null)
      : getCategorySidebar({ categoryId: category.id }, request.locale),
  ]);

  const totalPages = Math.max(1, firstPage.totalPages);
  if (currentPage > totalPages) notFound();

  const requestedPage = currentPage === 1
    ? firstPage
    : await getCategoryPostsPage({ ...query, page: currentPage }, request.locale, category.slug);
  const posts = isRecruitment
    ? await enrichPostsWithHeadlessArchiveAcf(
        requestedPage.posts,
        'category',
        category.slug,
        request.locale,
      )
    : requestedPage.posts;

  return (
    <>
      {categoryBanner && <CategoryBanner banner={categoryBanner} />}
      <CategoryArchive
        category={category}
        posts={posts}
        sidebar={sidebar}
        locale={request.locale}
        basePath={buildCategoryUrl(category.slug, request.locale)}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </>
  );
}

async function renderPost(
  post: NonNullable<Awaited<ReturnType<typeof getPostByPermalinkPath>>>,
  locale: Locale,
) {
  // Recruitment content needs ACF in the main article; retain the existing
  // blocking path until its detail contract is separated from related posts.
  if (postHasCategorySlug(post, 'thong-tin-tuyen-dung')) {
    const [pageData, sidebar, categoryBanner] = await Promise.all([
      getPostPageData(post, locale),
      getCategorySidebar({ categoryId: post.categories[0] }, locale),
      getPostCategoryBanner(post, locale),
    ]);
    return <ChiTietBaiViet post={pageData.post} locale={locale} sidebar={sidebar} relatedPosts={pageData.relatedPosts} previousPost={pageData.previousPost} nextPost={pageData.nextPost} categoryBanner={categoryBanner} />;
  }

  // Start secondary CMS calls together, then stream them below/around the
  // already resolved article. A slow related query no longer blocks the body.
  const relatedPromise = getPostPageData(post, locale).catch(() => ({
    post, relatedPosts: [], previousPost: null, nextPost: null,
  }));
  const sidebarPromise = post.categories[0]
    ? getCategorySidebar({ categoryId: post.categories[0] }, locale).catch(() => null)
    : Promise.resolve(null);
  const bannerPromise = getPostCategoryBanner(post, locale).catch(() => null);

  return (
    <ChiTietBaiViet
      post={post}
      locale={locale}
      relatedSlot={<Suspense fallback={null}><StreamRelated promise={relatedPromise} locale={locale} /></Suspense>}
      sidebarSlot={post.categories[0] ? <Suspense fallback={null}><StreamSidebar promise={sidebarPromise} locale={locale} categoryId={post.categories[0]} /></Suspense> : undefined}
      bannerSlot={<Suspense fallback={null}><StreamBanner promise={bannerPromise} /></Suspense>}
    />
  );
}

async function StreamRelated({ promise, locale }: {
  promise: ReturnType<typeof getPostPageData>;
  locale: Locale;
}) {
  const data = await promise;
  return <ArticleRelatedNavigation previousPost={data.previousPost} nextPost={data.nextPost} relatedPosts={data.relatedPosts} locale={locale} />;
}

async function StreamSidebar({ promise, locale, categoryId }: {
  promise: ReturnType<typeof getCategorySidebar>;
  locale: Locale;
  categoryId: number;
}) {
  const sidebar = await promise;
  if (!sidebar) return null;
  return <aside className="lg:sticky lg:top-[140px] lg:self-start"><CategorySidebar data={sidebar} locale={locale} currentCategoryId={categoryId} /></aside>;
}

async function StreamBanner({ promise }: {
  promise: ReturnType<typeof getPostCategoryBanner>;
}) {
  const banner = await promise;
  return banner ? <CategoryBanner banner={banner} /> : null;
}

/** Resolves flat Permalink Manager URLs and keeps legacy hierarchical category URLs working. */
export default async function WordPressPermalinkPage({ params, searchParams }: Props) {
  const request = resolvePermalinkRequest((await params).path);
  if (!request) notFound();

  const isPostIdPath = /-\d+$/.test(request.slug);
  const category = isPostIdPath
    ? null
    : await getCategoryBySlug(request.slug, request.locale);
  if (category) {
    return renderCategory(category, request, parsePage((await searchParams).page));
  }

  if (!request.isFlatContentPath) notFound();
  const post = await getPostByPermalinkPath((await params).path.join('/'), request.locale);
  if (!post) notFound();

  const canonicalPath = buildPostUrl(post.slug, request.locale, post.link, post.id, post.canonical_path);
  const requestPath = `/${(await params).path.join('/')}`.replace(/\/$/, '');
  if (requestPath !== canonicalPath.replace(/\/$/, '')) permanentRedirect(canonicalPath);

  return renderPost(post, request.locale);
}
