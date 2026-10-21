'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { startNavigation } from '@/components/layout/NavigationProgress';
import './chuyen-ngon-ngu.css';

const pairs: Record<string, string> = {
  '/': '/en',
  '/su-mang-muc-tieu-chien-luoc': '/en/mission-goals-strategy',
  '/co-cau-to-chuc': '/en/organizational-structure',
  '/tim-kiem': '/en/search',
};

export default function ChuyenNgonNgu() {
  const pathname = usePathname();
  // Shared layouts survive navigation. Reset lookup/lock state for the new URL.
  return <LanguageSwitch key={pathname} pathname={pathname} />;
}

function LanguageSwitch({ pathname }: { pathname: string }) {
  const router = useRouter();
  const isVietnamese = !(pathname === '/en' || pathname.startsWith('/en/'));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const locked = useRef(false);

  function handleChange() {
    if (locked.current || pending) return;
    locked.current = true;
    setError(false);
    startTransition(async () => {
      try {
        const locale = isVietnamese ? 'en' : 'vi';
        const path = pathname.replace(/\/+$/, '') || '/';
        let nextPath = isVietnamese ? pairs[path] : Object.entries(pairs).find(([, en]) => en === path)?.[0];
        if (!nextPath) {
          const params = new URLSearchParams({ path, lang: locale });
          const response = await fetch(`/api/translation?${params}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error('Translation lookup failed');
          const payload = await response.json() as { path?: unknown };
          if (typeof payload.path !== 'string' || !payload.path.startsWith('/') || payload.path.startsWith('//')) throw new Error('Invalid translation');
          nextPath = payload.path;
        }
        // Search terms are meaningful across languages; archive page numbers and
        // article anchors generally refer to different content after translation.
        const query = path === '/tim-kiem' || path === '/en/search'
          ? new URLSearchParams({ q: new URLSearchParams(window.location.search).get('q') || '' }).toString()
          : '';
        const destination = `${nextPath}${query ? `?${query}` : ''}`;
        startNavigation(destination);
        startTransition(() => router.push(destination));
      } catch {
        setError(true);
      } finally {
        locked.current = false;
      }
    });
  }

  return (
    <div className="relative flex items-center gap-2">
      <label className="lang-ios-texttoggle" aria-label={isVietnamese ? 'Chuyển ngôn ngữ' : 'Switch language'} aria-busy={pending}>
        <input type="checkbox" checked={isVietnamese} onChange={handleChange} disabled={pending}
          aria-label={isVietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'} />
        <span className="track">
          <span className="knob" aria-hidden />
          <span className="flag flag-en" aria-hidden>
            <svg viewBox="0 0 60 30" role="presentation" focusable="false">
              <rect width="60" height="30" fill="#012169" />
              <path d="M0 0 60 30 M60 0 0 30" stroke="#fff" strokeWidth="7" />
              <path d="M0 0 60 30 M60 0 0 30" stroke="#c8102e" strokeWidth="2.5" />
              <path d="M30 0v30 M0 15h60" stroke="#fff" strokeWidth="10" />
              <path d="M30 0v30 M0 15h60" stroke="#c8102e" strokeWidth="5" />
            </svg>
          </span>
          <span className="flag flag-vi" aria-hidden>
            <svg viewBox="0 0 60 30" role="presentation" focusable="false">
              <rect width="60" height="30" fill="#da251d" />
              <polygon points="30,4 32.6,11.5 40.5,11.5 34.1,16.2 36.7,24 30,19.3 23.3,24 25.9,16.2 19.5,11.5 27.4,11.5" fill="#ff0" />
            </svg>
          </span>
        </span>
      </label>
      {pending && <span role="status" className="text-xs text-blue-800"><span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-800 motion-safe:animate-spin" /><span className="sr-only">{isVietnamese ? 'Đang chuyển ngôn ngữ' : 'Switching language'}</span></span>}
      {error && <div role="alert" className="absolute right-0 top-full w-56 rounded bg-white p-3 text-sm text-red-800 shadow-lg">
        <span>{isVietnamese ? 'Chưa chuyển được ngôn ngữ.' : 'Unable to switch language.'}</span>{' '}
        <button type="button" onClick={handleChange} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">
          {isVietnamese ? 'Thử lại' : 'Try again'}
        </button>
      </div>}
    </div>
  );
}
