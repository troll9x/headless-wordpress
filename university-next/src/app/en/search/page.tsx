import type { Metadata } from 'next';
import SearchResultsPage from '@/components/tim-kiem/SearchResultsPage';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

export default async function EnglishSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <SearchResultsPage locale="en" query={params.q} page={params.page} />;
}
