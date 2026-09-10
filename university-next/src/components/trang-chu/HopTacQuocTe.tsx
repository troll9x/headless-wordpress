import CumTinTrangChu from '@/components/trang-chu/CumTinTrangChu';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export default function HopTacQuocTe({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <CumTinTrangChu
      title={isEn ? 'International Cooperation' : 'Hợp Tác Quốc Tế'}
      href={isEn ? '/en/external-relations' : '/doi-ngoai'}
      posts={posts}
      locale={locale}
      emptyText={isEn ? 'No international cooperation news yet.' : 'Chưa có tin tức hợp tác quốc tế.'}
    />
  );
}
