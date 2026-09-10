'use client';

import { usePathname, useRouter } from 'next/navigation';
import './chuyen-ngon-ngu.css';

/**
 * Get the Vietnamese equivalent path from an English path.
 *
 * This uses string replacement as a quick client-side heuristic.
 * For flat dynamic routes (/en/[slug] → /[slug]),
 * the translated slug should ideally come from the backend resolve endpoint.
 * The current replace keeps the slug unchanged; if translated slugs differ,
 * a client fetch to the resolve endpoint would be needed.
 */
function getVietnamesePath(pathname: string) {
  if (pathname === '/en') return '/';
  const staticRoutes: Record<string, string> = {
    '/en/about': '/gioi-thieu',
    '/en/mission': '/su-mang',
    '/en/mission-goals-strategy': '/su-mang-muc-tieu-chien-luoc',
    '/en/admission': '/tuyen-sinh',
    '/en/education': '/dao-tao',
    '/en/research': '/nghien-cuu',
    '/en/external-relations': '/doi-ngoai',
    '/en/community': '/vi-cong-dong',
    '/en/organizational-structure': '/co-cau-to-chuc',
  };
  if (staticRoutes[pathname]) return staticRoutes[pathname];
  if (pathname.startsWith('/en/news/')) return pathname.replace('/en/news/', '/');
  if (pathname === '/en/news') return '/tin-tuc-thong-bao';
  if (pathname.startsWith('/en/category/')) return pathname.replace('/en/category/', '/');
  if (pathname === '/en/search') return '/tim-kiem';
  if (pathname.startsWith('/en/')) return pathname.replace('/en', '') || '/';
  return pathname;
}

/**
 * Get the English equivalent path from a Vietnamese path.
 *
 * Same heuristic as getVietnamesePath; the slug is assumed identical across locales.
 * When translated slugs differ, the resolve endpoint would be required.
 */
function getEnglishPath(pathname: string) {
  if (pathname === '/') return '/en';
  const staticRoutes: Record<string, string> = {
    '/gioi-thieu': '/en/about',
    '/su-mang': '/en/mission',
    '/su-mang-muc-tieu-chien-luoc': '/en/mission-goals-strategy',
    '/tuyen-sinh': '/en/admission',
    '/dao-tao': '/en/education',
    '/nghien-cuu': '/en/research',
    '/doi-ngoai': '/en/external-relations',
    '/vi-cong-dong': '/en/community',
    '/co-cau-to-chuc': '/en/organizational-structure',
  };
  if (staticRoutes[pathname]) return staticRoutes[pathname];
  if (pathname.startsWith('/tin-tuc-thong-bao/')) return pathname.replace('/tin-tuc-thong-bao/', '/en/');
  if (pathname === '/tin-tuc-thong-bao') return '/en/news';
  if (pathname.startsWith('/chuyen-muc/')) return pathname.replace('/chuyen-muc/', '/en/');
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
    const hash = window.location.hash;
    router.push(`${nextPath}${query ? `?${query}` : ''}${hash}`);
  }

  return (
    <label className="lang-ios-texttoggle" aria-label={isVietnamese ? 'Chuyển ngôn ngữ' : 'Switch language'}>
      <input
        type="checkbox"
        checked={isVietnamese}
        onChange={handleChange}
        aria-label={isVietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
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
