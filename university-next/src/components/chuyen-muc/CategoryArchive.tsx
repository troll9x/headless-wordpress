import Image from 'next/image';
import Link from 'next/link';
import CategorySidebar from '@/components/chuyen-muc/CategorySidebar';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { buildPostUrl, getHomePath } from '@/constants/duong-dan';
import { formatDateShort } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import { blogArchiveStyles, recruitmentListStyles } from '@/styles/tlu-template-recipes';
import type { Locale } from '@/types/ngon-ngu';
import type {
  CategorySidebarData,
  WPCategory,
  WPMedia,
  WPPost,
} from '@/types/wordpress';

const TITLE_ONLY_CATEGORIES = new Set(['dai-hoc-chinh-quy', 'thac-si', 'tien-si']);

interface CategoryArchiveProps {
  category: WPCategory;
  posts: WPPost[];
  sidebar: CategorySidebarData | null;
  locale: Locale;
  basePath: string;
  currentPage?: number;
  totalPages?: number;
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && 'source_url' in media ? media : null;
}

function getExcerpt(post: WPPost, maximumLength = 180): string {
  const excerpt = stripHtml(post.excerpt.rendered || post.content.rendered);
  return excerpt.length > maximumLength
    ? `${excerpt.slice(0, maximumLength).trimEnd()}…`
    : excerpt;
}

function getAcfText(post: WPPost, key: string): string {
  const value = post.acf?.[key] ?? post.meta?.[key];
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ');
  return '';
}

function PostImage({
  post,
  className,
  sizes,
}: {
  post: WPPost;
  className: string;
  sizes: string;
}) {
  const media = getFeaturedImage(post);

  if (!media) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 text-sm text-slate-400`}>
        TLU
      </div>
    );
  }

  return (
    <div className={className}>
      <Image
        src={media.source_url}
        alt={media.alt_text || stripHtml(post.title.rendered)}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}

function PrimaryPost({ post, locale }: { post: WPPost; locale: Locale }) {
  const href = buildPostUrl(post.slug, locale, post.link);

  return (
    <article className={`${blogArchiveStyles.primaryBox} group overflow-hidden bg-white`}>
      <Link href={href} aria-label={stripHtml(post.title.rendered)}>
        <PostImage
          post={post}
          className={blogArchiveStyles.primaryImage}
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
      </Link>
      <div className={blogArchiveStyles.primaryText}>
        <h2 className={blogArchiveStyles.primaryTitle}>
          <Link href={href} className="transition-colors hover:text-[#007cba]">
            {stripHtml(post.title.rendered)}
          </Link>
        </h2>
        <p className={blogArchiveStyles.primaryExcerpt}>{getExcerpt(post)}</p>
        <time className={blogArchiveStyles.primaryDate} dateTime={post.date}>
          {formatDateShort(post.date, locale)}
        </time>
      </div>
    </article>
  );
}

function HorizontalPost({
  post,
  locale,
  compact = false,
}: {
  post: WPPost;
  locale: Locale;
  compact?: boolean;
}) {
  const href = buildPostUrl(post.slug, locale, post.link);

  return (
    <article
      className={`group grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 border-b border-slate-200 pb-5 last:border-0 ${
        compact ? 'lg:grid-cols-[132px_minmax(0,1fr)]' : 'sm:grid-cols-[180px_minmax(0,1fr)]'
      }`}
    >
      <Link href={href} aria-label={stripHtml(post.title.rendered)}>
        <PostImage
          post={post}
          className="relative aspect-[5/4] w-full overflow-hidden rounded-md"
          sizes={compact ? '132px' : '(max-width: 640px) 112px, 180px'}
        />
      </Link>
      <div className="min-w-0">
        <h2 className={`${blogArchiveStyles.secondaryTitle} !mb-1.5`}>
          <Link href={href} className="transition-colors hover:text-[#0118d8]">
            {stripHtml(post.title.rendered)}
          </Link>
        </h2>
        <p className={`${blogArchiveStyles.secondaryExcerpt} ${compact ? 'lg:line-clamp-2' : ''}`}>
          {getExcerpt(post, compact ? 105 : 220)}
        </p>
        <time className="mt-2 block text-xs text-[#777]" dateTime={post.date}>
          {formatDateShort(post.date, locale)}
        </time>
      </div>
    </article>
  );
}

function GeneralCategoryLayout({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const [primary, ...rest] = posts;
  const secondaryPosts = rest.slice(0, 3);
  const remainingPosts = rest.slice(3);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>{primary && <PrimaryPost post={primary} locale={locale} />}</div>
        <div className="grid content-start gap-5">
          {secondaryPosts.map((post) => (
            <HorizontalPost key={post.id} post={post} locale={locale} compact />
          ))}
        </div>
      </div>

      {remainingPosts.length > 0 && (
        <div className="mt-10 grid gap-6 border-t border-slate-200 pt-8">
          {remainingPosts.map((post) => (
            <HorizontalPost key={post.id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}

function TitleOnlyLayout({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const isEn = locale === 'en';

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {posts.map((post) => (
        <article key={post.id} className="px-5 py-5 transition-colors hover:bg-slate-50">
          <h2 className="text-lg font-semibold leading-snug text-[#0118d8] sm:text-xl">
            <Link href={buildPostUrl(post.slug, locale, post.link)} className="hover:text-[#007cba]">
              {stripHtml(post.title.rendered)}
            </Link>
          </h2>
          <time className="mt-2 block text-sm text-slate-500" dateTime={post.date}>
            {isEn ? 'Published: ' : 'Ngày đăng: '}
            {formatDateShort(post.date, locale)}
          </time>
        </article>
      ))}
    </div>
  );
}

function RecruitmentLayout({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const isEn = locale === 'en';

  return (
    <div className={recruitmentListStyles.root}>
      {posts.map((post) => {
        const href = buildPostUrl(post.slug, locale, post.link);
        const media = getFeaturedImage(post);
        const metadata = [
          [isEn ? 'Salary' : 'Mức lương', getAcfText(post, 'muc_luong')],
          [isEn ? 'Skills' : 'Kỹ năng', getAcfText(post, 'ky_nang')],
          [isEn ? 'Vacancies' : 'Số lượng tuyển', getAcfText(post, 'so_luong_tuyen')],
        ];

        return (
          <article key={post.id} className={recruitmentListStyles.item}>
            <div className={recruitmentListStyles.content}>
              <div className={recruitmentListStyles.header}>
                {media && (
                  <Image
                    src={media.source_url}
                    alt={media.alt_text || stripHtml(post.title.rendered)}
                    width={150}
                    height={150}
                    className={recruitmentListStyles.logo}
                  />
                )}
                <div className={recruitmentListStyles.info}>
                  <h2>
                    <Link href={href} className={recruitmentListStyles.titleLink}>
                      {stripHtml(post.title.rendered)}
                    </Link>
                  </h2>
                  {metadata.map(([label, value]) => (
                    <p key={label} className={recruitmentListStyles.metadata}>
                      {label}: <strong>{value || '—'}</strong>
                    </p>
                  ))}
                </div>
              </div>
              <div className={recruitmentListStyles.footer}>
                <time className={recruitmentListStyles.date} dateTime={post.date}>
                  {isEn ? 'Published: ' : 'Ngày đăng: '}
                  <strong>{formatDateShort(post.date, locale)}</strong>
                </time>
                <Link href={href} className={recruitmentListStyles.detailLink}>
                  {isEn ? 'View details' : 'Xem chi tiết'}
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  basePath,
  locale,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  locale: Locale;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`);
  // Match Flatsome's archive pagination: four pages at either edge and
  // explicit first/last-page links around an ellipsis in the middle.
  const edgeSize = 4;
  const start = currentPage <= edgeSize
    ? 1
    : Math.max(1, currentPage - 2);
  const end = currentPage >= totalPages - edgeSize + 1
    ? totalPages
    : Math.min(totalPages, Math.max(edgeSize, currentPage + 2));
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label={locale === 'en' ? 'Pagination' : 'Phân trang'}>
      {currentPage > 1 && (
        <Link href={hrefFor(currentPage - 1)} className="rounded border px-3 py-2 hover:border-[#0118d8] hover:text-[#0118d8]">
          {locale === 'en' ? 'Previous' : 'Trước'}
        </Link>
      )}
      {start > 1 && (
        <>
          <Link href={hrefFor(1)} className="min-w-10 rounded border px-3 py-2 text-center hover:border-[#0118d8] hover:text-[#0118d8]">
            1
          </Link>
          {start > 2 && <span className="px-1 text-slate-400">…</span>}
        </>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={hrefFor(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={`min-w-10 rounded border px-3 py-2 text-center ${
            page === currentPage
              ? 'border-[#0118d8] bg-[#0118d8] text-white'
              : 'hover:border-[#0118d8] hover:text-[#0118d8]'
          }`}
        >
          {page}
        </Link>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
          <Link href={hrefFor(totalPages)} className="min-w-10 rounded border px-3 py-2 text-center hover:border-[#0118d8] hover:text-[#0118d8]">
            {totalPages}
          </Link>
        </>
      )}
      {currentPage < totalPages && (
        <Link href={hrefFor(currentPage + 1)} className="rounded border px-3 py-2 hover:border-[#0118d8] hover:text-[#0118d8]">
          {locale === 'en' ? 'Next' : 'Sau'}
        </Link>
      )}
    </nav>
  );
}

export default function CategoryArchive({
  category,
  posts,
  sidebar,
  locale,
  basePath,
  currentPage = 1,
  totalPages = 1,
}: CategoryArchiveProps) {
  const isEn = locale === 'en';
  const categoryName = stripHtml(category.name);
  const isRecruitment = category.id === 85 || category.slug === 'thong-tin-tuyen-dung';
  const isTitleOnly = TITLE_ONLY_CATEGORIES.has(category.slug);

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              { label: categoryName },
            ]}
          />
        </div>
      </div>

      <div
        className={`mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8 ${
          sidebar ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : ''
        }`}
      >
        <section className="min-w-0">
          <h1 className="mb-8 border-b-[3px] border-[#0118d8] pb-2 text-2xl font-bold uppercase text-[#0118d8]">
            {categoryName}
          </h1>

          {posts.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-5 py-8 text-center text-slate-500">
              {isEn ? 'No posts in this category yet.' : 'Chưa có bài viết trong chuyên mục này.'}
            </p>
          ) : isRecruitment ? (
            <RecruitmentLayout posts={posts} locale={locale} />
          ) : isTitleOnly ? (
            <TitleOnlyLayout posts={posts} locale={locale} />
          ) : (
            <GeneralCategoryLayout posts={posts} locale={locale} />
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={basePath}
            locale={locale}
          />
        </section>

        {sidebar && (
          <aside className="lg:sticky lg:top-[140px] lg:self-start">
            <CategorySidebar data={sidebar} locale={locale} currentCategoryId={category.id} />
          </aside>
        )}
      </div>
    </main>
  );
}
