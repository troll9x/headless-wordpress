import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import MissionStrategyPage from '@/components/gioi-thieu/MissionStrategyPage';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { getMissionStrategyContent } from '@/lib/wordpress/static-pages';

const PAGE_ID = 49_696;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHeadlessSeoById(PAGE_ID, 'en');
  return generateHeadlessMetadata(seo, {
    title: 'Mission – Goals – Strategy',
    description:
      'Mission, vision, core values and development strategy of Thuyloi University.',
    canonical: FRONTEND_URL + '/en/mission-goals-strategy',
    locale: 'en',
  });
}

export default async function EnglishMissionStrategyPage() {
  // Keep WordPress availability out of the production build path.
  await connection();
  const content = await getMissionStrategyContent('en');
  if (!content) notFound();

  return <MissionStrategyPage locale="en" content={content} />;
}
