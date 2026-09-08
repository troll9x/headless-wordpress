import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current (last) page — renders as plain text. */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible breadcrumb trail.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Trang chủ', href: '/' },
 *     { label: 'Tin tức', href: '/tin-tuc-thong-bao' },
 *     { label: 'Bài viết chi tiết' },
 *   ]} />
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className="flex flex-wrap items-center gap-1 text-sm text-slate-500"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={index}
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              )}

              {isLast || !item.href ? (
                <span
                  className="font-medium text-slate-800"
                  aria-current={isLast ? 'page' : undefined}
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-blue-700"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
