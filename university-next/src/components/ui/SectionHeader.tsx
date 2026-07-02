import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkText?: string;
}

export default function SectionHeader({
  title,
  href,
  linkText = 'Xem tất cả',
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1 flex-shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900"
        >
          {linkText} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
