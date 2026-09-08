import Image from 'next/image';
import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import { formatDate } from '@/lib/utils/date';
import { buildPostUrl } from '@/constants/duong-dan';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost, WPMedia } from '@/types/wordpress';

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

interface NewsCardProps {
  post: WPPost;
  variant?: 'card' | 'horizontal';
  sizes?: string;
  locale?: Locale;
}

export default function NewsCard({
  post,
  variant = 'card',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  locale = 'vi',
}: NewsCardProps) {
  const image = getFeaturedImage(post);
  const href = buildPostUrl(post.slug, locale, post.link);

  if (variant === 'horizontal') {
    return (
      <article className="group flex items-start gap-[15px] border-b border-[#eee] pb-5 last:border-b-0 sm:gap-3 sm:border-b-0 sm:pb-0">
        {image && (
          <Link
            href={href}
            aria-hidden="true"
            tabIndex={-1}
            className="relative h-[90px] w-[90px] flex-shrink-0 overflow-hidden rounded bg-slate-100 sm:h-16 sm:w-24"
          >
            <Image
              src={image.source_url}
              alt={image.alt_text || ''}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="96px"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <time className="mt-[5px] block text-[11px] text-[#777] sm:mt-0 sm:text-xs">{formatDate(post.date, locale)}</time>
          <h3 className="line-clamp-2 text-base font-normal leading-[1.3] text-[#5065a1] transition-colors group-hover:text-[#0118d8] sm:text-sm">
            <Link href={href}>
              <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  return (
    <article className="group overflow-hidden rounded-[10px] bg-white shadow-[0_5px_16px_0_rgba(2,55,102,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(2,55,102,0.14)]">
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className="relative block aspect-video overflow-hidden rounded-t-[10px] bg-slate-100"
      >
        {image ? (
          <Image
            src={image.source_url}
            alt={image.alt_text || ''}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={sizes}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-50 to-slate-100" />
        )}
      </Link>
      <div className="p-4">
        <time className="block pl-5 text-[13px] font-medium text-[#777]">{formatDate(post.date, locale)}</time>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-[#0118d8] transition-colors group-hover:text-[#2d2d2d]">
          <Link href={href}>
            <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
          </Link>
        </h3>
      </div>
    </article>
  );
}
