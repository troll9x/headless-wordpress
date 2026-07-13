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
  const post = await getPostBySlug(slug, 'vi');
  if (!post) return { title: 'Không tìm thấy bài viết' };

  const title = stripHtml(post.title.rendered);
  const description = post.excerpt.rendered ? stripHtml(post.excerpt.rendered) : '';
  const canonical = `${FRONTEND_URL}/tin-tuc/${post.slug}`;
  const enUrl = getTranslatedPostUrl(post, 'en');

  return generatePostMetadata({
    title,
    description,
    canonical,
    locale: 'vi',
    imageUrl: getFeaturedImageUrl(post),
    imageAlt: title,
    publishedTime: post.date,
    modifiedTime: post.modified,
    viUrl: canonical,
    enUrl: enUrl ?? undefined,
    includeAlternates: Boolean(enUrl),
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug, 'vi');
  if (!post) notFound();
  return <ChiTietBaiViet post={post} locale="vi" />;
}
