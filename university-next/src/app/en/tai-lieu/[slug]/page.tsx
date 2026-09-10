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
  const document = await getDocumentDetails(slug, 'en');
  if (!document) return {};

  const seo = await getHeadlessSeoById(document.id, 'en');
  return generateHeadlessMetadata(seo, {
    title: document.title,
    description: document.excerpt || document.title,
    canonical: `${FRONTEND_URL}/en/tai-lieu/${encodeURIComponent(slug)}`,
    locale: 'en',
    type: 'article',
    publishedTime: document.date,
    modifiedTime: document.modified,
  });
}

export default async function EnglishDocumentPage({ params }: Props) {
  const document = await getDocumentDetails((await params).slug, 'en');
  if (!document) notFound();
  if (document.redirect.required && document.redirect.url) redirect(document.redirect.url);
  return <DocumentDetails data={document} locale="en" />;
}
