'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function startNavigation(href: string) {
  window.dispatchEvent(new CustomEvent('tlu:navigate', { detail: href }));
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  return <Progress key={`${pathname}?${params}`} isEn={pathname === '/en' || pathname.startsWith('/en/')} />;
}

function Progress({ isEn }: { isEn: boolean }) {
  const [destination, setDestination] = useState('');
  const [slow, setSlow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    function start(href: string) {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || `${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) return;
      clearTimeout(timer.current);
      setDestination(`${url.pathname}${url.search}${url.hash}`);
      setSlow(false);
      timer.current = setTimeout(() => setSlow(true), 20_000);
    }
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      if (!/^https?:/.test(anchor.href)) return;
      start(anchor.href);
    }
    function onNavigate(event: Event) {
      if (event instanceof CustomEvent && typeof event.detail === 'string') start(event.detail);
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('tlu:navigate', onNavigate);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('tlu:navigate', onNavigate);
    };
  }, []);
  if (!destination) return null;
  return slow ? (
    <div role="alert" className="fixed right-4 top-4 z-[200] max-w-sm rounded bg-white p-4 text-sm shadow-xl">
      {isEn ? 'This page is taking longer than expected.' : 'Trang đang tải lâu hơn dự kiến.'}{' '}
      <a className="underline" href={destination}>{isEn ? 'Retry' : 'Thử lại'}</a>{' '}
      <button onClick={() => setDestination('')}>{isEn ? 'Dismiss' : 'Đóng'}</button>
    </div>
  ) : (
    <div role="status" data-testid="navigation-progress" className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      <div className="rounded-full bg-white/90 p-3 shadow-lg">
        <div className="h-9 w-9 rounded-full border-[3px] border-blue-100 border-t-blue-700 motion-safe:animate-spin" />
      </div>
      <span className="sr-only">{isEn ? 'Loading page' : 'Đang tải trang'}</span>
    </div>
  );
}
