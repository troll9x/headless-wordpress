import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChiTietBaiViet from '@/components/bai-viet/ChiTietBaiViet';
import CategoryArchive from '@/components/chuyen-muc/CategoryArchive';
import CategoryBanner from '@/components/chuyen-muc/CategoryBanner';
import CategoryLanding from '@/components/chuyen-muc/CategoryLanding';
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
  enrichPostsWithHeadlessAcf,
  getPostByPermalinkPath,
  getPostPageData,
  getPostsPage,
} from '@/lib/wordpress/posts';
import { getTranslatedPostUrl } from '@/lib/wordpress/polylang';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMedia } from '@/types/wordpress';

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

interface PermalinkRequest {
  slug: string;
  locale: Locale;
  isFlatContentPath: boolean;
}

function parsePage(value?: string): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
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

  const category = await getCategoryBySlug(request.slug, request.locale).catch(() => null);
  if (category) {
    const isEn = request.locale === 'en';
    return {
      title: category.name,
      description:
        category.description ||
        (isEn
          ? `Posts filed under ${category.name}.`
          : `Các bài viết thuộc chuyên mục ${category.name}.`),
      alternates: {
        canonical: `${FRONTEND_URL}${buildCategoryUrl(category.slug, request.locale)}`,
      },
    };
  }

  if (!request.isFlatContentPath) notFound();
  const post = await getPostByPermalinkPath((await params).path.join('/'), request.locale).catch(() => null);
  if (!post) notFound();

  const title = stripHtml(post.title.rendered);
  const description = stripHtml(post.excerpt.rendered || post.content.rendered).slice(0, 180);
  const canonical = `${FRONTEND_URL}${buildPostUrl(post.slug, request.locale, post.link)}`;

  const targetLocale: Locale = request.locale === 'vi' ? 'en' : 'vi';
  const translatedUrl = getTranslatedPostUrl(post, targetLocale);
  const headlessSeo = await getHeadlessSeoById(post.id, request.locale);

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
    getPostsPage({ ...query, page: 1 }, request.locale),
    categoryUsesFullWidthLayout(category.slug)
      ? Promise.resolve(null)
      : getCategorySidebar({ categoryId: category.id }, request.locale),
  ]);

  const totalPages = Math.max(1, firstPage.totalPages);
  if (currentPage > totalPages) notFound();

  const requestedPage = currentPage === 1
    ? firstPage
    : await getPostsPage({ ...query, page: currentPage }, request.locale);
  const posts = isRecruitment
    ? await enrichPostsWithHeadlessAcf(requestedPage.posts, request.locale)
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
  const [pageData, sidebar, categoryBanner] = await Promise.all([
    getPostPageData(post, locale),
    getCategorySidebar({ postId: post.id }, locale),
    getPostCategoryBanner(post, locale),
  ]);

  return (
    <ChiTietBaiViet
      post={pageData.post}
      locale={locale}
      sidebar={sidebar}
      relatedPosts={pageData.relatedPosts}
      previousPost={pageData.previousPost}
      nextPost={pageData.nextPost}
      categoryBanner={categoryBanner}
    />
  );
}

/** Resolves flat Permalink Manager URLs and keeps legacy hierarchical category URLs working. */
export default async function WordPressPermalinkPage({ params, searchParams }: Props) {
  const request = resolvePermalinkRequest((await params).path);
  if (!request) notFound();

  const category = await getCategoryBySlug(request.slug, request.locale).catch(() => null);
  if (category) {
    return renderCategory(category, request, parsePage((await searchParams).page));
  }

  if (!request.isFlatContentPath) notFound();
  const post = await getPostByPermalinkPath((await params).path.join('/'), request.locale).catch(() => null);
  if (!post) notFound();

  return renderPost(post, request.locale);
}
