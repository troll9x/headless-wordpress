import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MediaLibrary from '@/components/media/MediaLibrary';
import { getMediaGalleryCategories, getMediaGalleryCategory } from '@/lib/wordpress/media-gallery';

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
  if (!slug) return { title: 'Media Library', description: 'Thuyloi University media library.' };
  const gallery = await getMediaGalleryCategory(slug, 'en', 1).catch(() => null);
  return { title: gallery?.category.name || 'Media Library' };
}

export default async function EnglishMediaPage({ params, searchParams }: Props) {
  const slug = (await params).path?.at(-1);
  const currentPage = pageNumber((await searchParams).page);
  const categories = await getMediaGalleryCategories('en');
  const gallery = slug ? await getMediaGalleryCategory(slug, 'en', currentPage) : null;
  if (slug && !gallery) notFound();
  return <MediaLibrary locale="en" categories={categories} gallery={gallery} />;
}
