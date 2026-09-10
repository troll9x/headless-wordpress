'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { HeadlessMedia } from '@/lib/wordpress/media-gallery';
import type { Locale } from '@/types/ngon-ngu';

interface MediaGalleryGridProps {
  images: HeadlessMedia[];
  featuredIndex?: number | null;
  compact?: boolean;
  emptyText: string;
  locale: Locale;
}

function imageSource(image: HeadlessMedia, compact: boolean): string {
  return compact
    ? image.sizes.large || image.sizes.medium || image.url
    : image.sizes.large || image.url;
}

export default function MediaGalleryGrid({
  images,
  featuredIndex = null,
  compact = false,
  emptyText,
  locale,
}: MediaGalleryGridProps) {
  const isEn = locale === 'en';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight') setActiveIndex((activeIndex + 1) % images.length);
      if (event.key === 'ArrowLeft') setActiveIndex((activeIndex - 1 + images.length) % images.length);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, images.length]);

  if (images.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-5 py-10 text-center text-slate-500">{emptyText}</p>;
  }

  return (
    <>
      <div className={compact
        ? 'grid auto-rows-[100px] grid-cols-3 gap-3 min-[576px]:auto-rows-[120px] min-[768px]:grid-cols-4 min-[768px]:auto-rows-[140px] min-[992px]:grid-cols-5 min-[992px]:auto-rows-[160px]'
        : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'}
      >
        {images.map((image, index) => {
          const featured = index === (featuredIndex ?? 6);
          return (
            <button
              key={`${image.id ?? image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group relative overflow-hidden rounded-lg bg-slate-100 text-left ${
                compact && featured
                  ? 'col-span-3 row-span-2 min-[768px]:row-span-3 min-[992px]:col-start-2 min-[992px]:row-span-2'
                  : compact ? '' : 'aspect-[4/3]'
              }`}
              aria-label={image.alt || image.title || `${isEn ? 'Image' : 'Ảnh'} ${index + 1}`}
            >
              <Image
                src={imageSource(image, compact)}
                alt={image.alt || image.title || ''}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes={compact
                  ? (featured ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 33vw, 20vw')
                  : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
              />
              {!compact && (image.title || image.caption) && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 text-sm font-semibold text-white">
                  {image.title || image.caption}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={images[activeIndex].alt || images[activeIndex].title || (isEn ? 'View image' : 'Xem ảnh')}
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
            aria-label={isEn ? 'Close' : 'Đóng'}
          >
            ×
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex - 1 + images.length) % images.length);
                }}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white hover:bg-white/25 sm:left-6"
                aria-label={isEn ? 'Previous image' : 'Ảnh trước'}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex + 1) % images.length);
                }}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white hover:bg-white/25 sm:right-6"
                aria-label={isEn ? 'Next image' : 'Ảnh tiếp theo'}
              >
                ›
              </button>
            </>
          )}
          <figure
            className="flex max-h-full max-w-6xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-[75vh] w-[90vw] max-w-6xl">
              <Image
                src={images[activeIndex].sizes.full || images[activeIndex].url}
                alt={images[activeIndex].alt || images[activeIndex].title || ''}
                fill
                priority
                sizes="90vw"
                className="object-contain"
              />
            </div>
            {(images[activeIndex].caption || images[activeIndex].title) && (
              <figcaption className="mt-3 max-w-3xl text-center text-sm text-white/90">
                {images[activeIndex].caption || images[activeIndex].title}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
