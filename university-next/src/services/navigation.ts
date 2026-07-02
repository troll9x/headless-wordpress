import { getMenuTree } from '@/lib/api/menus';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

export interface NavigationData {
  primaryMenu: WPMenuItemWithChildren[];
  footerMenu: WPMenuItemWithChildren[];
  topbarMenu: WPMenuItemWithChildren[];
}

/**
 * Fetches all navigation menus in parallel.
 * Each call is independently error-tolerant — a missing menu returns [].
 *
 * WordPress menu slugs/locations expected:
 *   primary  → main horizontal navigation
 *   footer   → footer link columns
 *   topbar   → utility bar quick links
 */
export async function getNavigationData(): Promise<NavigationData> {
  const [primaryMenu, footerMenu, topbarMenu] = await Promise.all([
    getMenuTree('primary'),
    getMenuTree('footer'),
    getMenuTree('topbar'),
  ]);

  return { primaryMenu, footerMenu, topbarMenu };
}
