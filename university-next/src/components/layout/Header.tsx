import { getNavigationData } from '@/services/navigation';
import NavShell from '@/components/layout/NavShell';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

function createFallbackItem(
  id: number,
  title: string,
  url: string,
  menuOrder: number
): WPMenuItemWithChildren {
  return {
    id,
    title: { rendered: title },
    url,
    description: '',
    type: 'custom',
    type_label: 'Custom Link',
    object: 'custom',
    object_id: 0,
    parent: 0,
    menu_order: menuOrder,
    status: 'publish',
    target: '',
    attr_title: '',
    classes: [],
    xfn: [],
    menus: 0,
    children: [],
  };
}

const fallbackPrimaryMenu: WPMenuItemWithChildren[] = [
  createFallbackItem(1, 'GIỚI THIỆU', '/gioi-thieu', 1),
  createFallbackItem(2, 'TIN TỨC', '/tin-tuc', 2),
  createFallbackItem(3, 'TUYỂN SINH', '/tuyen-sinh', 3),
  createFallbackItem(4, 'ĐÀO TẠO', '/dao-tao', 4),
  createFallbackItem(5, 'NGHIÊN CỨU', '/nghien-cuu', 5),
  createFallbackItem(6, 'HỢP TÁC QUỐC TẾ', '/hop-tac', 6),
  createFallbackItem(7, 'SINH VIÊN', '/sinh-vien', 7),
  createFallbackItem(8, 'eTLU', '/etlu', 8),
];

/**
 * Site-wide header — Server Component.
 *
 * Fetches all navigation menus in a single parallel request group,
 * then passes data down to the appropriate child components:
 *   Topbar   ← utility links (topbar WP menu)
 *   NavShell ← brand bar + desktop nav + mobile drawer + search (primary WP menu)
 */
export default async function Header() {
  const { primaryMenu } = await getNavigationData();
  const navItems = primaryMenu.length > 0 ? primaryMenu : fallbackPrimaryMenu;

  return (
    <header className="sticky top-0 z-30 w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
      <NavShell primaryItems={navItems} />
    </header>
  );
}
