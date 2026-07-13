import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/wordpress/posts';
import { getTranslatedPostUrl } from '@/lib/wordpress/polylang';
import { generatePostMetadata } from '@/lib/seo/metadata';
import { FRONTEND_URL } from '@/constants/api';
import { stripHtml } from '@/lib/utils/html';
import type { WPMedia } from '@/types/wordpress';
import ChiTietBaiViet from '@/components/bai-viet/ChiTietBaiViet';

type Props = {
  params: Promise<{ slug: string }>;
};

function getFeaturedImageUrl(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>): string | undefined {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return undefined;
  return (media as WPMedia).source_url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug, 'en');
  if (!post) return { title: 'Article not found' };

  const title = stripHtml(post.title.rendered);
  const description = post.excerpt.rendered ? stripHtml(post.excerpt.rendered) : '';
  const canonical = `${FRONTEND_URL}/en/news/${post.slug}`;
  const viUrl = getTranslatedPostUrl(post, 'vi');

  return generatePostMetadata({
    title,
    description,
    canonical,
    locale: 'en',
    imageUrl: getFeaturedImageUrl(post),
    imageAlt: title,
    publishedTime: post.date,
    modifiedTime: post.modified,
    viUrl: viUrl ?? undefined,
    enUrl: canonical,
    includeAlternates: Boolean(viUrl),
  });
}

export default async function EnPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug, 'en');
  if (!post) notFound();
  return <ChiTietBaiViet post={post} locale="en" />;
}
