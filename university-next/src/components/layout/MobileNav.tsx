'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, CloseIcon } from '@/components/ui/icons';
import { getMenuItemLabel, isMenuItemActive } from '@/components/layout/navigationUtils';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface MobileNavProps {
  id?: string;
  items: WPMenuItemWithChildren[];
  isOpen: boolean;
  locale: Locale;
  pathname: string;
  onClose: () => void;
}

function externalProps(item: WPMenuItemWithChildren) {
  return item.target === '_blank'
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
}

function MobileMenuBranch({
  item,
  depth,
  locale,
  pathname,
  onClose,
}: {
  item: WPMenuItemWithChildren;
  depth: number;
  locale: Locale;
  pathname: string;
  onClose: () => void;
}) {
  const label = getMenuItemLabel(item);
  const hasChildren = item.children.length > 0;
  const isActive = isMenuItemActive(item, pathname);
  const paddingLeft = 20 + depth * 16;

  if (!hasChildren) {
    return (
      <li className="border-b border-slate-100 last:border-b-0">
        <Link
          href={item.url}
          {...externalProps(item)}
          onClick={onClose}
          className={`block py-3 pr-5 text-sm font-semibold leading-5 transition-colors hover:bg-blue-50 hover:text-[#0118d8] ${isActive ? 'bg-blue-50 text-[#0118d8]' : 'text-slate-700'}`}
          style={{ paddingLeft }}
          aria-current={isActive ? 'page' : undefined}
        >
          {label}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <details className="group/details" open={isActive || undefined}>
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-3 py-3 pr-5 text-sm font-bold leading-5 transition-colors hover:bg-blue-50 [&::-webkit-details-marker]:hidden ${isActive ? 'text-[#0118d8]' : 'text-slate-800'}`}
          style={{ paddingLeft }}
        >
          <span>{label}</span>
          <ChevronDownIcon className="h-4 w-4 flex-none text-slate-400 transition-transform group-open/details:rotate-180" />
        </summary>

        <ul className="border-t border-slate-100 bg-slate-50/80" role="list">
          {item.url !== '#' && (
            <li>
              <Link
                href={item.url}
                {...externalProps(item)}
                onClick={onClose}
                className="block py-2.5 pr-5 text-sm font-semibold text-[#136aa0] hover:bg-blue-50 hover:text-[#0118d8]"
                style={{ paddingLeft: paddingLeft + 16 }}
              >
                {locale === 'en' ? `All ${label}` : `Tất cả ${label}`}
              </Link>
            </li>
          )}
          {item.children.map((child) => (
            <MobileMenuBranch
              key={child.id}
              item={child}
              depth={depth + 1}
              locale={locale}
              pathname={pathname}
              onClose={onClose}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function MobileNav({ id, items, isOpen, locale, pathname, onClose }: MobileNavProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const siteName = locale === 'en' ? 'Thuyloi University' : 'Trường Đại học Thủy lợi';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/55 transition-opacity duration-300 min-[1025px]:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        id={id}
        className={`fixed inset-y-0 left-0 z-50 flex w-[340px] max-w-[90vw] flex-col bg-white font-sans shadow-2xl transition-[transform,visibility] duration-300 ease-out min-[1025px]:hidden ${isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-label={locale === 'en' ? 'Mobile navigation' : 'Menu di động'}
      >
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-blue-800 bg-[#0118d8] px-5 py-3">
          <span className="text-sm font-bold uppercase text-white">{siteName}</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={locale === 'en' ? 'Close menu' : 'Đóng menu'}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain" aria-label={locale === 'en' ? 'Mobile navigation' : 'Điều hướng di động'}>
          <ul role="list">
            {items.map((item) => (
              <MobileMenuBranch
                key={item.id}
                item={item}
                depth={0}
                locale={locale}
                pathname={pathname}
                onClose={onClose}
              />
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} {siteName}
        </div>
      </aside>
    </>
  );
}
