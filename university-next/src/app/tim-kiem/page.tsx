import type { Metadata } from 'next';
import SearchResultsPage from '@/components/tim-kiem/SearchResultsPage';

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  robots: { index: false, follow: true },
};

export default async function VietnameseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <SearchResultsPage locale="vi" query={params.q} page={params.page} />;
}
