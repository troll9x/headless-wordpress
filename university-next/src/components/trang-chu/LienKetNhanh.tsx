import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface LienKetNhanhProps {
  items: WPMenuItemWithChildren[];
}

const BADGE_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-amber-100 text-amber-800',
  'bg-slate-100 text-slate-800',
  'bg-blue-100 text-blue-800',
  'bg-amber-100 text-amber-800',
  'bg-slate-100 text-slate-800',
] as const;

export default function LienKetNhanh({ items }: LienKetNhanhProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-8 shadow-sm" aria-label="Truy cập nhanh">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:gap-4">
          {items.map((item, idx) => {
            const badgeColor = BADGE_COLORS[idx % BADGE_COLORS.length];
            const initials = item.title.rendered
              .replace(/<[^>]+>/g, '')
              .trim()
              .slice(0, 2)
              .toUpperCase();

            return (
              <Link
                key={item.id}
                href={item.url}
                target={item.target === '_blank' ? '_blank' : undefined}
                rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                className="group flex flex-col items-center justify-center gap-2 rounded-[10px] border border-slate-100 bg-white p-4 text-center shadow-[0_5px_16px_0_rgba(2,55,102,0.05)] transition-all hover:-translate-y-1 hover:border-[#136aa0] hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${badgeColor}`}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <span
                  className="text-xs font-semibold leading-snug text-slate-700 transition-colors group-hover:text-[#0118d8] sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item.title.rendered) }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
