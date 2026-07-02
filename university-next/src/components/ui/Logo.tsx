import Link from 'next/link';
import { SITE_NAME } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';

interface LogoProps {
  /** Use 'light' inside dark backgrounds (nav bar), 'dark' on white backgrounds. */
  variant?: 'light' | 'dark';
}

export default function Logo({ variant = 'dark' }: LogoProps) {
  const nameClass =
    variant === 'dark'
      ? 'text-blue-900 group-hover:text-blue-800'
      : 'text-white group-hover:text-amber-400';

  const subtitleClass =
    variant === 'dark' ? 'text-slate-500' : 'text-blue-200';

  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Trang chủ">
      {/* Crest placeholder — replace <div> with <Image> when a real logo asset exists */}
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-900 text-white font-bold text-lg select-none transition-colors group-hover:bg-blue-800"
        aria-hidden
      >
        {UNIVERSITY.shortName.charAt(0)}
      </div>

      <div className="hidden leading-tight sm:block">
        <p className={`font-bold text-base transition-colors ${nameClass}`}>
          {SITE_NAME}
        </p>
        <p className={`text-xs transition-colors ${subtitleClass}`}>
          {UNIVERSITY.fullName}
        </p>
      </div>
    </Link>
  );
}
