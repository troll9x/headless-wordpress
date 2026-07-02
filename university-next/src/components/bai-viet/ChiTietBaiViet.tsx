import Image from 'next/image';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { formatDate, toISODate } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import type { WPPost, WPMedia, WPAuthor, WPCategory, WPTag } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';
import { buildPostUrl, getNewsPath, getHomePath } from '@/constants/duong-dan';

interface ChiTietBaiVietProps {
  post: WPPost;
  locale: Locale;
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

function getCategories(post: WPPost): Array<WPCategory | WPTag> {
  return (post._embedded?.['wp:term']?.[0] ?? []).filter(
    (t): t is WPCategory | WPTag => !('code' in t)
  );
}

function getAuthor(post: WPPost): WPAuthor | null {
  const author = post._embedded?.author?.[0];
  if (!author || 'code' in author) return null;
  return author as WPAuthor;
}

/** Shared post detail renderer. Accepts the fetched post and locale. */
export default function ChiTietBaiViet({ post, locale }: ChiTietBaiVietProps) {
  const image = getFeaturedImage(post);
  const categories = getCategories(post);
  const author = getAuthor(post);
  const titleText = stripHtml(post.title.rendered);

  const isEn = locale === 'en';
  const homeLabel = isEn ? 'Home' : 'Trang chủ';
  const newsLabel = isEn ? 'News' : 'Tin tức';
  const backLabel = isEn ? 'Back to News' : 'Quay lại Tin tức';
  const homeHref = getHomePath(locale);
  const newsHref = getNewsPath(locale);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: homeLabel, href: homeHref },
              { label: newsLabel, href: newsHref },
              { label: titleText },
            ]}
          />
        </div>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Category badges */}
        {categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Meta: date · author */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <time dateTime={toISODate(post.date)}>{formatDate(post.date)}</time>
          {author && (
            <>
              <span aria-hidden="true">·</span>
              <span>{author.name}</span>
            </>
          )}
        </div>

        {/* Featured image */}
        {image && (
          <div className="mt-8 overflow-hidden rounded-xl shadow-sm">
            <div className="relative aspect-video w-full">
              <Image
                src={image.source_url}
                alt={image.alt_text || titleText}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 896px) 100vw, 896px"
              />
            </div>
          </div>
        )}

        {/* WordPress content HTML */}
        <div
          className="article-body mt-8"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Back link */}
        <div className="mt-12 border-t border-slate-100 pt-8">
          <Link
            href={newsHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-800"
          >
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>
        </div>
      </article>
    </div>
  );
}

/** Re-export helpers for use in page-level generateMetadata. */
export { getFeaturedImage, buildPostUrl };
