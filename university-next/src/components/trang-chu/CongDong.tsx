import CumTinTrangChu from '@/components/trang-chu/CumTinTrangChu';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export default function CongDong({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <CumTinTrangChu
      title={isEn ? 'For the Community' : 'Vì Cộng Đồng'}
      href={isEn ? '/en/community' : '/vi-cong-dong'}
      posts={posts}
      locale={locale}
      emptyText={isEn ? 'No community news yet.' : 'Chưa có tin tức cộng đồng.'}
    />
  );
}
