import Image from 'next/image';
import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPage, WPMedia } from '@/types/wordpress';

function getFeaturedImage(page: WPPage): WPMedia | null {
  const media = page._embedded?.['wp:featuredmedia']?.[0];
  return media && !('code' in media) ? media : null;
}

const FALLBACK_IMAGE = 'https://tlu.edu.vn/wp-content/uploads/2025/08/diem-chuan-dai-hoc-thuy-loi2.webp';

export default function KhuVucTuyenSinh({ page, locale }: { page: WPPage | null; locale: Locale }) {
  const isEn = locale === 'en';
  const image = page ? getFeaturedImage(page) : null;
  const excerpt = page
    ? stripHtml(page.excerpt.rendered || page.content.rendered).slice(0, 240)
    : isEn
      ? 'Find admissions information, available programs and application guidance for all levels at Thuyloi University.'
      : 'Cung cấp thông tin tuyển sinh, ngành tuyển sinh, đề án tuyển sinh… cho các bậc học tại Trường Đại học Thủy lợi.';
  const acf = (page?.acf ?? {}) as Record<string, unknown>;
  const ctaText = acf.cta_text ? String(acf.cta_text) : (isEn ? 'Apply now' : 'Đăng ký ngay');
  const ctaUrl = acf.cta_url ? String(acf.cta_url) : 'https://ts.tlu.edu.vn/';
  const pageUrl = page ? `${isEn ? '/en' : ''}/${page.slug}` : 'https://ts.tlu.edu.vn/';
  const title = isEn ? 'Admissions' : 'Tuyển Sinh';
  const levels = isEn ? ['Undergraduate', "Master's", 'Doctoral'] : ['Đại học', 'Thạc sĩ', 'Tiến sĩ'];

  return (
    <section className="bg-white py-12 sm:py-16" aria-label={title}>
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 sm:px-6 md:grid-cols-2 lg:gap-10 lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <Image src={image?.source_url || FALLBACK_IMAGE} alt={image?.alt_text || (isEn ? 'Admissions at Thuyloi University' : 'Tuyển sinh Trường Đại học Thủy lợi')} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
        <div>
          <SectionTitle title={title} href={pageUrl} className="!mb-5 md:!text-left" />
          {excerpt && <p className="text-base font-semibold leading-7 text-slate-700">{excerpt}{excerpt.length === 240 ? '…' : ''}</p>}
          <ul className="mt-5 space-y-3 text-base font-semibold text-[#0118d8]">
            {levels.map((label) => <li key={label} className="flex items-center gap-3"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0118d8] text-[10px] text-white">›</span>{label}</li>)}
          </ul>
          <div className="mt-7 text-center md:text-left">
            <Link href={ctaUrl} className="inline-flex rounded-md bg-[#0118d8] px-6 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-[#136aa0]">{ctaText}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
