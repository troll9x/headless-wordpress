import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import MissionStrategyPage from '@/components/gioi-thieu/MissionStrategyPage';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { getMissionStrategyContent } from '@/lib/wordpress/static-pages';

const PAGE_ID = 286;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHeadlessSeoById(PAGE_ID, 'vi');
  return generateHeadlessMetadata(seo, {
    title: 'Sứ Mạng – Mục Tiêu – Chiến Lược',
    description:
      'Sứ mạng, tầm nhìn, giá trị cốt lõi và chiến lược phát triển của Trường Đại học Thủy lợi.',
    canonical: `${FRONTEND_URL}/su-mang-muc-tieu-chien-luoc`,
    locale: 'vi',
  });
}

export default async function VietnameseMissionStrategyPage() {
  // Keep WordPress availability out of the production build path.
  await connection();
  const content = await getMissionStrategyContent('vi');
  if (!content) notFound();

  return <MissionStrategyPage locale="vi" content={content} />;
}
