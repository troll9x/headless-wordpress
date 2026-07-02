import type { WPMenuItemWithChildren } from '@/types/wordpress';

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

function normalizePath(url: string) {
  try {
    const parsed = new URL(url, 'https://tlu.edu.vn');
    return parsed.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return url.replace(/\/+$/, '') || '/';
  }
}

function isDomainRoot(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'tlu.edu.vn' && (parsed.pathname.replace(/\/+$/, '') || '/') === '/';
  } catch {
    return false;
  }
}

export function isHomepageMenuItem(item: WPMenuItemWithChildren) {
  const path = normalizePath(item.url);
  const title = stripHtml(item.title.rendered).toLowerCase();

  return (
    path === '/' ||
    isDomainRoot(item.url) ||
    title.includes('trang chủ') ||
    title.includes('home')
  );
}
