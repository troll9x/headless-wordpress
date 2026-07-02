import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
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
}

export default function NewsCard({
  post,
  variant = 'card',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
}: NewsCardProps) {
  const image = getFeaturedImage(post);
  const href = `/tin-tuc/${post.slug}`;

  if (variant === 'horizontal') {
    return (
      <article className="group flex items-start gap-3">
        {image && (
          <Link
            href={href}
            aria-hidden="true"
            tabIndex={-1}
            className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-slate-100"
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
          <time className="block text-xs text-slate-400">{formatDate(post.date)}</time>
          <h3 className="line-clamp-2 text-sm font-medium text-slate-800 transition-colors group-hover:text-blue-800">
            <Link href={href}>
              <span dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className="relative block aspect-video overflow-hidden bg-slate-100"
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
        <time className="block text-xs text-slate-400">{formatDate(post.date)}</time>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-800">
          <Link href={href}>
            <span dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
          </Link>
        </h3>
      </div>
    </article>
  );
}
