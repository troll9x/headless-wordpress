'use client';

import { usePathname } from 'next/navigation';
import { FacebookIcon, YouTubeIcon } from '@/components/ui/icons';

const links = [
  { label: 'Facebook', href: 'https://facebook.com/daihocthuyloi1959', color: 'text-[#1877f2]', icon: <FacebookIcon className="h-5 w-5" /> },
  { label: 'YouTube', href: 'https://youtube.com/@daihocthuyloi', color: 'text-red-600', icon: <YouTubeIcon className="h-5 w-5" /> },
  { label: 'Instagram', href: 'https://instagram.com/daihocthuyloi', color: 'text-pink-600', icon: <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 border-current text-[9px]">●</span> },
  { label: 'TikTok', href: 'https://www.tiktok.com/@daihocthuyloi1959', color: 'text-black', icon: <span className="text-xl font-black leading-none">♪</span> },
] as const;

export default function MangXaHoiNoi() {
  const pathname = usePathname();
  const isEn = pathname === '/en' || pathname.startsWith('/en/');

  return (
    <nav className="fixed bottom-[40vh] right-0 z-20 flex flex-col gap-2 min-[768px]:bottom-auto min-[768px]:right-4 min-[768px]:top-[24vh]" aria-label={isEn ? 'Social media' : 'Mạng xã hội'}>
      {links.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} className={`flex h-10 w-10 items-center justify-center rounded-l-lg bg-white shadow-[0_5px_16px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5 min-[768px]:rounded-lg ${item.color}`}>
          {item.icon}
        </a>
      ))}
    </nav>
  );
}
