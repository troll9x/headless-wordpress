import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { FRONTEND_URL } from '@/constants/api';
import { sanitizeMetaDescription, generateHeadlessMetadata } from '@/lib/seo/metadata';
import { sanitizeCmsHtml } from '@/lib/security/html';
import { getPageBySlug } from '@/lib/wordpress/pages';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { stripHtml } from '@/lib/utils/html';

const PAGE_SLUG = 'gioi-thieu';
const PAGE_ID = 279;
const PAGE_URL = `${FRONTEND_URL}/gioi-thieu`;
const HERO_IMAGE = 'https://cms.tlu.edu.vn/wp-content/uploads/2025/06/Toan-truong-scaled-1.webp';

// The CMS still stores Flatsome builder shortcodes in this page's rendered HTML.
// Keep the editor's actual headings and paragraphs, without showing shortcode text.
function cleanAboutHtml(html: string): string {
  return sanitizeCmsHtml(
    html
      .replace(/\[(?:\/?[a-z][a-z0-9_-]*)(?:\s[^\]]*)?\]/gi, '')
      .replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?\s*>|&nbsp;|\s)*<\/p>/gi, ''),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const [page, seo] = await Promise.all([
    getPageBySlug(PAGE_SLUG, 'vi'),
    getHeadlessSeoById(PAGE_ID, 'vi'),
  ]);
  const title = page ? stripHtml(page.title.rendered) : 'Giới thiệu';
  return generateHeadlessMetadata(seo, {
    title,
    description: sanitizeMetaDescription(page?.excerpt.rendered, 'Giới thiệu Trường Đại học Thủy lợi.'),
    canonical: PAGE_URL,
    locale: 'vi',
    imageUrl: HERO_IMAGE,
    imageAlt: title,
  });
}

export default async function AboutPage() {
  await connection();
  const page = await getPageBySlug(PAGE_SLUG, 'vi');
  if (!page) notFound();

  const title = stripHtml(page.title.rendered);
  return (
    <main className="min-h-screen bg-white">
      <section
        className="relative flex min-h-[300px] items-center bg-cover bg-center sm:min-h-[390px]"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(1,24,216,.9), rgba(4,63,145,.7), rgba(15,23,42,.4)), url('${HERO_IMAGE}')` }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="max-w-4xl font-heading text-3xl font-extrabold uppercase leading-tight text-white sm:text-5xl">
            Giới thiệu về Trường Đại học Thủy lợi
          </h1>
        </div>
      </section>

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: title }]} />
        </div>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div
          className="article-readable-content space-y-5 text-base leading-8 text-slate-700 [&_a]:text-[#0469b0] [&_a]:underline [&_h1]:hidden [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-[#0118d8] [&_h3]:mt-8 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_img]:max-w-full [&_li]:ml-6 [&_li]:list-disc [&_p]:text-justify [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: cleanAboutHtml(page.content.rendered) }}
        />
      </article>
    </main>
  );
}
