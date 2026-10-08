import type { Metadata } from 'next';
import SearchResultsPage from '@/components/tim-kiem/SearchResultsPage';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search news, announcements, documents and other content on the Thuyloi University website.',
  openGraph: { description: 'Search news, announcements, documents and other content on the Thuyloi University website.' },
  twitter: { card: 'summary', description: 'Search news, announcements, documents and other content on the Thuyloi University website.' },
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
