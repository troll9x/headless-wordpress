import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import DocumentDetails from '@/components/tai-lieu/DocumentDetails';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getDocumentDetails } from '@/lib/wordpress/documents';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const document = await getDocumentDetails(slug, 'vi');
  if (!document) return {};

  const seo = await getHeadlessSeoById(document.id, 'vi');
  return generateHeadlessMetadata(seo, {
    title: document.title,
    description: document.excerpt || document.title,
    canonical: `${FRONTEND_URL}/tai-lieu/${encodeURIComponent(slug)}`,
    locale: 'vi',
    type: 'article',
    publishedTime: document.date,
    modifiedTime: document.modified,
  });
}

export default async function DocumentPage({ params }: Props) {
  const document = await getDocumentDetails((await params).slug, 'vi');
  if (!document) notFound();
  if (document.redirect.required && document.redirect.url) redirect(document.redirect.url);
  return <DocumentDetails data={document} locale="vi" />;
}
