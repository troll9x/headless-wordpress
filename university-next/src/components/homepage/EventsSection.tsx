import Image from 'next/image';
import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import { formatEventDate, toISODate } from '@/lib/utils/date';
import type { WPPost, WPMedia } from '@/types/wordpress';

interface EventsSectionProps {
  posts: WPPost[];
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export default function EventsSection({ posts }: EventsSectionProps) {
  return (
    <section className="bg-slate-50 py-12" aria-label="Sự kiện">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Sự Kiện" href="/su-kien" />
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có sự kiện.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => {
              const { day, month } = formatEventDate(post.date);
              const image = getFeaturedImage(post);
              return (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Link
                    href={`/tin-tuc/${post.slug}`}
                    className="relative block aspect-video overflow-hidden bg-slate-100"
                  >
                    {image ? (
                      <Image
                        src={image.source_url}
                        alt={image.alt_text || ''}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-100 to-blue-50" />
                    )}
                    {/* Date badge overlaid on image */}
                    <time
                      dateTime={toISODate(post.date)}
                      className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-blue-900 px-2 py-1.5 text-white"
                    >
                      <span className="text-lg font-bold leading-none">{day}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide">{month}</span>
                    </time>
                  </Link>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-800">
                      <Link href={`/tin-tuc/${post.slug}`}>
                        <span dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                      </Link>
                    </h3>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
