import Image from 'next/image';
import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import { buildPostUrl } from '@/constants/duong-dan';
import { stripHtml } from '@/lib/utils/html';
import { sanitizeInlineHtml } from '@/lib/security/html';
import type { HomepageFeaturePosts } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMedia, WPPost } from '@/types/wordpress';

type FeatureKey = keyof HomepageFeaturePosts;

interface FeatureGroup {
  key: FeatureKey;
  title: string;
  href: string;
}

const GROUPS: Record<Locale, FeatureGroup[]> = {
  vi: [
    {
      key: 'training',
      title: 'Đào Tạo',
      href: '/dao-tao',
    },
    {
      key: 'students',
      title: 'Sinh Viên',
      href: '/sinh-vien',
    },
    {
      key: 'alumni',
      title: 'Cựu Sinh Viên',
      href: '/sinh-vien/cuu-sinh-vien',
    },
  ],
  en: [
    {
      key: 'training',
      title: 'Education',
      href: '/en/education',
    },
    {
      key: 'students',
      title: 'Students',
      href: '/en/students',
    },
    {
      key: 'alumni',
      title: 'Alumni',
      href: '/en/students/alumni',
    },
  ],
};

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && !('code' in media) ? media : null;
}

export default function TheNoiBat({
  posts,
  locale,
}: {
  posts: HomepageFeaturePosts;
  locale: Locale;
}) {
  const emptyText = locale === 'en'
    ? 'There are no posts in this category yet.'
    : 'Chưa có bài viết trong chuyên mục này.';

  return (
    <section
      className="bg-white pb-16 pt-10"
      aria-label={locale === 'en' ? 'Education, Students, Alumni' : 'Đào tạo, Sinh viên, Cựu sinh viên'}
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 md:grid-cols-3 md:gap-6 lg:px-8">
        {GROUPS[locale].map((group) => {
          const post = posts[group.key];
          const postHref = post ? buildPostUrl(post.slug, locale, post.link, post.id, post.canonical_path) : null;
          const media = post ? getFeaturedImage(post) : null;

          return (
            <div key={group.key}>
              <SectionTitle title={group.title} href={group.href} prefetch={false} className="!mb-4" />
              <article className="overflow-hidden rounded-md bg-white shadow-[0_2px_14px_rgba(15,23,42,0.12)]">
                {postHref && media ? (
                  <Link href={postHref} prefetch={false} className="relative block aspect-[16/9] overflow-hidden">
                    <Image
                      src={media.source_url}
                      alt={media?.alt_text || group.title}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </Link>
                ) : postHref ? (
                  <Link
                    prefetch={false}
                    href={postHref}
                    className="block aspect-[16/9] bg-gradient-to-br from-blue-50 to-slate-100"
                    aria-label={stripHtml(post?.title.rendered ?? group.title)}
                  />
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-slate-100" />
                )}

                <div className="p-4">
                  {post && postHref ? (
                    <>
                      <Link
                        prefetch={false}
                        href={postHref}
                        className="line-clamp-2 text-sm font-medium leading-[1.45] text-slate-800 hover:text-[#0118d8]"
                      >
                        <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
                      </Link>
                      {post.excerpt.rendered && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {stripHtml(post.excerpt.rendered)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">{emptyText}</p>
                  )}
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
