'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from '@/components/ui/icons';
import type { Locale } from '@/types/ngon-ngu';

const LOGO = 'https://tlu.edu.vn/wp-content/uploads/2025/08/Logo-Truong-Dai-hoc-Thuy-loi-am-ban.webp';

const FOOTER_LINKS = {
  vi: {
    about: [
      ['Tổng quan', '/gioi-thieu'],
      ['Sứ mạng', '/su-mang-muc-tieu-chien-luoc'],
      ['Tin tức & Sự kiện', '/tin-tuc-thong-bao'],
      ['Cơ cấu tổ chức', '/co-cau-to-chuc'],
    ],
    quick: [
      ['Các đơn vị đào tạo', '/khoa-dao-tao'],
      ['Đào tạo', '/dao-tao'],
      ['Tuyển sinh', '/tuyen-sinh'],
      ['Nghiên cứu', '/nghien-cuu'],
      ['Hợp tác quốc tế', '/doi-ngoai'],
    ],
  },
  en: {
    about: [
      ['Overview', '/en/about'],
      ['Mission', '/en/mission-goals-strategy'],
      ['News & Events', '/en/news'],
      ['Organizational Structure', '/en/organizational-structure'],
    ],
    quick: [
      ['Training Units', '/en/faculties'],
      ['Education', '/en/education'],
      ['Admissions', '/en/admission'],
      ['Research', '/en/research'],
      ['International Cooperation', '/en/external-relations'],
    ],
  },
} as const satisfies Record<Locale, { about: readonly (readonly [string, string])[]; quick: readonly (readonly [string, string])[] }>;

function LinkColumn({ title, items }: { title: string; items: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <h3 className="mb-5 text-sm font-bold uppercase text-white after:mt-2 after:block after:h-px after:w-7 after:bg-white/60">{title}</h3>
      <ul className="space-y-3 text-sm text-white/90">
        {items.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-yellow-300">{label}</Link></li>)}
      </ul>
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const locale: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'vi';
  const isEn = locale === 'en';
  const links = FOOTER_LINKS[locale];
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#0118d8] text-white">
      <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <div className="grid gap-5 border-b border-white/15 pb-8 md:grid-cols-[1.25fr_1fr_1fr_1fr] md:items-center">
          <Image src={LOGO} alt={isEn ? 'Thuyloi University' : 'Trường Đại học Thủy lợi'} width={360} height={78} className="h-auto w-[300px] max-w-full" />
          <p className="flex items-start gap-2 text-sm font-semibold"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />{isEn ? 'Address' : 'Địa chỉ'}:<br />{isEn ? '175 Tay Son - Kim Lien Ward - Hanoi' : '175 Tây Sơn - P. Kim Liên - Hà Nội'}</p>
          <p className="flex items-start gap-2 text-sm font-semibold"><EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0" />Email:<br /><a href="mailto:daihocthuyloi@tlu.edu.vn">daihocthuyloi@tlu.edu.vn</a></p>
          <p className="flex items-start gap-2 text-sm font-semibold"><PhoneIcon className="mt-0.5 h-4 w-4 shrink-0" />{isEn ? 'Phone' : 'Điện thoại'}:<br /><a href="tel:02438522201">(024) 38522201</a></p>
        </div>

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <LinkColumn title={isEn ? 'About us' : 'Giới thiệu'} items={links.about} />
          <LinkColumn title={isEn ? 'Quick links' : 'Truy cập nhanh'} items={links.quick} />
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase after:mt-2 after:block after:h-px after:w-7 after:bg-white/60">{isEn ? 'Follow TLU' : 'Theo dõi TLU'}</h3>
            <ul className="space-y-3 text-sm text-white/90">
              <li><a href="https://www.facebook.com/daihocthuyloi1959" target="_blank" rel="noreferrer" className="hover:text-yellow-300">Facebook</a></li>
              <li><a href="https://www.instagram.com/daihocthuyloi" target="_blank" rel="noreferrer" className="hover:text-yellow-300">Instagram</a></li>
              <li><a href="https://www.youtube.com/@daihocthuyloi" target="_blank" rel="noreferrer" className="hover:text-yellow-300">Youtube</a></li>
              <li><a href="https://www.tiktok.com/@daihocthuyloi" target="_blank" rel="noreferrer" className="hover:text-yellow-300">Tiktok</a></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase after:mt-2 after:block after:h-px after:w-7 after:bg-white/60">{isEn ? 'Thuyloi University' : 'Trường Đại học Thủy lợi'}</h3>
            <iframe title={isEn ? 'Map of Thuyloi University' : 'Bản đồ Trường Đại học Thủy lợi'} src="https://www.google.com/maps?q=Tr%C6%B0%E1%BB%9Dng+%C4%90%E1%BA%A1i+h%E1%BB%8Dc+Th%E1%BB%A7y+l%E1%BB%A3i+175+T%C3%A2y+S%C6%A1n&output=embed" className="h-40 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
        <p className="text-center text-xs font-semibold text-white">Copyright © {year} Thuyloi University. Dev by IT Center TLU.</p>
      </div>
    </footer>
  );
}
