import Image from 'next/image';
import Link from 'next/link';
import { sanitizeCmsHtml, sanitizeInlineHtml } from '@/lib/security/html';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faGraduationCap,
  faMoneyCheckDollar,
  faPlane,
  faShieldHeart,
  faSuitcaseMedical,
} from '@fortawesome/free-solid-svg-icons';
import { ArticleShareButton, ArticleVoiceControls } from '@/components/bai-viet/ArticleActions';
import CategoryBanner from '@/components/chuyen-muc/CategoryBanner';
import CategorySidebar from '@/components/chuyen-muc/CategorySidebar';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  buildCategoryUrl,
  buildPostUrl,
  getHomePath,
  getNewsPath,
} from '@/constants/duong-dan';
import { formatDate, toISODate } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import { recruitmentDetailStyles } from '@/styles/tlu-template-recipes';
import type { Locale } from '@/types/ngon-ngu';
import type {
  CategorySidebarData,
  CategoryBannerData,
  WPAuthor,
  WPCategory,
  WPMedia,
  WPPost,
  WPTag,
} from '@/types/wordpress';

interface ChiTietBaiVietProps {
  post: WPPost;
  locale: Locale;
  sidebar?: CategorySidebarData | null;
  relatedPosts?: WPPost[];
  previousPost?: WPPost | null;
  nextPost?: WPPost | null;
  categoryBanner?: CategoryBannerData | null;
}

const ARTICLE_BODY_CLASSES = [
  'text-base leading-7 text-slate-700',
  '[&_h1]:mb-2 [&_h1]:mt-7 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-[1.3] [&_h1]:text-slate-900',
  '[&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-[1.3] [&_h2]:text-slate-900',
  '[&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:leading-[1.3] [&_h3]:text-slate-900',
  '[&_h4]:mb-2 [&_h4]:mt-7 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:leading-[1.3] [&_h4]:text-slate-900',
  '[&_h5]:mb-2 [&_h5]:mt-7 [&_h5]:font-bold [&_h5]:leading-[1.3] [&_h5]:text-slate-900',
  '[&_h6]:mb-2 [&_h6]:mt-7 [&_h6]:font-bold [&_h6]:leading-[1.3] [&_h6]:text-slate-900',
  '[&_p]:mb-5',
  '[&_a]:text-[#0118d8] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#136aa0]',
  '[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5',
  '[&_img]:mx-auto [&_img]:my-6 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg',
  '[&_figure]:my-6 [&_figure]:text-center [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-slate-500',
  '[&_blockquote]:my-6 [&_blockquote]:rounded-r-md [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-yellow-50 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-slate-600',
  '[&_table]:mb-5 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[0.9rem]',
  '[&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-900',
  '[&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_tr:nth-child(even)_td]:bg-slate-50',
  '[&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-200',
  '[&_strong]:font-semibold [&_strong]:text-slate-800 [&_b]:font-semibold [&_b]:text-slate-800',
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm',
  '[&_pre]:mb-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-800 [&_pre]:p-5 [&_pre]:text-slate-200',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_.aligncenter]:mx-auto [&_.aligncenter]:block [&_.alignleft]:float-left [&_.alignleft]:mb-2 [&_.alignleft]:mr-6',
  '[&_.alignright]:float-right [&_.alignright]:mb-2 [&_.alignright]:ml-6 [&_.wp-caption]:max-w-full',
  '[&_.wp-caption-text]:mt-1.5 [&_.wp-caption-text]:text-center [&_.wp-caption-text]:text-sm [&_.wp-caption-text]:text-slate-500',
  '[&_.cke_show_border]:w-full [&_.cke_show_border]:border-collapse [&_.cke_show_border]:border [&_.cke_show_border]:border-black',
  '[&_.cke_show_border_td]:border [&_.cke_show_border_td]:border-black [&_.cke_show_border_td]:p-1.5',
  '[&_.cke_show_border_th]:border [&_.cke_show_border_th]:border-black [&_.cke_show_border_th]:p-1.5',
].join(' ');

const BENEFITS = [
  { vi: 'Bảo hiểm', en: 'Insurance', icon: faSuitcaseMedical },
  { vi: 'Du lịch', en: 'Travel', icon: faPlane },
  { vi: 'Thưởng', en: 'Bonuses', icon: faMoneyCheckDollar },
  { vi: 'Chăm sóc sức khỏe', en: 'Healthcare', icon: faShieldHeart },
  { vi: 'Đào tạo', en: 'Training', icon: faGraduationCap },
  { vi: 'Tăng lương', en: 'Salary review', icon: faChartLine },
] as const;

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && 'source_url' in media ? media : null;
}

function getTerms(post: WPPost): Array<WPCategory | WPTag> {
  return (post._embedded?.['wp:term'] ?? [])
    .flat()
    .filter((term): term is WPCategory | WPTag => !('code' in term));
}

function getAuthor(post: WPPost): WPAuthor | null {
  const author = post._embedded?.author?.[0];
  return author && 'name' in author ? author : null;
}

function getApplicationUrl(post: WPPost): string | null {
  const candidateKeys = [
    'link_ung_tuyen',
    'url_ung_tuyen',
    'ung_tuyen',
    'application_url',
    'apply_url',
  ];

  for (const key of candidateKeys) {
    const value = post.acf?.[key] ?? post.meta?.[key];
    const url = typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'url' in value && typeof value.url === 'string'
        ? value.url
        : '';

    if (/^(https?:\/\/|mailto:)/i.test(url)) return url;
  }

  return null;
}

function RelatedPosts({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  if (posts.length === 0) return null;
  const isEn = locale === 'en';

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <h3 className="mb-5 text-xl font-semibold text-[#0118d8]">
        {isEn ? 'Related articles' : 'Bài viết cùng chủ đề:'}
      </h3>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {posts.map((relatedPost) => {
          const image = getFeaturedImage(relatedPost);
          const href = buildPostUrl(relatedPost.slug, locale, relatedPost.link);
          const title = stripHtml(relatedPost.title.rendered);

          return (
            <li key={relatedPost.id} className="group min-w-0">
              <Link href={href} className="relative block aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">
                {image ? (
                  <Image
                    src={image.source_url}
                    alt={image.alt_text || title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 210px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-sm text-slate-400">TLU</span>
                )}
              </Link>
              <h4 className="mt-2 line-clamp-3 text-[15px] font-semibold leading-5 text-slate-800 transition-colors group-hover:text-[#0118d8]">
                <Link href={href}>{title}</Link>
              </h4>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Shared post detail renderer. Accepts server-fetched WordPress data. */
export default function ChiTietBaiViet({
  post,
  locale,
  sidebar,
  relatedPosts = [],
  previousPost,
  nextPost,
  categoryBanner,
}: ChiTietBaiVietProps) {
  const terms = getTerms(post);
  const categories = terms.filter((term) => term.taxonomy === 'category');
  const tags = terms.filter((term) => term.taxonomy === 'post_tag');
  const author = getAuthor(post);
  const titleText = stripHtml(post.title.rendered);
  const isEn = locale === 'en';
  const isRecruitment = categories.some((category) => category.slug === 'thong-tin-tuyen-dung');
  const applicationUrl = getApplicationUrl(post);
  const homeHref = getHomePath(locale);
  const newsHref = getNewsPath(locale);

  return (
    <div className="min-h-screen bg-white">
      {categoryBanner && <CategoryBanner banner={categoryBanner} />}

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: homeHref },
              { label: isEn ? 'News' : 'Tin tức', href: newsHref },
              { label: titleText },
            ]}
          />
        </div>
      </div>

      <main
        className={`mx-auto grid max-w-7xl gap-8 px-4 py-10 max-[640px]:pt-[10%] sm:px-6 lg:px-8 ${
          sidebar ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : ''
        }`}
      >
        <article className="min-w-0">
          {categories.length > 0 && (
            <div className="mb-[15px] flex flex-wrap items-center gap-2">
              <span className="mr-[5px] rounded bg-[#0118d8] px-2.5 py-1 text-sm font-semibold text-white">
                {isEn ? 'Categories' : 'Danh mục'}
              </span>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={buildCategoryUrl(category.slug, locale)}
                  className="rounded bg-[#dedede] px-2.5 py-1 text-sm text-[#464646] transition-colors hover:bg-[#007bff] hover:text-white"
                >
                  {stripHtml(category.name)}
                </Link>
              ))}
            </div>
          )}

          <h1
            className="my-[10px] text-center font-['Raleway',Arial,sans-serif] text-3xl font-bold leading-tight text-[#0118d8] sm:text-4xl"
            dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }}
          />

          <div className="mt-4 flex flex-col items-center gap-x-4 gap-y-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:justify-center">
            <time dateTime={toISODate(post.date)}>{formatDate(post.date, locale)}</time>
            {author && (
              <>
                <span aria-hidden="true">·</span>
                <span>{author.name}</span>
              </>
            )}
          </div>


          {isRecruitment && (
            <section className="mt-8" aria-labelledby="benefits-heading">
              <h2 id="benefits-heading" className="mb-4 text-2xl font-semibold text-slate-900">
                {isEn ? 'Benefits' : 'Phúc Lợi'}
              </h2>
              <div className={recruitmentDetailStyles.benefits}>
                {BENEFITS.map((benefit) => (
                  <div key={benefit.vi} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                    <FontAwesomeIcon icon={benefit.icon} className="h-5 w-5 text-[#009051]" />
                    <span className={recruitmentDetailStyles.benefitLabel}>
                      {isEn ? benefit.en : benefit.vi}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="recruitment-content" className="mt-8 scroll-mt-36">
            <ArticleVoiceControls
              contentId="article-readable-content"
              locale={locale}
              postId={post.id}
            />
            <div
              id="article-readable-content"
              className={ARTICLE_BODY_CLASSES}
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(post.content.rendered) }}
            />
          </section>

          {isRecruitment && (
            <div className="my-10 text-center">
              <a
                href={applicationUrl ?? '#recruitment-content'}
                target={applicationUrl?.startsWith('http') ? '_blank' : undefined}
                rel={applicationUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="inline-flex rounded-[17px] bg-[#009051] px-8 py-3 text-lg font-bold text-white shadow transition hover:-translate-y-0.5 hover:bg-[#007c45] hover:shadow-lg"
              >
                {isEn ? 'Apply now' : 'Ứng Tuyển Ngay'}
              </a>
            </div>
          )}

          <div className="my-8 flex justify-center border-y border-slate-100 py-6">
            <ArticleShareButton locale={locale} title={titleText} />
          </div>

          {(categories.length > 0 || tags.length > 0) && (
            <footer className="space-y-4 rounded-lg bg-slate-50 p-5 text-sm">
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{isEn ? 'Categories:' : 'Danh mục:'}</strong>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={buildCategoryUrl(category.slug, locale)}
                      className="rounded bg-white px-3 py-1 text-[#0118d8] shadow-sm hover:bg-[#0118d8] hover:text-white"
                    >
                      {stripHtml(category.name)}
                    </Link>
                  ))}
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{isEn ? 'Keywords:' : 'Từ khóa:'}</strong>
                  {tags.map((tag) => (
                    <span key={tag.id} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {stripHtml(tag.name)}
                    </span>
                  ))}
                </div>
              )}
            </footer>
          )}

          {(previousPost || nextPost) && (
            <nav className="mt-8 grid gap-4 border-y border-slate-200 py-6 sm:grid-cols-2" aria-label="Article navigation">
              <div>
                {previousPost && (
                  <Link href={buildPostUrl(previousPost.slug, locale, previousPost.link)} className="group block">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      ← {isEn ? 'Previous article' : 'Bài trước'}
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold text-slate-900 group-hover:text-[#0118d8]">
                      {stripHtml(previousPost.title.rendered)}
                    </span>
                  </Link>
                )}
              </div>
              <div className="text-left sm:text-right">
                {nextPost && (
                  <Link href={buildPostUrl(nextPost.slug, locale, nextPost.link)} className="group block">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {isEn ? 'Next article' : 'Bài tiếp theo'} →
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold text-slate-900 group-hover:text-[#0118d8]">
                      {stripHtml(nextPost.title.rendered)}
                    </span>
                  </Link>
                )}
              </div>
            </nav>
          )}

          <RelatedPosts posts={relatedPosts} locale={locale} />

          {author && (
            <section className="mt-10 flex items-start gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {author.avatar_urls?.['96'] || author.avatar_urls?.['48'] ? (
                <Image
                  src={author.avatar_urls['96'] ?? author.avatar_urls['48']}
                  alt={author.name}
                  width={90}
                  height={90}
                  className="h-[90px] w-[90px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-500">
                  {author.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h5 className="font-bold uppercase text-slate-900">{author.name}</h5>
                {author.description && <p className="mt-2 text-sm leading-6 text-slate-600">{author.description}</p>}
              </div>
            </section>
          )}

          <div className="mt-12 border-t border-slate-100 pt-8">
            <Link
              href={newsHref}
              className="inline-flex items-center gap-2 rounded border border-slate-200 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:border-[#0118d8] hover:text-[#0118d8]"
            >
              <span aria-hidden="true">←</span>
              {isEn ? 'Back to News' : 'Quay lại Tin tức'}
            </Link>
          </div>
        </article>

        {sidebar && (
          <aside className="lg:sticky lg:top-[140px] lg:self-start">
            <CategorySidebar
              data={sidebar}
              locale={locale}
              currentCategoryId={categories[0]?.id}
            />
          </aside>
        )}
      </main>
    </div>
  );
}

export { getFeaturedImage, buildPostUrl };
