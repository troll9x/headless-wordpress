import Image from 'next/image';
import Link from 'next/link';
import { SITE_NAME } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import type { HeroData } from '@/types/homepage';

interface HeroBannerProps {
  data: HeroData;
}

export default function HeroBanner({ data }: HeroBannerProps) {
  const title = data.title ?? SITE_NAME;
  const subtitle = data.subtitle ?? UNIVERSITY.tagline;
  const primaryText = data.ctaText ?? 'Tìm hiểu thêm';
  const primaryHref = data.ctaUrl ?? '/gioi-thieu';
  const secondaryText = data.secondaryCtaText ?? 'Đăng ký tuyển sinh';
  const secondaryHref = data.secondaryCtaUrl ?? '/tuyen-sinh';

  return (
    <section
      className="relative flex min-h-[540px] items-center overflow-hidden lg:min-h-[680px]"
      aria-label="Giới thiệu trường"
    >
      {data.backgroundImageUrl && (
        <Image
          src={data.backgroundImageUrl}
          alt={data.backgroundImageAlt ?? ''}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      )}

      <div
        className={`absolute inset-0 ${
          data.backgroundImageUrl
            ? 'bg-blue-900/72'
            : 'bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800'
        }`}
      />

      {/* Subtle gradient to blend into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-blue-950/30 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            {UNIVERSITY.shortName} — {UNIVERSITY.fullName}
          </p>

          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-5 text-lg leading-relaxed text-blue-100 sm:text-xl">
              {subtitle}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={primaryHref}
              className="rounded-full bg-amber-400 px-7 py-3 text-sm font-semibold text-blue-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              {primaryText}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {secondaryText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
