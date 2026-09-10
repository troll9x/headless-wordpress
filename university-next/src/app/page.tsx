import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { FRONTEND_URL } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getFullHomepageData('vi');
  const hero = extractHeroData(data.heroPage);

  const description = hero.subtitle ?? UNIVERSITY.tagline;
  const canonical = FRONTEND_URL;
  const seo = data.heroPage
    ? await getHeadlessSeoById(data.heroPage.id, 'vi')
    : null;

  return generateHeadlessMetadata(seo, {
    title: "Trang chủ",
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
