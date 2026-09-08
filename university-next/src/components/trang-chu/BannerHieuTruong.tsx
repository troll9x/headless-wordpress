import Image from 'next/image';
import type { Locale } from '@/types/ngon-ngu';

const RECTOR_BANNER_URL =
  'https://tlu.edu.vn/wp-content/uploads/2025/12/GS-Nguyen-Trung-Viet.webp';

export default function BannerHieuTruong({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';

  return (
    <section className="relative aspect-[1020/392] w-full overflow-hidden bg-[#0118d8]" aria-label={isEn ? 'Inspiration - Wisdom - Brilliance' : 'Khởi nguồn - Trí tuệ - Tỏa sáng'}>
      <Image
        src={RECTOR_BANNER_URL}
        alt={isEn ? 'Professor Nguyen Trung Viet - President of Thuyloi University' : 'GS.TS Nguyễn Trung Việt - Hiệu trưởng Trường Đại học Thủy lợi'}
        fill
        className="object-cover"
        sizes="100vw"
      />
    </section>
  );
}
