import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MediaLibrary from '@/components/media/MediaLibrary';
import { getMediaGalleryCategories, getMediaGalleryCategory } from '@/lib/wordpress/media-gallery';
import { sanitizeMetaDescription } from '@/lib/seo/metadata';

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

function pageNumber(value?: string): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).path?.at(-1);
  const description = sanitizeMetaDescription(slug ? `Hình ảnh và video trong bộ sưu tập ${slug.replaceAll('-', ' ')} của Trường Đại học Thủy lợi.` : 'Thư viện hình ảnh và video của Trường Đại học Thủy lợi.');
  if (!slug) return { title: 'Thư Viện Media', description, openGraph: { description }, twitter: { card: 'summary', description } };
  const gallery = await getMediaGalleryCategory(slug, 'vi', 1).catch(() => null);
  return { title: gallery?.category.name || 'Thư Viện Media', description, openGraph: { description }, twitter: { card: 'summary', description } };
}

export default async function MediaPage({ params, searchParams }: Props) {
  const slug = (await params).path?.at(-1);
  const currentPage = pageNumber((await searchParams).page);
  const categories = await getMediaGalleryCategories('vi');
  const gallery = slug ? await getMediaGalleryCategory(slug, 'vi', currentPage) : null;
  if (slug && !gallery) notFound();
  return <MediaLibrary locale="vi" categories={categories} gallery={gallery} />;
}
