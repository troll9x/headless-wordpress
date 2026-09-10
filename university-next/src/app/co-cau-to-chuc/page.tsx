import type { Metadata } from 'next';
import { connection } from 'next/server';
import OrganizationStructure from '@/components/to-chuc/OrganizationStructure';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getFacultySliderItems } from '@/lib/wordpress/faculties';
import { getOrganization } from '@/lib/wordpress/organizations';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { getOrganizationStaticSections } from '@/lib/wordpress/static-pages';

const PAGE_ID = 284;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHeadlessSeoById(PAGE_ID, 'vi');
  return generateHeadlessMetadata(seo, {
    title: 'Cơ Cấu Tổ Chức',
    description: 'Cơ cấu tổ chức, lãnh đạo và các đơn vị trực thuộc Trường Đại học Thủy lợi.',
    canonical: `${FRONTEND_URL}/co-cau-to-chuc`,
    locale: 'vi',
  });
}

export default async function OrganizationStructurePage() {
  // The page stays dynamic so a temporarily slow CMS cannot block deployment builds.
  await connection();

  const [party, board, faculties, staticSections] = await Promise.all([
    getOrganization('dang-uy', 'vi'),
    getOrganization('ban-giam-hieu', 'vi'),
    getFacultySliderItems('vi'),
    getOrganizationStaticSections('vi'),
  ]);
  return (
    <OrganizationStructure
      locale="vi"
      leadership={[party, board].filter((item) => item !== null)}
      faculties={faculties}
      staticSections={staticSections}
    />
  );
}
