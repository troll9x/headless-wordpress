'use client';

import { useCallback, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import MainMenu from '@/components/layout/MainMenu';
import MobileNav from '@/components/layout/MobileNav';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

interface NavShellProps {
  primaryItems: WPMenuItemWithChildren[];
}

export default function NavShell({ primaryItems }: NavShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useScrollLock(mobileOpen);

  return (
    <>
      <Topbar onMenuOpen={openMobile} mobileOpen={mobileOpen} />

      <nav className="relative z-10 hidden h-10 bg-[#1600d8] lg:block" aria-label="Điều hướng chính">
        <div className="mx-auto flex h-full max-w-[1240px] items-center justify-center px-4 sm:px-6 lg:px-8">
          <MainMenu items={primaryItems} />
        </div>
      </nav>

      <MobileNav
        id="mobile-nav"
        items={primaryItems}
        isOpen={mobileOpen}
        onClose={closeMobile}
      />
    </>
  );
}
