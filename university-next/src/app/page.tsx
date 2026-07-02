import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { SITE_NAME, FRONTEND_URL } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import { generatePageMetadata } from '@/lib/seo/metadata';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getFullHomepageData('vi');
  const hero = extractHeroData(data.heroPage);

  const description = hero.subtitle ?? UNIVERSITY.tagline;
  const canonical = FRONTEND_URL;

  return generatePageMetadata({
    title: SITE_NAME,
    description,
    canonical,
    locale: 'vi',
    imageUrl: hero.backgroundImageUrl ?? undefined,
    viUrl: canonical,
    enUrl: `${FRONTEND_URL}/en`,
  });
}

export default async function HomePage() {
  const data = await getFullHomepageData('vi');
  return <TrangChu data={data} locale="vi" />;
}
