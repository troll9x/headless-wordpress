import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { getFirstPageBySlug } from '@/lib/api/homepage';
import { PAGE_SLUGS } from '@/constants/categories';
import { FRONTEND_URL } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import { generateHeadlessMetadata, sanitizeMetaDescription } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  // Metadata needs only the hero page; loading every homepage section here
  // doubles the cold CMS fan-out before the page itself renders.
  const heroPage = await getFirstPageBySlug(PAGE_SLUGS.HERO, 'vi');
  const hero = extractHeroData(heroPage);

  const description = sanitizeMetaDescription(hero.subtitle, UNIVERSITY.tagline);
  const canonical = FRONTEND_URL;
  const seo = heroPage
    ? await getHeadlessSeoById(heroPage.id, 'vi')
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
