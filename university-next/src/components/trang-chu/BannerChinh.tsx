'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { A11y, Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import styles from './BannerChinh.module.css';
import type { HeroData, HeroSlide } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

interface BannerChinhProps {
  data: HeroData;
  slides: HeroSlide[];
  locale: Locale;
}

const AUTOPLAY_DELAY_MS = 4_500;
const DESKTOP_BANNER = 'https://tlu.edu.vn/wp-content/uploads/2025/07/Chao-K68.webp';
const MOBILE_BANNER = 'https://tlu.edu.vn/wp-content/uploads/2025/07/tracuu.webp';

function fallbackSlide(data: HeroData, isEn: boolean): HeroSlide | null {
  const src = data.backgroundImageUrl ?? (isEn ? null : DESKTOP_BANNER);
  if (!src) return null;

  return {
    id: 'fallback-home-banner',
    kind: 'image',
    src,
    mobileSrc: !data.backgroundImageUrl && !isEn ? MOBILE_BANNER : null,
    posterUrl: null,
    alt: data.backgroundImageAlt || (isEn ? 'Thuyloi University' : 'Trường Đại học Thủy lợi'),
    title: data.title,
    linkUrl: data.ctaUrl,
    linkTarget: '_self',
    mimeType: null,
  };
}

function SlideMedia({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  if (slide.kind === 'video') {
    return (
      <video
        className={styles.media}
        src={slide.src}
        poster={slide.posterUrl ?? undefined}
        muted
        loop
        playsInline
        preload={priority ? 'auto' : 'metadata'}
        aria-label={slide.alt || slide.title || 'Banner video'}
      />
    );
  }

  return (
    <picture>
      {slide.mobileSrc && <source media="(max-width: 767px)" srcSet={slide.mobileSrc} />}
      <Image
        src={slide.src}
        alt={slide.alt}
        className={styles.media}
        fill
        sizes="100vw"
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
      />
    </picture>
  );
}

export default function BannerChinh({ data, slides, locale }: BannerChinhProps) {
  const isEn = locale === 'en';
  const fallback = fallbackSlide(data, isEn);
  const items = slides.length > 0 ? slides : fallback ? [fallback] : [];
  const hasMultipleSlides = items.length > 1;
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const syncVideos = useCallback((swiper: SwiperInstance) => {
    const videos = swiper.el.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach((video) => {
      const active = video.closest('.swiper-slide')?.classList.contains('swiper-slide-active');
      if (active && !reduceMotion) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        if (!active) video.currentTime = 0;
      }
    });
  }, [reduceMotion]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;

    if (reduceMotion || !hasMultipleSlides) swiper.autoplay.stop();
    else swiper.autoplay.start();
    syncVideos(swiper);
  }, [hasMultipleSlides, reduceMotion, syncVideos]);

  const label = isEn ? 'Homepage highlights' : 'Nội dung nổi bật trang chủ';

  if (items.length === 0) return null;

  return (
    <section
      className={styles.root}
      aria-label={label}
      aria-roledescription={hasMultipleSlides ? 'carousel' : undefined}
    >
      <Swiper
        className={styles.swiper}
        modules={[A11y, Autoplay, Pagination]}
        slidesPerView={1}
        loop={hasMultipleSlides}
        speed={700}
        autoplay={hasMultipleSlides ? {
          delay: AUTOPLAY_DELAY_MS,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
          waitForTransition: true,
        } : false}
        pagination={hasMultipleSlides ? { clickable: true } : false}
        a11y={{
          enabled: true,
          paginationBulletMessage: isEn ? 'Go to banner {{index}}' : 'Đi đến banner {{index}}',
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          syncVideos(swiper);
        }}
        onSlideChangeTransitionEnd={syncVideos}
        onAutoplayPause={syncVideos}
      >
        {items.map((slide, index) => (
          <SwiperSlide key={slide.id} className={styles.slide}>
            {slide.linkUrl ? (
              <a
                href={slide.linkUrl}
                target={slide.linkTarget}
                rel={slide.linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
                className={styles.mediaLink}
                aria-label={slide.title || slide.alt || undefined}
              >
                <SlideMedia slide={slide} priority={index === 0} />
              </a>
            ) : (
              <SlideMedia slide={slide} priority={index === 0} />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
