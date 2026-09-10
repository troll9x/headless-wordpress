import { stripHtml } from '@/lib/utils/html';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

export function normalizeMenuPath(url: string) {
  if (!url || url === '#') return '#';

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
  const path = normalizeMenuPath(item.url);
  const title = stripHtml(item.title.rendered).toLowerCase();

  return path === '/' || isDomainRoot(item.url) || title.includes('trang chủ') || title.includes('home');
}

export function getMenuItemLabel(item: WPMenuItemWithChildren) {
  return stripHtml(item.title.rendered);
}

export function isMenuItemActive(item: WPMenuItemWithChildren, pathname: string): boolean {
  const itemPath = normalizeMenuPath(item.url);
  const currentPath = normalizeMenuPath(pathname);
  const ownPathIsActive = itemPath !== '#'
    && itemPath !== '/'
    && (currentPath === itemPath || currentPath.startsWith(`${itemPath}/`));

  return ownPathIsActive || item.children.some((child) => isMenuItemActive(child, pathname));
}
