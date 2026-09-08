import Image from 'next/image';
import { stripHtml } from '@/lib/utils/html';
import type { CategoryBannerData } from '@/types/wordpress';

export default function CategoryBanner({ banner }: { banner: CategoryBannerData }) {
  return (
    <section className="relative w-full overflow-hidden bg-slate-100" aria-label={stripHtml(banner.categoryName)}>
      <Image
        src={banner.imageUrl}
        alt={banner.imageAlt}
        width={banner.width}
        height={banner.height}
        priority
        sizes="100vw"
        className="block min-h-[180px] w-full object-cover sm:min-h-0"
      />
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 sm:bottom-8">
        <div className="-skew-x-[18deg] bg-[rgba(0,12,144,0.82)] px-8 py-3 shadow-lg sm:px-12 sm:py-5">
          <span className="block skew-x-[18deg] text-center text-xl font-semibold text-white sm:text-3xl lg:text-4xl">
            {stripHtml(banner.categoryName)}
          </span>
        </div>
      </div>
    </section>
  );
}
