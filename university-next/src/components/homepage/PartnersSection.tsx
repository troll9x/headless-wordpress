import Image from 'next/image';
import SectionHeader from '@/components/ui/SectionHeader';
import type { WPPost, WPMedia } from '@/types/wordpress';

interface PartnersSectionProps {
  posts: WPPost[];
}

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export default function PartnersSection({ posts }: PartnersSectionProps) {
  const withLogos = posts.filter((p) => getFeaturedImage(p) !== null);
  if (withLogos.length === 0) return null;

  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Đối tác & Liên kết" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {withLogos.map((post) => {
            const image = getFeaturedImage(post)!;
            const altText =
              image.alt_text || post.title.rendered.replace(/<[^>]+>/g, '').trim();

            return (
              <div
                key={post.id}
                className="flex items-center justify-center rounded-lg border border-slate-100 p-4 grayscale transition-all hover:grayscale-0 hover:shadow-md"
                title={post.title.rendered.replace(/<[^>]+>/g, '').trim()}
              >
                <div className="relative h-12 w-full">
                  <Image
                    src={image.source_url}
                    alt={altText}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
