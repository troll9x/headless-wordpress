'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import MainMenu from '@/components/layout/MainMenu';
import MobileNav from '@/components/layout/MobileNav';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { Locale } from '@/types/ngon-ngu';
import type { WPMenuItemWithChildren } from '@/types/wordpress';
import type { SiteLogos } from '@/lib/wordpress/site-logo';

interface NavShellProps {
  primaryItemsVi: WPMenuItemWithChildren[];
  primaryItemsEn: WPMenuItemWithChildren[];
  logos: SiteLogos | null;
}

export default function NavShell({ primaryItemsVi, primaryItemsEn, logos }: NavShellProps) {
  const pathname = usePathname();
  const locale: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'vi';
  const primaryItems = locale === 'en' ? primaryItemsEn : primaryItemsVi;
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useScrollLock(mobileOpen);

  return (
    <>
      <Topbar onMenuOpen={openMobile} mobileOpen={mobileOpen} logos={logos} />

      <nav
        className="relative z-10 hidden h-10 bg-[#0118d8] min-[1025px]:block"
        aria-label={locale === 'en' ? 'Main navigation' : 'Điều hướng chính'}
      >
        <div className="mx-auto flex h-full max-w-[1270px] items-center">
          <MainMenu items={primaryItems} pathname={pathname} />
        </div>
      </nav>

      <MobileNav
        id="mobile-nav"
        items={primaryItems}
        isOpen={mobileOpen}
        locale={locale}
        pathname={pathname}
        onClose={closeMobile}
      />
    </>
  );
}
