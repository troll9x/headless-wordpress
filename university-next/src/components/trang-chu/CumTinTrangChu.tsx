'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import SectionTitle from '@/components/ui/SectionTitle';
import { buildPostUrl } from '@/constants/duong-dan';
import { formatDateShort } from '@/lib/utils/date';
import type { Locale } from '@/types/ngon-ngu';
import type { WPCategory, WPMedia, WPPost } from '@/types/wordpress';

interface CumTinTrangChuProps {
  title: string;
  href: string;
  posts: WPPost[];
  locale: Locale;
  emptyText: string;
}

function getImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media && !('code' in media) ? media : null;
}

function getCategory(post: WPPost): string | null {
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  const category = terms.find(
    (term): term is WPCategory => !('code' in term) && term.taxonomy === 'category',
  );
  return category?.name ?? null;
}

function ArticleImage({ post, sizes }: { post: WPPost; sizes: string }) {
  const image = getImage(post);
  return image ? (
    <Image src={image.source_url} alt={image.alt_text || ''} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes={sizes} />
  ) : (
    <span className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100" />
  );
}

function ArticleCard({ post, locale }: { post: WPPost; locale: Locale }) {
  const href = buildPostUrl(post.slug, locale, post.link);
  const category = getCategory(post);
  return (
    <article className="group overflow-hidden rounded-md bg-white shadow-[0_2px_12px_rgba(15,23,42,0.12)]">
      <Link href={href} className="relative block aspect-[16/9] overflow-hidden bg-slate-100">
        <ArticleImage post={post} sizes="(max-width: 768px) 100vw, 26vw" />
      </Link>
      <div className="p-4">
        {category && <p className="mb-2 text-[11px] font-bold uppercase text-[#0118d8]">{category}</p>}
        <h3 className="line-clamp-3 text-[15px] font-semibold leading-[1.4] text-slate-800">
          <Link href={href} className="transition-colors hover:text-[#0118d8]">
            <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
          </Link>
        </h3>
        <time className="mt-3 block text-[11px] text-slate-500" dateTime={post.date}>{formatDateShort(post.date, locale)}</time>
      </div>
    </article>
  );
}

function ArticleList({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  return (
    <div className="divide-y divide-slate-200 rounded-md bg-slate-50 px-4">
      {posts.map((post) => {
        const href = buildPostUrl(post.slug, locale, post.link);
        const category = getCategory(post);
        return (
          <article key={post.id} className="py-4 first:pt-4">
            {category && <p className="mb-1 text-[10px] font-bold uppercase text-[#0118d8]">{category}</p>}
            <h3 className="line-clamp-2 text-sm font-medium leading-[1.4] text-slate-800">
              <Link href={href} className="hover:text-[#0118d8]"><span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} /></Link>
            </h3>
            <time className="mt-2 block text-[10px] text-slate-500" dateTime={post.date}>{formatDateShort(post.date, locale)}</time>
          </article>
        );
      })}
    </div>
  );
}

export default function CumTinTrangChu({ title, href, posts, locale, emptyText }: CumTinTrangChuProps) {
  const cards = useMemo(() => posts.slice(0, 3), [posts]);
  const list = useMemo(() => posts.slice(3, 6), [posts]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % cards.length), 4_500);
    return () => window.clearInterval(timer);
  }, [cards.length]);

  return (
    <section className="bg-white py-12 sm:py-16" aria-label={title}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionTitle title={title} href={href} />
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
        ) : (
          <>
            <div className="hidden grid-cols-[repeat(3,minmax(0,1fr))_minmax(230px,1fr)] gap-5 md:grid">
              {cards.map((post) => <ArticleCard key={post.id} post={post} locale={locale} />)}
              {list.length > 0 && <ArticleList posts={list} locale={locale} />}
            </div>
            <div className="md:hidden">
              <div className="relative">
                {cards.map((post, index) => <div key={post.id} className={index === active ? 'block' : 'hidden'}><ArticleCard post={post} locale={locale} /></div>)}
              </div>
              {cards.length > 1 && (
                <div className="mt-4 flex justify-center gap-2" aria-label={`${title} slider`}>
                  {cards.map((post, index) => (
                    <button key={post.id} type="button" onClick={() => setActive(index)} className={`h-2 w-2 rounded-full ${index === active ? 'bg-[#119dcc]' : 'bg-slate-300'}`} aria-label={`${title} ${index + 1}`} aria-current={index === active ? 'true' : undefined} />
                  ))}
                </div>
              )}
              {list.length > 0 && <div className="mt-5"><ArticleList posts={list} locale={locale} /></div>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
