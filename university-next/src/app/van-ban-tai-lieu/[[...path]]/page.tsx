import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocumentTaxonomyArchive from '@/components/tai-lieu/DocumentTaxonomyArchive';
import { FRONTEND_URL } from '@/constants/api';
import { getDocumentTaxonomyData } from '@/lib/wordpress/documents';
import { stripHtml } from '@/lib/utils/html';

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ view?: string; load?: string }>;
};

function resolveRequest(path?: string[]) {
  const cleanPath = (path ?? []).map(decodeURIComponent).filter(Boolean);
  const slug = cleanPath.at(-1) ?? 'van-ban-tai-lieu';
  const pathname = cleanPath.length > 0
    ? `/van-ban-tai-lieu/${cleanPath.map(encodeURIComponent).join('/')}`
    : '/van-ban-tai-lieu';

  return { slug, pathname };
}

function parseLoadCount(value?: string): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(parsed) ? Math.min(16, Math.max(1, parsed)) : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const request = resolveRequest((await params).path);
  const data = await getDocumentTaxonomyData(request.slug, 1, 'vi').catch(() => null);
  if (!data) return { title: 'Không tìm thấy danh mục tài liệu' };

  const title = stripHtml(data.term.name);
  return {
    title,
    description: data.term.description || `Tài liệu thuộc danh mục ${title}.`,
    alternates: { canonical: `${FRONTEND_URL}${request.pathname}` },
  };
}

export default async function DocumentTaxonomyPage({ params, searchParams }: Props) {
  const request = resolveRequest((await params).path);
  const query = await searchParams;
  const view = query.view === 'list' ? 'list' : 'grid';
  const loadCount = parseLoadCount(query.load);
  const data = await getDocumentTaxonomyData(request.slug, loadCount, 'vi').catch(() => null);
  if (!data) notFound();

  return (
    <DocumentTaxonomyArchive
      data={data}
      locale="vi"
      view={view}
      loadCount={loadCount}
      basePath={request.pathname}
    />
  );
}
