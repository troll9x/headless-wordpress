'use client';

import Image from 'next/image';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import SectionTitle from '@/components/ui/SectionTitle';
import { stripHtml } from '@/lib/utils/html';
import type { PartnerLogo } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMedia, WPPost } from '@/types/wordpress';

function imageOf(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && !('code' in media) ? media : null;
}

const FALLBACK_LOGOS: PartnerLogo[] = [
  ['bhms', 'BHMS', 'https://tlu.edu.vn/wp-content/uploads/2025/07/Business-and-Hotel-Management-School-%E2%80%93-BHMS.webp'],
  ['busitema', 'Busitema University', 'https://tlu.edu.vn/wp-content/uploads/2025/07/Busitema-University.webp'],
  ['california', 'California State University Channel Islands', 'https://tlu.edu.vn/wp-content/uploads/2025/07/California-State-University-Channel-Islands.webp'],
  ['kyungnam', 'Kyungnam', 'https://tlu.edu.vn/wp-content/uploads/2025/07/Cao-dang-cong-nghe-thong-tin-Kyungnam.webp'],
  ['charisma', 'Charisma University', 'https://tlu.edu.vn/wp-content/uploads/2025/07/Charisma-University.webp'],
  ['chonnam', 'Chonnam National University', 'https://tlu.edu.vn/wp-content/uploads/2025/07/Chonnam-National-University.webp'],
].map(([id, title, imageUrl]) => ({ id, title, imageUrl, linkUrl: null }));

function logosFromPosts(posts: WPPost[]): PartnerLogo[] {
  return posts.flatMap((post) => {
    const media = imageOf(post);
    if (!media) return [];

    return [{
      id: `post-${post.id}`,
      title: media.alt_text || stripHtml(post.title.rendered),
      imageUrl: media.source_url,
      linkUrl: null,
    }];
  });
}

export default function DoiTac({
  logos,
  fallbackPosts,
  locale,
}: {
  logos: PartnerLogo[];
  fallbackPosts: WPPost[];
  locale: Locale;
}) {
  const postLogos = logosFromPosts(fallbackPosts);
  const items = logos.length > 0 ? logos : postLogos.length > 0 ? postLogos : FALLBACK_LOGOS;
  // OwlCarousel tự clone slide để loop. Swiper cần đủ slide ở breakpoint 6 cột,
  // nên chỉ nhân bản dữ liệu trình chiếu khi danh sách có từ 2 đến 6 logo.
  const carouselItems = items.length > 1 && items.length <= 6
    ? Array.from({ length: Math.ceil(12 / items.length) }, () => items).flat()
    : items;
  const title = locale === 'en' ? 'Partner Network' : 'Mạng Lưới Đối Tác';
  const description = locale === 'en'
    ? 'Thuyloi University is proud to partner with leading universities, research institutes and enterprises around the world. These diverse relationships create opportunities for learners to expand their knowledge and global experience.'
    : 'Trường Đại học Thủy lợi tự hào là đối tác của các đại học, viện nghiên cứu, doanh nghiệp, tập đoàn hàng đầu thế giới. Những mối quan hệ đối tác đa dạng nhiều lĩnh vực mở ra nhiều cơ hội cho người học làm giàu thêm kiến thức và trải nghiệm toàn cầu của chính mình.';

  return (
    <section className="bg-[#0118d8] py-12 text-white sm:py-16" aria-label={title}>
      <div className="mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
        <SectionTitle title={title} light className="!mb-5" />
        <p className="mx-auto max-w-3xl text-base leading-7 text-white sm:text-xl sm:leading-9">
          {description}
        </p>

        <div className="partner-logo-slider mt-8 bg-white px-8 py-4 sm:px-12">
          <Swiper
            modules={[Autoplay]}
            slidesPerView={2}
            spaceBetween={10}
            loop={carouselItems.length > 6}
            speed={700}
            autoplay={{ delay: 3_000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            watchOverflow
            breakpoints={{
              600: { slidesPerView: 4 },
              1000: { slidesPerView: 6 },
            }}
          >
            {carouselItems.map((logo, index) => (
              <SwiperSlide key={`${logo.id}-${index}`}>
                {logo.linkUrl ? (
                  <a
                    href={logo.linkUrl}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="group flex h-[90px] items-center justify-center p-2"
                    title={logo.title}
                  >
                    <Image
                      src={logo.imageUrl}
                      alt={logo.title}
                      width={200}
                      height={90}
                      className="h-[90px] w-full max-w-[200px] object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </a>
                ) : (
                  <div className="group flex h-[90px] items-center justify-center p-2" title={logo.title}>
                    <Image
                      src={logo.imageUrl}
                      alt={logo.title}
                      width={200}
                      height={90}
                      className="h-[90px] w-full max-w-[200px] object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
