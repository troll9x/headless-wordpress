'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from '@/components/ui/icons';
import SearchBox from '@/components/layout/SearchBox';
import ChuyenNgonNgu from '@/components/ngon-ngu/ChuyenNgonNgu';

interface TopbarProps {
  onMenuOpen: () => void;
  mobileOpen: boolean;
}

const LOGO_URL = 'https://tlu.edu.vn/wp-content/uploads/2025/08/Logo-Truong-Dai-hoc-Thuy-loi.webp';

export default function Topbar({ onMenuOpen, mobileOpen }: TopbarProps) {
  const pathname = usePathname();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');

  return (
    <div className="relative z-40 bg-white">
      <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between gap-2 px-4 sm:h-[88px] sm:gap-4 sm:px-6 min-[1025px]:h-[100px] min-[1025px]:px-8">
        <Link
          href={isEnglish ? '/en' : '/'}
          className="flex min-w-0 items-center"
          aria-label={isEnglish ? 'Thuyloi University homepage' : 'Trang chủ Trường Đại học Thủy lợi'}
        >
          <Image
            src={LOGO_URL}
            alt={isEnglish ? 'Thuyloi University' : 'Trường Đại học Thủy lợi'}
            width={360}
            height={78}
            priority
            className="h-auto w-[220px] max-w-[calc(100vw-150px)] flex-none object-contain sm:w-[300px] min-[1025px]:w-[360px]"
          />
        </Link>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
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
