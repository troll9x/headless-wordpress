'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { CloseIcon, ChevronDownIcon } from '@/components/ui/icons';
import { SITE_NAME } from '@/constants/api';
import { isHomepageMenuItem } from '@/components/layout/navigationUtils';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface MobileNavProps {
  id?: string;
  items: WPMenuItemWithChildren[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-height slide-in drawer for mobile navigation.
 * Uses HTML <details>/<summary> for zero-JS accordion on sub-menus.
 * Closes automatically when a leaf link is clicked.
 */
export default function MobileNav({ id, items, isOpen, onClose }: MobileNavProps) {
  function renderMenuTitle(item: WPMenuItemWithChildren) {
    const isHome = isHomepageMenuItem(item);

    return (
      <>
        {isHome && (
          <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#1600d8]">
            <FontAwesomeIcon
              icon={faHouse}
              className="h-4 w-4 text-white transition-transform duration-150 group-hover:scale-105"
              aria-hidden
            />
          </span>
        )}
        <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        id={id}
        className={`fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[90vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-blue-900 px-5 py-4">
          <span className="font-bold text-white">{SITE_NAME}</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-200 transition-colors hover:bg-blue-800 hover:text-white"
            aria-label="Đóng menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable nav list */}
        <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
          <ul role="list">
            {items.map((item) =>
              item.children.length > 0 ? (
                /* Expandable accordion using native <details> — no JS needed */
                <li key={item.id} className="border-b border-slate-100">
                  <details className="group">
                    <summary className="group flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50">
                      <span className="flex items-center gap-2">
                        {renderMenuTitle(item)}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                    </summary>

                    <ul className="border-t border-slate-100 bg-slate-50 pb-2 pt-1" role="list">
                      {/* Parent link repeated at top of sub-list */}
                      <li>
                        <Link
                          href={item.url}
                          onClick={onClose}
                          className="block px-5 py-2.5 text-sm font-medium text-blue-700 hover:text-blue-900"
                        >
                          Tất cả về{' '}
                          <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
                        </Link>
                      </li>
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.url}
                            onClick={onClose}
                            className="block px-7 py-2.5 text-sm text-slate-600 hover:text-blue-800"
                            target={child.target === '_blank' ? '_blank' : undefined}
                            rel={child.target === '_blank' ? 'noopener noreferrer' : undefined}
                          >
                            <span dangerouslySetInnerHTML={{ __html: child.title.rendered }} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                /* Leaf item */
                <li key={item.id} className="border-b border-slate-100">
                  <Link
                    href={item.url}
                    onClick={onClose}
                    className="group flex items-center gap-2 px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:text-blue-800"
                    target={item.target === '_blank' ? '_blank' : undefined}
                    rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                  >
                    {renderMenuTitle(item)}
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE_NAME}
        </div>
      </div>
    </>
  );
}
