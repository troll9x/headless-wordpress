'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MenuIcon } from '@/components/ui/icons';
import SearchBox from '@/components/layout/SearchBox';
import ChuyenNgonNgu from '@/components/ngon-ngu/ChuyenNgonNgu';

interface TopbarProps {
  onMenuOpen: () => void;
  mobileOpen: boolean;
}

const LOGO_URL = 'https://tlu.edu.vn/wp-content/uploads/2025/08/Logo-Truong-Dai-hoc-Thuy-loi.webp';

export default function Topbar({ onMenuOpen, mobileOpen }: TopbarProps) {
  return (
    <div className="relative z-40 bg-white">
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:h-[88px] sm:px-6 lg:h-[100px] lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Trang chủ">
          <Image
            src={LOGO_URL}
            alt="Trường Đại học Thủy lợi"
            width={360}
            height={78}
            priority
            className="h-auto w-[230px] flex-none object-contain sm:w-[300px] lg:w-[360px]"
          />
        </Link>

        <div className="flex flex-none items-center gap-3">
          <div className="relative z-50 hidden md:block">
            <SearchBox />
          </div>
          <ChuyenNgonNgu />
          <button
            type="button"
            onClick={onMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1600d8] transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1600d8] lg:hidden"
            aria-label="Mở menu"
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
