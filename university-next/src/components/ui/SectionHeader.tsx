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
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="mt-[5px] inline-block border-b-[3px] border-[#0118d8]">
        <h2 className="pb-1 font-['Raleway',Arial,sans-serif] text-xl font-bold text-[#0118d8] sm:text-2xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 text-sm font-semibold text-[#0469b0] transition-colors hover:text-[#2d2d2d]"
        >
          {linkText} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
