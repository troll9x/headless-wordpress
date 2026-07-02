import Image from 'next/image';
import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import NewsCard from '@/components/ui/NewsCard';
import { formatDate } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import type { WPPost, WPMedia } from '@/types/wordpress';

interface NewsSectionProps {
  posts: WPPost[];
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export default function NewsSection({ posts }: NewsSectionProps) {
  if (posts.length === 0) {
    return (
      <div>
        <SectionTitle title="Tin Tức" href="/tin-tuc" />
        <p className="py-6 text-center text-sm text-slate-400">Chưa có tin tức.</p>
      </div>
    );
  }

  const [featured, ...rest] = posts;
  const featuredImage = getFeaturedImage(featured);
  const featuredExcerpt = featured.excerpt.rendered
    ? stripHtml(featured.excerpt.rendered)
    : null;

  return (
    <div>
      <SectionTitle title="Tin Tức" href="/tin-tuc" />

      {/* Featured post */}
      <article className="group mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
        <Link
          href={`/tin-tuc/${featured.slug}`}
          aria-hidden="true"
          tabIndex={-1}
          className="relative block aspect-video overflow-hidden bg-slate-100"
        >
          {featuredImage ? (
            <Image
              src={featuredImage.source_url}
              alt={featuredImage.alt_text || ''}
              fill
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-50 to-slate-100" />
          )}
        </Link>
        <div className="p-5">
          <time className="block text-xs text-slate-400">{formatDate(featured.date)}</time>
          <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-800 sm:text-lg">
            <Link href={`/tin-tuc/${featured.slug}`}>
              <span dangerouslySetInnerHTML={{ __html: featured.title.rendered }} />
            </Link>
          </h3>
          {featuredExcerpt && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">{featuredExcerpt}</p>
          )}
        </div>
      </article>

      {/* Remaining posts — compact horizontal list */}
      {rest.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rest.slice(0, 4).map((post) => (
            <li key={post.id} className="py-3 first:pt-0">
              <NewsCard post={post} variant="horizontal" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
