import Image from 'next/image';
import Link from 'next/link';
import { stripHtml } from '@/lib/utils/html';
import type { WPPage, WPMedia } from '@/types/wordpress';

interface AdmissionsSectionProps {
  page: WPPage;
}

function getFeaturedImage(page: WPPage): WPMedia | null {
  const media = page._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export default function AdmissionsSection({ page }: AdmissionsSectionProps) {
  const image = getFeaturedImage(page);
  const excerpt = page.excerpt.rendered ? stripHtml(page.excerpt.rendered) : null;
  const acf = (page.acf ?? {}) as Record<string, unknown>;
  const ctaText = acf.cta_text ? String(acf.cta_text) : 'Đăng ký ngay';
  const ctaUrl = acf.cta_url ? String(acf.cta_url) : `/${page.slug}`;

  return (
    <section className="relative overflow-hidden bg-blue-900 py-16" aria-label="Tuyển sinh">
      {image && (
        <Image
          src={image.source_url}
          alt={image.alt_text ?? ''}
          fill
          className="object-cover opacity-20"
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-900/95 to-blue-800/80" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-400">
            Tuyển sinh
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            <span dangerouslySetInnerHTML={{ __html: page.title.rendered }} />
          </h2>
          {excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-blue-200">{excerpt}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={ctaUrl}
              className="rounded-full bg-amber-400 px-7 py-3 text-sm font-semibold text-blue-950 transition-colors hover:bg-amber-300"
            >
              {ctaText}
            </Link>
            <Link
              href={`/${page.slug}`}
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
