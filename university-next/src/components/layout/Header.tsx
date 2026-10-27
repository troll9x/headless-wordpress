import NavShell from '@/components/layout/NavShell';
import { getFallbackPrimaryMenu } from '@/components/layout/fallbackMenus';
import { getMenuTree } from '@/lib/api/menus';
import type { SiteLogos } from '@/lib/wordpress/site-logo';

/**
 * Site-wide header — Server Component.
 *
 * Fetches all navigation menus in a single parallel request group,
 * then passes data down to the appropriate child components:
 *   Topbar   ← utility links (topbar WP menu)
 *   NavShell ← brand bar + desktop nav + mobile drawer + search (primary WP menu)
 */
export default async function Header({ logos }: { logos: SiteLogos | null }) {
  const [cmsVi, cmsEn] = await Promise.all([
    getMenuTree('primary', 'vi'),
    getMenuTree('primary', 'en'),
  ]);
  const primaryItemsVi = cmsVi.length ? cmsVi : getFallbackPrimaryMenu('vi');
  const primaryItemsEn = cmsEn.length ? cmsEn : getFallbackPrimaryMenu('en');

  return (
    <header className="sticky top-0 z-30 w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
      <NavShell primaryItemsVi={primaryItemsVi} primaryItemsEn={primaryItemsEn} logos={logos} />
    </header>
  );
}
