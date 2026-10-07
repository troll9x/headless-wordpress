import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { getFirstPageBySlug } from '@/lib/api/homepage';
import { PAGE_SLUGS } from '@/constants/categories';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  // Metadata needs only the hero page; loading every homepage section here
  // doubles the cold CMS fan-out before the page itself renders.
  const heroPage = await getFirstPageBySlug(PAGE_SLUGS.HERO, 'en');
  const hero = extractHeroData(heroPage);

  const title = 'Home';
  const description = hero.subtitle ?? 'Science – Practice – Innovation';
  const canonical = `${FRONTEND_URL}/en`;
  const seo = heroPage
    ? await getHeadlessSeoById(heroPage.id, 'en')
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
