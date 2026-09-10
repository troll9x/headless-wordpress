'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';
import { getMenuItemLabel, isMenuItemActive } from '@/components/layout/navigationUtils';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface MainMenuProps {
  items: WPMenuItemWithChildren[];
  pathname: string;
}

function externalProps(item: WPMenuItemWithChildren) {
  return item.target === '_blank'
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
}

function DesktopSubmenu({ items, depth = 0 }: { items: WPMenuItemWithChildren[]; depth?: number }) {
  return (
    <ul className="py-1" role="menu">
      {items.map((item) => {
        const hasChildren = item.children.length > 0;

        return (
          <li key={item.id} className="group/sub relative mx-3 border-b border-slate-200 last:border-b-0" role="none">
            <Link
              href={item.url}
              {...externalProps(item)}
              onClick={(event) => event.currentTarget.blur()}
              className="flex min-h-10 items-center justify-between gap-4 py-2.5 text-[14px] font-semibold leading-5 text-slate-800 transition-colors hover:text-[#136aa0] focus-visible:text-[#136aa0] focus-visible:outline-none"
              role="menuitem"
            >
              <span>{getMenuItemLabel(item)}</span>
              {hasChildren && <ChevronRightIcon className="h-3.5 w-3.5 flex-none text-slate-400" />}
            </Link>

            {hasChildren && depth < 3 && (
              <div className="invisible absolute left-full top-0 z-50 w-72 translate-x-1 border border-slate-200 bg-white opacity-0 shadow-xl transition-all duration-150 group-hover/sub:visible group-hover/sub:translate-x-0 group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:translate-x-0 group-focus-within/sub:opacity-100">
                <DesktopSubmenu items={item.children} depth={depth + 1} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MainMenu({ items, pathname }: MainMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);

  // The header persists between App Router navigations. A clicked link therefore
  // kept focus, and `group-focus-within` left its dropdown visible on the next page.
  useEffect(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && menuRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }, [pathname]);

  if (!items.length) return null;

  return (
    <ul ref={menuRef} className="flex h-full w-full items-stretch font-sans" role="list">
      {items.map((item, index) => {
        const label = getMenuItemLabel(item);
        const hasChildren = item.children.length > 0;
        const isActive = isMenuItemActive(item, pathname);
        const alignRight = index >= items.length - 2;

        return (
          <li key={item.id} className="group relative flex min-w-0 flex-1 border-r border-white/70 first:border-l">
            {item.url === '#' ? (
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-1.5 px-2 text-center text-[12px] font-bold uppercase leading-4 text-white transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none xl:text-[13px]"
                aria-haspopup={hasChildren ? 'menu' : undefined}
              >
                <span>{label}</span>
                {hasChildren && <ChevronDownIcon className="h-3.5 w-3.5 flex-none text-white/85 transition-transform group-hover:rotate-180" />}
              </button>
            ) : (
              <Link
                href={item.url}
                {...externalProps(item)}
                onClick={(event) => event.currentTarget.blur()}
                className={`flex h-12 w-full items-center justify-center gap-1.5 px-2 text-center text-[12px] font-bold uppercase leading-4 text-white transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none xl:text-[13px] ${isActive ? 'bg-white/15' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-haspopup={hasChildren ? 'menu' : undefined}
              >
                <span>{label}</span>
                {hasChildren && <ChevronDownIcon className="h-3.5 w-3.5 flex-none text-white/85 transition-transform group-hover:rotate-180" />}
              </Link>
            )}

            {hasChildren && (
              <div className={`invisible absolute top-full z-50 w-72 translate-y-1 border border-slate-200 border-t-2 border-t-[#136aa0] bg-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${alignRight ? 'right-0' : 'left-0'}`}>
                <DesktopSubmenu items={item.children} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
