'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from '@/components/ui/icons';
import SearchBox from '@/components/layout/SearchBox';
import ChuyenNgonNgu from '@/components/ngon-ngu/ChuyenNgonNgu';
import type { SiteLogos } from '@/lib/wordpress/site-logo';

interface TopbarProps {
  onMenuOpen: () => void;
  mobileOpen: boolean;
  logos: SiteLogos | null;
}

export default function Topbar({ onMenuOpen, mobileOpen, logos }: TopbarProps) {
  const pathname = usePathname();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const logo = logos?.header[isEnglish ? 'en' : 'vi'] ?? null;

  return (
    <div className="relative z-40 bg-white">
      <div className="mx-auto flex h-[76px] max-w-[1270px] items-center justify-between gap-2 px-4 sm:h-[88px] sm:gap-4 sm:px-6 min-[1025px]:h-[100px] min-[1025px]:px-0">
        {logo && (
          <Link
            href={isEnglish ? '/en' : '/'}
            className="relative block h-[48px] w-[220px] max-w-[calc(100vw-150px)] flex-none sm:h-[65px] sm:w-[300px] min-[1025px]:h-[100px] min-[1025px]:w-[350px]"
          >
            <Image
              src={logo.url}
              alt={logo.alt}
              fill
              priority
              className="object-contain object-left"
              sizes="(min-width: 1025px) 350px, (min-width: 640px) 300px, 220px"
            />
          </Link>
        )}

        <div className="ml-auto flex flex-none items-center gap-2 sm:gap-3">
          <div className="relative z-50 hidden min-[1025px]:block">
            <SearchBox />
          </div>
          <ChuyenNgonNgu />
          <button
            id="main-menu-button"
            type="button"
            onClick={onMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#0118d8] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0118d8] min-[1025px]:hidden"
            aria-label={isEnglish ? 'Open menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
