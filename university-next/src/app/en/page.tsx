import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { FRONTEND_URL } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import { generatePageMetadata } from '@/lib/seo/metadata';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getFullHomepageData('en');
  const hero = extractHeroData(data.heroPage);

  const title = 'Home';
  const description = hero.subtitle ?? UNIVERSITY.tagline;
  const canonical = `${FRONTEND_URL}/en`;

  return generatePageMetadata({
    title,
    description,
    canonical,
    locale: 'en',
    imageUrl: hero.backgroundImageUrl ?? undefined,
    viUrl: FRONTEND_URL,
    enUrl: canonical,
  });
}

export default async function EnHomePage() {
  const data = await getFullHomepageData('en');
  return <TrangChu data={data} locale="en" />;
}
