import type { HeroData } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

interface BannerChinhProps {
  data: HeroData;
  locale: Locale;
}

const DESKTOP_BANNER = 'https://tlu.edu.vn/wp-content/uploads/2025/07/Chao-K68.webp';
const MOBILE_BANNER = 'https://tlu.edu.vn/wp-content/uploads/2025/07/tracuu.webp';

export default function BannerChinh({ data, locale }: BannerChinhProps) {
  const desktopImage = data.backgroundImageUrl ?? DESKTOP_BANNER;
  const isEn = locale === 'en';

  return (
    <section className="relative w-full overflow-hidden bg-sky-100" aria-label={isEn ? 'Homepage banner' : 'Banner trang chủ'}>
      <picture>
        <source media="(max-width: 767px)" srcSet={MOBILE_BANNER} />
        {/* Ảnh banner do WordPress quản lý, có thể thay đổi theo từng đợt tuyển sinh. */}
        <img
          src={desktopImage}
          alt={data.backgroundImageAlt || (isEn ? 'Thuyloi University' : 'Trường Đại học Thủy lợi')}
          className="block aspect-[2.5/1] w-full object-cover"
          fetchPriority="high"
        />
      </picture>
    </section>
  );
}
