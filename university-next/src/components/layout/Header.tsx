import { getMenuTree } from '@/lib/api/menus';
import NavShell from '@/components/layout/NavShell';
import {
  getFallbackPrimaryMenu,
  mergeMenuWithFallback,
} from '@/components/layout/fallbackMenus';

/**
 * Site-wide header — Server Component.
 *
 * Fetches all navigation menus in a single parallel request group,
 * then passes data down to the appropriate child components:
 *   Topbar   ← utility links (topbar WP menu)
 *   NavShell ← brand bar + desktop nav + mobile drawer + search (primary WP menu)
 */
export default async function Header() {
  const vietnameseMenu = await getMenuTree('primary', 'vi');

  const fallbackVi = getFallbackPrimaryMenu('vi');
  const fallbackEn = getFallbackPrimaryMenu('en');
  const primaryItemsVi = vietnameseMenu.length > 0
    ? mergeMenuWithFallback(vietnameseMenu, fallbackVi)
    : fallbackVi;
  // WordPress currently exposes only the default VI menu at this location.
  // Avoid a guaranteed EN 404 on every request until an EN menu location exists.
  const primaryItemsEn = fallbackEn;

  return (
    <header className="sticky top-0 z-30 w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
      <NavShell primaryItemsVi={primaryItemsVi} primaryItemsEn={primaryItemsEn} />
    </header>
  );
}
