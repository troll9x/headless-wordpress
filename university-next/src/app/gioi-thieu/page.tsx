import type { Metadata } from 'next';
import Image from 'next/image';
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
const HISTORY_IMAGES = [
  'https://cms.tlu.edu.vn/wp-content/uploads/2025/07/Lich-su-cua-truong.webp',
  'https://cms.tlu.edu.vn/wp-content/uploads/2025/07/Lich-su-cua-truong-1.webp',
];
function section(html: string, start: string, end: string): string {
  const startAt = html.indexOf(start);
  if (startAt < 0) return '';
  const endAt = html.indexOf(end, startAt + start.length);
  return html.slice(startAt, endAt < 0 ? undefined : endAt);
}

function contentParagraphs(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => sanitizeCmsHtml(match[1].replace(/\[[^\]]*\]/g, '').replace(/<br\s*\/?\s*>/gi, ' ')))
    .filter((text) => stripHtml(text).trim().length > 35);
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
  const html = page.content.rendered;
  const intro = contentParagraphs(section(html, 'Giới thiệu về', 'Lịch sử của trường'))[0];
  const historyStart = contentParagraphs(section(html, 'Lịch sử của trường', '[ux_image id=&#8221;1009'));
  const historyMiddle = contentParagraphs(section(html, '[ux_image id=&#8221;1010', 'Năm 1979'));
  const historyEnd = contentParagraphs(section(html, 'Năm 1979', '[ux_image id=&#8221;353'));
  const present = contentParagraphs(section(html, 'Đại học Thủy lợi hiện tại', '[khoa_nganh_slider'))[0];
  const awards = contentParagraphs(section(html, 'DANH HIỆU', '[/section]'));
  const figures = [
    ['24.000+', 'Người học'], ['500+', 'Đối tác trong và ngoài nước'],
    ['95%', 'Sinh viên tốt nghiệp có việc làm'], ['75+', 'Ngành học'],
    ['60%', 'Giảng viên tiến sĩ'],
  ];
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <section className="relative isolate flex min-h-[400px] items-end overflow-hidden sm:min-h-[510px]">
        <Image src={HERO_IMAGE} alt="Toàn cảnh Trường Đại học Thủy lợi" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061e65]/90 via-[#061e65]/60 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <span className="border-l-4 border-amber-400 pl-3 text-sm font-bold uppercase tracking-[.2em] text-amber-300">Từ năm 1959</span>
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-tight text-white sm:text-6xl">Giới thiệu về<br />Trường Đại học Thủy lợi</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">Hơn sáu thập kỷ đào tạo, nghiên cứu và đóng góp cho sự phát triển của đất nước.</p>
        </div>
      </section>
      <div className="border-b border-slate-100 bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8"><Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: title }]} /></div></div>
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <span className="text-sm font-bold uppercase tracking-[.2em] text-[#0118d8]">Về chúng tôi</span>
        <h2 className="mt-4 font-heading text-3xl font-extrabold text-[#10296b] sm:text-4xl">Trường Đại học Thủy lợi</h2>
        {intro && <div className="mt-7 text-lg leading-9 text-slate-600" dangerouslySetInnerHTML={{ __html: intro }} />}
      </section>
      <section aria-labelledby="history-title" className="bg-[#071c77] text-white">
        <div className="grid lg:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:py-20">
            <span className="text-sm font-bold uppercase tracking-[.2em] text-amber-300">Dấu mốc hình thành</span>
            <h2 id="history-title" className="mt-4 font-heading text-3xl font-extrabold sm:text-4xl">Lịch sử của trường</h2>
            <div className="mt-7 space-y-5 text-base leading-8 text-white/90">{historyStart.map((text, i) => <p key={i} dangerouslySetInnerHTML={{ __html: text }} />)}</div>
          </div>
          <div className="relative min-h-[320px] lg:min-h-[520px]"><Image src={HISTORY_IMAGES[0]} alt="Tư liệu lịch sử Trường Đại học Thủy lợi" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
          <div className="relative min-h-[320px] lg:min-h-[500px]"><Image src={HISTORY_IMAGES[1]} alt="Hoạt động và cơ sở của Trường trong tư liệu lịch sử" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
          <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:py-20"><span className="text-sm font-bold uppercase tracking-[.2em] text-amber-300">Trưởng thành qua các thời kỳ</span><div className="mt-7 space-y-5 text-base leading-8 text-white/90">{historyMiddle.map((text, i) => <p key={i} dangerouslySetInnerHTML={{ __html: text }} />)}</div></div>
        </div>
      </section>
      {historyEnd.length > 0 && <section className="mx-auto max-w-5xl space-y-5 px-4 py-16 text-base leading-8 text-slate-600 sm:px-6">{historyEnd.map((text, i) => <p key={i} dangerouslySetInnerHTML={{ __html: text }} />)}</section>}
      <div className="relative h-64 sm:h-96"><Image src={HERO_IMAGE} alt="Khuôn viên Trường Đại học Thủy lợi" fill sizes="100vw" className="object-cover" /></div>
      <section aria-label="Trường Đại học Thủy lợi qua những con số" className="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-4 py-16 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">{figures.map(([value, label]) => <div key={label} className="border-r border-slate-200 px-4 text-center last:border-0"><div className="font-heading text-3xl font-black text-[#0118d8] sm:text-4xl">{value}</div><div className="mt-3 text-sm font-semibold leading-6 text-slate-700">{label}</div></div>)}</section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-5xl text-center"><span className="text-sm font-bold uppercase tracking-[.2em] text-[#0118d8]">Đào tạo và nghiên cứu</span><h2 className="mt-4 font-heading text-3xl font-extrabold text-[#10296b] sm:text-4xl">Đại học Thủy lợi hiện tại</h2>{present && <div className="mt-7 text-lg leading-9 text-slate-600" dangerouslySetInnerHTML={{ __html: present }} />}</div></section>
      {awards.length > 0 && <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24"><div className="mb-10 text-center"><span className="text-sm font-bold uppercase tracking-[.2em] text-[#0118d8]">Truyền thống và thành tựu</span><h2 className="mt-4 font-heading text-3xl font-extrabold text-[#10296b] sm:text-4xl">Danh hiệu – Khen thưởng</h2></div><div className="columns-1 gap-10 space-y-3 text-base leading-8 text-slate-700 md:columns-2">{awards.map((text, i) => <p key={i} className="break-inside-avoid" dangerouslySetInnerHTML={{ __html: text }} />)}</div></section>}
    </main>
  );
}
