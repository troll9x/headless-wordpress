import Image from 'next/image';
import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import type { WPPost, WPMedia } from '@/types/wordpress';

interface MomentsGalleryProps {
  posts: WPPost[];
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export default function MomentsGallery({ posts }: MomentsGalleryProps) {
  const postsWithImages = posts.filter((p) => getFeaturedImage(p) !== null);

  return (
    <section className="bg-white py-12" aria-label="Khoảnh khắc TLU">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Khoảnh Khắc TLU" />
        {postsWithImages.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có hình ảnh.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {postsWithImages.slice(0, 8).map((post) => {
              const image = getFeaturedImage(post)!;
              return (
                <Link
                  key={post.id}
                  href={`/tin-tuc/${post.slug}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                >
                  <Image
                    src={image.source_url}
                    alt={image.alt_text || ''}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-blue-900/0 transition-colors duration-300 group-hover:bg-blue-900/30" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
