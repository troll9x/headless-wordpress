import MediaGalleryGrid from '@/components/media/MediaGalleryGrid';
import SectionTitle from '@/components/ui/SectionTitle';
import type { HeadlessMedia, HomeMediaGalleryData } from '@/lib/wordpress/media-gallery';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMedia, WPPost } from '@/types/wordpress';

function imageOf(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && !('code' in media) ? media : null;
}

function fallbackImages(posts: WPPost[]): HeadlessMedia[] {
  return posts.flatMap((post) => {
    const media = imageOf(post);
    if (!media) return [];
    return [{
      id: media.id,
      url: media.source_url,
      alt: media.alt_text,
      title: post.title.rendered,
      caption: '',
      description: '',
      width: media.media_details.width,
      height: media.media_details.height,
      mime_type: media.mime_type,
      sizes: {
        thumbnail: media.source_url,
        medium: media.source_url,
        large: media.source_url,
        full: media.source_url,
      },
    }];
  }).slice(0, 15);
}

export default function KhoanhKhacTLU({
  posts,
  gallery,
  locale,
}: {
  posts: WPPost[];
  gallery: HomeMediaGalleryData | null;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const images = gallery?.configured && gallery.selected_images.length > 0
    ? gallery.selected_images
    : fallbackImages(posts);

  return (
    <section className="bg-white py-[30px]" aria-label={isEn ? 'TLU Moments' : 'Khoảnh khắc TLU'}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionTitle title={isEn ? 'TLU Moments' : 'Khoảnh Khắc TLU'} />
        <MediaGalleryGrid
          images={images}
          locale={locale}
          featuredIndex={gallery?.featured_index}
          compact
          emptyText={isEn ? 'No images are available.' : 'Chưa có hình ảnh.'}
        />
      </div>
    </section>
  );
}
