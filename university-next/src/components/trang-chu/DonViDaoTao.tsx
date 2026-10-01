'use client';

import { useState } from 'react';
import { Autoplay, Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import styles from './DonViDaoTao.module.css';
import type { FacultySliderItem } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

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
  const items = uniqueFacultyItems(posts);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = items[activeIndex] ?? items[0];
  const title = locale === 'en' ? 'Training and S&T units' : 'Các đơn vị đào tạo, KHCN';

  if (!selected) {
    return (
      <section className={styles.container} aria-label={title}>
        <div className={styles.left}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>
            {locale === 'en' ? 'Information is being updated.' : 'Thông tin đang được cập nhật.'}
          </p>
        </div>
      </section>
    );
  }

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
