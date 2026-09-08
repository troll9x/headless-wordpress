import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocumentTaxonomyArchive from '@/components/tai-lieu/DocumentTaxonomyArchive';
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
    ? `/en/van-ban-tai-lieu/${cleanPath.map(encodeURIComponent).join('/')}`
    : '/en/van-ban-tai-lieu';
  return { slug, pathname };
}
function loadCount(value?: string): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(parsed) ? Math.min(16, Math.max(1, parsed)) : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const request = resolveRequest((await params).path);
  const data = await getDocumentTaxonomyData(request.slug, 1, 'en').catch(() => null);
  return { title: data ? stripHtml(data.term.name) : 'Documents' };
}

export default async function EnglishDocumentArchive({ params, searchParams }: Props) {
  const request = resolveRequest((await params).path);
  const query = await searchParams;
  const view = query.view === 'list' ? 'list' : 'grid';
  const count = loadCount(query.load);
  const data = await getDocumentTaxonomyData(request.slug, count, 'en').catch(() => null);
  if (!data) notFound();
  return <DocumentTaxonomyArchive data={data} locale="en" view={view} loadCount={count} basePath={request.pathname} />;
}
