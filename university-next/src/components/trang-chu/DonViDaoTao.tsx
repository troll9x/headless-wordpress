'use client';

import { useState } from 'react';
import { Autoplay, Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import styles from './DonViDaoTao.module.css';
import type { FacultySliderItem } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

const FALLBACK_IMAGE = 'https://tlu.edu.vn/wp-content/uploads/2025/07/Toan-truong-decan-boi-len-focmex-3ly-scaled.webp';
const FALLBACK_ITEMS: Record<Locale, FacultySliderItem[]> = {
  vi: [
    {
      id: -1,
      slug: 'khoa-dien-dien-tu',
      title: 'Khoa Điện - Điện tử',
      description: 'Khoa đào tạo nguồn nhân lực chất lượng cao trong lĩnh vực điện, điện tử, điều khiển và tự động hóa.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Khoa Điện - Điện tử',
      websiteUrl: 'https://ee.tlu.edu.vn/',
    },
    {
      id: -2,
      slug: 'khoa-cong-trinh',
      title: 'Khoa Công trình',
      description: 'Đơn vị đào tạo, nghiên cứu khoa học và chuyển giao công nghệ trong lĩnh vực xây dựng và công trình thủy.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Khoa Công trình',
      websiteUrl: 'https://ce.tlu.edu.vn/',
    },
    {
      id: -3,
      slug: 'khoa-ky-thuat-tai-nguyen-nuoc',
      title: 'Khoa Kỹ thuật Tài nguyên nước',
      description: 'Đào tạo và nghiên cứu chuyên sâu về tài nguyên nước, thủy lợi và thích ứng với biến đổi khí hậu.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Khoa Kỹ thuật Tài nguyên nước',
      websiteUrl: 'https://wre.tlu.edu.vn/',
    },
  ],
  en: [
    {
      id: -1,
      slug: 'faculty-of-electrical-and-electronic-engineering',
      title: 'Faculty of Electrical and Electronic Engineering',
      description: 'Training highly qualified professionals in electrical engineering, electronics, control and automation.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Faculty of Electrical and Electronic Engineering',
      websiteUrl: 'https://ee.tlu.edu.vn/',
    },
    {
      id: -2,
      slug: 'faculty-of-civil-engineering',
      title: 'Faculty of Civil Engineering',
      description: 'Education, scientific research and technology transfer in construction and hydraulic engineering.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Faculty of Civil Engineering',
      websiteUrl: 'https://ce.tlu.edu.vn/',
    },
    {
      id: -3,
      slug: 'faculty-of-water-resources-engineering',
      title: 'Faculty of Water Resources Engineering',
      description: 'Advanced education and research in water resources, irrigation and climate-change adaptation.',
      imageUrl: FALLBACK_IMAGE,
      imageAlt: 'Faculty of Water Resources Engineering',
      websiteUrl: 'https://wre.tlu.edu.vn/',
    },
  ],
};

function uniqueFacultyItems(items: FacultySliderItem[]): FacultySliderItem[] {
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    const normalizedTitle = item.title.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (seenTitles.has(normalizedTitle)) return false;
    seenTitles.add(normalizedTitle);
    return true;
  });
}

export default function DonViDaoTao({
  posts,
  locale,
}: {
  posts: FacultySliderItem[];
  locale: Locale;
}) {
  const items = uniqueFacultyItems(posts.length > 0 ? posts : FALLBACK_ITEMS[locale]);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = items[activeIndex] ?? items[0];
  const title = locale === 'en' ? 'Training and S&T units' : 'Các đơn vị đào tạo, KHCN';
  const buttonLabel = locale === 'en' ? `Explore ${selected.title}` : `Khám phá ${selected.title}`;

  return (
    <section className={styles.container} aria-label={title}>
      <div className={styles.left}>
        <h2 className={styles.title}>{title}</h2>
        <Swiper
          key={`${locale}-${items.map((item) => item.id).join('-')}`}
          className={styles.namesSlider}
          modules={[Autoplay, Mousewheel]}
          direction="vertical"
          slidesPerView={3}
          centeredSlides
          loop={items.length > 3}
          speed={800}
          autoplay={{ delay: 2_000, disableOnInteraction: false }}
          mousewheel
          onInit={(swiper) => setActiveIndex(swiper.realIndex)}
          onSlideChangeTransitionEnd={(swiper) => setActiveIndex(swiper.realIndex)}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id} className={styles.nameSlide}>
              {item.websiteUrl ? (
                <a
                  href={item.websiteUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className={styles.nameLink}
                >
                  {item.title}
                </a>
              ) : (
                <span className={styles.nameLink}>{item.title}</span>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
        <div className={styles.gradientTop} />
        <div className={styles.gradientBottom} />
      </div>

      <div className={styles.right}>
        <div
          className={styles.background}
          style={{
            backgroundImage: selected.imageUrl ? `url("${selected.imageUrl}")` : 'none',
            opacity: selected.imageUrl ? 1 : 0,
          }}
          role="img"
          aria-label={selected.imageUrl ? selected.imageAlt : undefined}
        />
        <div className={styles.content}>
          <div className={styles.description} aria-live="polite">
            {selected.description || (locale === 'en' ? 'Information is being updated.' : 'Thông tin đang được cập nhật.')}
          </div>
          {selected.websiteUrl && (
            <a
              href={selected.websiteUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className={styles.button}
            >
              {buttonLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
