import type { Metadata } from 'next';
import { getFullHomepageData, extractHeroData } from '@/services/homepage';
import { getFirstPageBySlug } from '@/lib/api/homepage';
import { PAGE_SLUGS } from '@/constants/categories';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessHomeSeo, mergeHomeSeoOverride } from '@/lib/wordpress/seo';
import TrangChu from '@/components/trang-chu/TrangChu';

export async function generateMetadata(): Promise<Metadata> {
  // Metadata needs only the hero page; loading every homepage section here
  // doubles the cold CMS fan-out before the page itself renders.
  const heroPage = await getFirstPageBySlug(PAGE_SLUGS.HERO, 'vi');
  const hero = extractHeroData(heroPage);

  const title = 'Trường Đại học Thủy lợi';
  const description = 'Trường Đại học Thủy lợi là một trường đại học công lập trực thuộc Bộ Nông nghiệp & Môi trường, trường hàng đầu trong việc đào tạo nguồn nhân lực chất lượng cao!';
  const canonical = FRONTEND_URL;
  const homeSeo = await getHeadlessHomeSeo('vi');
  const seo = mergeHomeSeoOverride(null, homeSeo ?? { title, description });

  return generateHeadlessMetadata(seo, {
    title,
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
