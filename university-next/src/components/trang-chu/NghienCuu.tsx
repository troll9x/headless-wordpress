import CumTinTrangChu from '@/components/trang-chu/CumTinTrangChu';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export default function NghienCuu({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <CumTinTrangChu
      title={isEn ? 'Research' : 'Nghiên Cứu'}
      href={isEn ? '/en/research' : '/nghien-cuu'}
      posts={posts}
      locale={locale}
      emptyText={isEn ? 'No research news yet.' : 'Chưa có tin tức nghiên cứu.'}
    />
  );
}
