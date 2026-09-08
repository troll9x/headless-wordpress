import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getFullHomepageData('en');
  const hero = extractHeroData(data.heroPage);

  const title = 'Home';
  const description = hero.subtitle ?? 'Science – Practice – Innovation';
  const canonical = `${FRONTEND_URL}/en`;
  const seo = data.heroPage
    ? await getHeadlessSeoById(data.heroPage.id, 'en')
    : null;

  return generateHeadlessMetadata(seo, {
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
