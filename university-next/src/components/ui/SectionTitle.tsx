import Link from 'next/link';

interface SectionTitleProps {
  title: string;
  href?: string;
  linkText?: string;
  light?: boolean;
  className?: string;
}

export default function SectionTitle({
  title,
  href,
  linkText = 'Xem tất cả',
  light = false,
  className = '',
}: SectionTitleProps) {
  const lineColor = light ? 'bg-white/20' : 'bg-slate-200';
  const textColor = light ? 'text-white' : 'text-blue-900';
  const linkColor = light
    ? 'text-blue-200 hover:text-white'
    : 'text-blue-700 hover:text-blue-900';

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`h-px flex-1 ${lineColor}`} />
        <h2
          className={`flex-shrink-0 text-sm font-bold uppercase tracking-[0.18em] sm:text-base ${textColor}`}
        >
          {title}
        </h2>
        <span className={`h-px flex-1 ${lineColor}`} />
      </div>
      {href && (
        <div className="mt-2 flex justify-end">
          <Link
            href={href}
            className={`text-xs font-medium transition-colors ${linkColor}`}
          >
            {linkText} →
          </Link>
        </div>
      )}
    </div>
  );
}
