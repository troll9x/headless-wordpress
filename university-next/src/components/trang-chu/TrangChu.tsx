import type { HomepageData } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';
import { extractHeroData, extractStats } from '@/services/homepage';

import HeroBanner from '@/components/homepage/HeroBanner';
import QuickAccessLinks from '@/components/homepage/QuickAccessLinks';
import NewsSection from '@/components/homepage/NewsSection';
import AnnouncementsSection from '@/components/homepage/AnnouncementsSection';
import EventsSection from '@/components/homepage/EventsSection';
import StatsSection from '@/components/homepage/StatsSection';
import RectorBanner from '@/components/homepage/RectorBanner';
import AdmissionsSection from '@/components/homepage/AdmissionsSection';
import FeatureCardsSection from '@/components/homepage/FeatureCardsSection';
import TrainingUnitsSection from '@/components/homepage/TrainingUnitsSection';
import CooperationSection from '@/components/homepage/CooperationSection';
import ResearchSection from '@/components/homepage/ResearchSection';
import PartnersSection from '@/components/homepage/PartnersSection';
import CommunitySection from '@/components/homepage/CommunitySection';
import MomentsGallery from '@/components/homepage/MomentsGallery';

interface TrangChuProps {
  data: HomepageData;
  locale: Locale;
}

/** Shared homepage renderer. Accepts pre-fetched data and locale. */
export default function TrangChu({ data }: TrangChuProps) {
  const hero = extractHeroData(data.heroPage);
  const stats = extractStats(data.heroPage);

  return (
    <main>
      {/* 1. Hero Banner */}
      <HeroBanner data={hero} />

      {/* 2. Quick Access Links */}
      {data.quickLinks.length > 0 && <QuickAccessLinks items={data.quickLinks} />}

      {/* 3+4. Tin Tức + Thông Báo */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NewsSection posts={data.news} />
            </div>
            <div>
              <AnnouncementsSection posts={data.announcements} />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sự Kiện */}
      <EventsSection posts={data.events} />

      {/* 6. Thống Kê */}
      <StatsSection stats={stats} />

      {/* 7. Rector Banner */}
      <RectorBanner />

      {/* 8. Tuyển Sinh */}
      {data.admissionsPage && <AdmissionsSection page={data.admissionsPage} />}

      {/* 9. Feature Cards */}
      <FeatureCardsSection />

      {/* 10. Đơn Vị Đào Tạo */}
      <TrainingUnitsSection posts={data.faculties} />

      {/* 11. Hợp Tác Quốc Tế */}
      <CooperationSection posts={data.cooperation} />

      {/* 12. Nghiên Cứu */}
      <ResearchSection posts={data.research} />

      {/* 13. Đối Tác */}
      {data.partners.length > 0 && <PartnersSection posts={data.partners} />}

      {/* 14. Cộng Đồng */}
      <CommunitySection posts={data.community} />

      {/* 15. Khoảnh Khắc TLU */}
      <MomentsGallery posts={data.moments} />
    </main>
  );
}
