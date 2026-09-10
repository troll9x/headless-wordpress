import type { HomepageData } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';
import { extractHeroData, extractStats } from '@/services/homepage';

import BannerChinh from '@/components/trang-chu/BannerChinh';
import BannerHieuTruong from '@/components/trang-chu/BannerHieuTruong';
import CongDong from '@/components/trang-chu/CongDong';
import DoiTac from '@/components/trang-chu/DoiTac';
import DonViDaoTao from '@/components/trang-chu/DonViDaoTao';
import HopTacQuocTe from '@/components/trang-chu/HopTacQuocTe';
import KhoanhKhacTLU from '@/components/trang-chu/KhoanhKhacTLU';
import KhuVucSuKien from '@/components/trang-chu/KhuVucSuKien';
import KhuVucThongBao from '@/components/trang-chu/KhuVucThongBao';
import KhuVucThongKe from '@/components/trang-chu/KhuVucThongKe';
import KhuVucTinTuc from '@/components/trang-chu/KhuVucTinTuc';
import KhuVucTuyenSinh from '@/components/trang-chu/KhuVucTuyenSinh';
import NghienCuu from '@/components/trang-chu/NghienCuu';
import TheNoiBat from '@/components/trang-chu/TheNoiBat';

interface TrangChuProps {
  data: HomepageData;
  locale: Locale;
}

/** Bộ dựng trang chủ dùng chung cho giao diện tiếng Việt và tiếng Anh. */
export default function TrangChu({ data, locale }: TrangChuProps) {
  const hero = extractHeroData(data.heroPage);
  const stats = extractStats(data.heroPage, locale);

  return (
    <div>
      {/* 1. Banner chính */}
      <BannerChinh data={hero} locale={locale} />

      {/* 2. Liên kết nhanh */}
      {/* 3 + 4. Tin tức và thông báo */}
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <KhuVucTinTuc posts={data.news} locale={locale} />
            </div>
            <div>
              <KhuVucThongBao posts={data.announcements} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sự kiện */}
      <KhuVucSuKien posts={data.events} locale={locale} />

      {/* 6. Thống kê */}
      <KhuVucThongKe stats={stats} locale={locale} />

      {/* 7. Banner Hiệu trưởng */}
      <BannerHieuTruong locale={locale} />

      {/* 8. Tuyển sinh */}
      <KhuVucTuyenSinh page={data.admissionsPage} locale={locale} />

      {/* 9. Các thẻ nội dung nổi bật */}
      <TheNoiBat posts={data.featurePosts} locale={locale} />

      {/* 10. Đơn vị đào tạo */}
      <DonViDaoTao posts={data.faculties} locale={locale} />

      {/* 11. Hợp tác quốc tế */}
      <HopTacQuocTe posts={data.cooperation} locale={locale} />

      {/* 12. Nghiên cứu */}
      <NghienCuu posts={data.research} locale={locale} />

      {/* 13. Đối tác */}
      <DoiTac logos={data.partnerLogos} fallbackPosts={data.partners} locale={locale} />

      {/* 14. Cộng đồng */}
      <CongDong posts={data.community} locale={locale} />

      {/* 15. Khoảnh khắc TLU */}
      <KhoanhKhacTLU posts={data.moments} gallery={data.momentGallery} locale={locale} />
    </div>
  );
}
