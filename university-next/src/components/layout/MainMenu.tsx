import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { ChevronDownIcon } from '@/components/ui/icons';
import { isHomepageMenuItem } from '@/components/layout/navigationUtils';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface MainMenuProps {
  items: WPMenuItemWithChildren[];
}

export default function MainMenu({ items }: MainMenuProps) {
  if (!items.length) return null;

  return (
    <ul className="flex h-full items-stretch justify-center" role="list">
      {items.map((item) => {
        const isHome = isHomepageMenuItem(item);

        return (
          <li
            key={item.id}
            className="group relative flex border-r border-white/45 first:border-l"
          >
            <Link
              href={item.url}
              className="flex h-10 items-center gap-1.5 px-5 text-[14px] font-bold uppercase text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none xl:px-6"
              target={item.target === '_blank' ? '_blank' : undefined}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {isHome && (
                <FontAwesomeIcon
                  icon={faHouse}
                  className="h-4 w-4 text-white transition-transform duration-150 group-hover:scale-105"
                  aria-hidden
                />
              )}
              {!isHome && <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />}
              {item.children.length > 0 && (
                <ChevronDownIcon className="h-3.5 w-3.5 text-white/80 transition-transform duration-200 group-hover:rotate-180" />
              )}
            </Link>

            {item.children.length > 0 && (
              <div
                className="invisible absolute left-0 top-full z-50 min-w-60 translate-y-1 border border-slate-100 bg-white py-1.5 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                role="menu"
              >
                {item.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.url}
                    className="block px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#1600d8] focus:bg-blue-50 focus:text-[#1600d8] focus:outline-none"
                    role="menuitem"
                    target={child.target === '_blank' ? '_blank' : undefined}
                    rel={child.target === '_blank' ? 'noopener noreferrer' : undefined}
                  >
                    <span dangerouslySetInnerHTML={{ __html: child.title.rendered }} />
                  </Link>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
