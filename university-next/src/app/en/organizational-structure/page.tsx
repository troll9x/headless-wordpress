import type { Metadata } from 'next';
import { connection } from 'next/server';
import OrganizationStructure from '@/components/to-chuc/OrganizationStructure';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getFacultySliderItems } from '@/lib/wordpress/faculties';
import { getOrganization } from '@/lib/wordpress/organizations';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { getOrganizationStaticSections } from '@/lib/wordpress/static-pages';

const ORGANIZATION_DATA_TIMEOUT_MS = 12_000;

function withOrganizationFallback<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = setTimeout(() => {
      console.warn(`[organizational-structure] ${label} timed out after ${ORGANIZATION_DATA_TIMEOUT_MS}ms.`);
      finish(fallback);
    }, ORGANIZATION_DATA_TIMEOUT_MS);

    promise.then(
      finish,
      (error: unknown) => {
        console.warn(`[organizational-structure] ${label} failed; using fallback.`, error);
        finish(fallback);
      },
    );
  });
}

const PAGE_ID = 49_736;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHeadlessSeoById(PAGE_ID, 'en');
  return generateHeadlessMetadata(seo, {
    title: 'Organizational Structure',
    description: 'Leadership and organizational units of Thuyloi University.',
    canonical: `${FRONTEND_URL}/en/organizational-structure`,
    locale: 'en',
  });
}

export default async function EnglishOrganizationStructurePage() {
  // Build without waiting on WordPress; successful fetches retain their cache policy.
  await connection();

  const [board, faculties, staticSections] = await Promise.all([
    withOrganizationFallback('English presidential board', getOrganization('presidential-board', 'en'), null),
    withOrganizationFallback('faculties', getFacultySliderItems('en'), []),
    withOrganizationFallback(
      'organization page sections',
      getOrganizationStaticSections('en'),
      {
        trainingHtml: '',
        administrativeHtml: '',
        scienceHtml: '',
      },
    ),
  ]);

  return (
    <OrganizationStructure
      locale="en"
      leadership={[board].filter((item) => item !== null)}
      faculties={faculties}
      staticSections={staticSections}
    />
  );
}
