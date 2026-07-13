import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_MENUS } from '@/constants/api';
import { WP_SITE_URL } from '@/config/env/server';
import type { WPMenu, WPMenuItem, WPMenuItemWithChildren } from '@/types/wordpress';

const TAGS = [CACHE_TAGS.MENUS];

export async function getMenus(): Promise<WPMenu[]> {
  return wpFetch<WPMenu[]>('/menus', {
    revalidate: REVALIDATE_MENUS,
    tags: TAGS,
  });
}

export async function getMenuItems(menuId: number): Promise<WPMenuItem[]> {
  return wpFetch<WPMenuItem[]>('/menu-items', {
    params: {
      menus: menuId,
      per_page: 100,
      order: 'asc',
      orderby: 'menu_order',
    },
    revalidate: REVALIDATE_MENUS,
    tags: TAGS,
  });
}

/**
 * WordPress menu item URLs are absolute (e.g. http://localhost/tlu.edu.vn/about/).
 * Convert same-origin URLs to relative paths so Next.js <Link> handles them correctly.
 */
function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url);
    const site = new URL(WP_SITE_URL);
    if (parsed.hostname === site.hostname) {
      return parsed.pathname || '/';
    }
  } catch {
    // Malformed URL — return as-is
  }
  return url;
}

/** Converts a flat array of WPMenuItems into a nested tree sorted by menu_order. */
export function buildMenuTree(items: WPMenuItem[]): WPMenuItemWithChildren[] {
  const map = new Map<number, WPMenuItemWithChildren>();
  const roots: WPMenuItemWithChildren[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, url: toRelativePath(item.url), children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent === 0) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent);
      // Orphaned items (parent deleted) fall back to root level
      (parent ?? { children: roots }).children.push(node);
    }
  }

  return roots.sort((a, b) => a.menu_order - b.menu_order);
}

/**
 * Fetches and tree-builds the WordPress menu identified by slug or location name.
 * Returns [] if the menu does not exist or the API is unreachable.
 */
export async function getMenuTree(
  slugOrLocation: string
): Promise<WPMenuItemWithChildren[]> {
  try {
    const menus = await getMenus();
    const menu =
      menus.find((m) => m.slug === slugOrLocation) ??
      menus.find((m) => m.locations.includes(slugOrLocation));

    if (!menu) return [];

    const items = await getMenuItems(menu.id);
    return buildMenuTree(items);
  } catch {
    return [];
  }
}
