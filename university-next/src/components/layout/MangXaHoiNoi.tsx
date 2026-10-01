'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faInstagram,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { usePathname } from 'next/navigation';
import type { SiteSocialLinks, SocialPlatform } from '@/lib/wordpress/site-social';

const platforms = [
  { id: 'facebook', label: 'Facebook', color: 'text-[#1877f2]', icon: faFacebookF },
  { id: 'youtube', label: 'YouTube', color: 'text-[#ff0000]', icon: faYoutube },
  { id: 'instagram', label: 'Instagram', color: 'text-[#e4405f]', icon: faInstagram },
  { id: 'tiktok', label: 'TikTok', color: 'text-black', icon: faTiktok },
] as const;

export default function MangXaHoiNoi({ social }: { social: SiteSocialLinks | null }) {
  const pathname = usePathname();
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const links = platforms.flatMap((platform) => {
    const href = social?.[platform.id as SocialPlatform];
    return href ? [{ ...platform, href }] : [];
  });

  if (links.length === 0) return null;

  return (
    <nav className="fixed bottom-[40vh] right-0 z-20 flex flex-col gap-2 min-[768px]:bottom-auto min-[768px]:right-4 min-[768px]:top-[24vh]" aria-label={isEn ? 'Social media' : 'Mạng xã hội'}>
      {links.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} className={`flex h-10 w-10 items-center justify-center rounded-l-lg bg-white shadow-[0_5px_16px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5 min-[768px]:rounded-lg ${item.color}`}>
          <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
        </a>
      ))}
    </nav>
  );
}
