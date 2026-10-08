import type { Metadata } from 'next';
import SearchResultsPage from '@/components/tim-kiem/SearchResultsPage';

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  description: 'Tìm kiếm tin tức, thông báo, văn bản và nội dung trên website Trường Đại học Thủy lợi.',
  openGraph: { description: 'Tìm kiếm tin tức, thông báo, văn bản và nội dung trên website Trường Đại học Thủy lợi.' },
  twitter: { card: 'summary', description: 'Tìm kiếm tin tức, thông báo, văn bản và nội dung trên website Trường Đại học Thủy lợi.' },
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
