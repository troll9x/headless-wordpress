'use client';

import { usePathname, useRouter } from 'next/navigation';
import './chuyen-ngon-ngu.css';

function getVietnamesePath(pathname: string) {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/news/')) return pathname.replace('/en/news/', '/tin-tuc/');
  if (pathname === '/en/news') return '/tin-tuc';
  if (pathname === '/en/search') return '/tim-kiem';
  if (pathname.startsWith('/en/')) return pathname.replace('/en', '') || '/';
  return pathname;
}

function getEnglishPath(pathname: string) {
  if (pathname === '/') return '/en';
  if (pathname.startsWith('/tin-tuc/')) return pathname.replace('/tin-tuc/', '/en/news/');
  if (pathname === '/tin-tuc') return '/en/news';
  if (pathname === '/tim-kiem') return '/en/search';
  if (pathname.startsWith('/en')) return pathname;
  return `/en${pathname}`;
}

export default function ChuyenNgonNgu() {
  const pathname = usePathname();
  const router = useRouter();
  const isVietnamese = !pathname.startsWith('/en');

  function handleChange() {
    const nextPath = isVietnamese ? getEnglishPath(pathname) : getVietnamesePath(pathname);
    const query = window.location.search.replace(/^\?/, '');
    router.push(query ? `${nextPath}?${query}` : nextPath);
  }

  return (
    <label className="lang-ios-texttoggle" aria-label="Chuyển ngôn ngữ">
      <input
        type="checkbox"
        checked={isVietnamese}
        onChange={handleChange}
        aria-label={isVietnamese ? 'Chuyển sang tiếng Anh' : 'Chuyển sang tiếng Việt'}
      />
      <span className="track">
        <span className="label-text en">EN</span>
        <span className="label-text vi">VN</span>
        <span className="knob">
          <span className="flag flag-en" aria-hidden>
            EN
          </span>
          <span className="flag flag-vi" aria-hidden>
            ★
          </span>
        </span>
      </span>
    </label>
  );
}
