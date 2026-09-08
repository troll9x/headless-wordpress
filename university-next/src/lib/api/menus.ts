import { wpFetch } from '@/lib/wordpress/client';
import { CACHE_TAGS, REVALIDATE_MENUS } from '@/constants/api';
import { WP_SITE_URL } from '@/config/env/server';
import type { Locale } from '@/types/ngon-ngu';
import type { WPRendered } from '@/types/wordpress';
import type { WPMenu, WPMenuItem, WPMenuItemWithChildren } from '@/types/wordpress';

const TAGS = [CACHE_TAGS.MENUS];

export async function getMenus(): Promise<WPMenu[]> {
  return wpFetch<WPMenu[]>('/menus', {
    revalidate: REVALIDATE_MENUS,
    tags: TAGS,
  });
}

export async function getMenuItems(menuId: number, locale: Locale): Promise<WPMenuItem[]> {
  return wpFetch<WPMenuItem[]>('/menu-items', {
    params: {
      menus: menuId,
      lang: locale,
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
function toRelativePath(url: string, objectType: string): string {
  try {
    const parsed = new URL(url);
    const site = new URL(WP_SITE_URL);
    const isFrontendUrl = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (parsed.hostname === site.hostname || isFrontendUrl) {
      let pathname = parsed.pathname || '/';

      // Permalink Manager exposes category archives as /[slug] and /en/[slug].
      if (objectType === 'category') {
        const segments = pathname.split('/').filter(Boolean);
        const slug = segments.at(-1);
        if (slug) pathname = segments[0] === 'en' ? `/en/${slug}` : `/${slug}`;
      }

      return `${pathname.replace(/\/+$/, '') || '/'}${parsed.hash}`;
    }
  } catch {
    // Malformed URL — return as-is
  }
  return url;
}

interface HeadlessMenuItem {
  id?: number | string;
  menu_item_id?: number | string;
  parent?: number | string;
  menu_item_parent?: number | string;
  title?: string | WPRendered;
  label?: string;
  url?: string;
  description?: string;
  type?: string;
  object?: string;
  object_id?: number | string;
  target?: string;
  classes?: string[] | string;
  menu_order?: number | string;
  order?: number | string;
  children?: HeadlessMenuItem[];
}

interface HeadlessMenuResponse {
  items?: HeadlessMenuItem[];
  data?: { items?: HeadlessMenuItem[] };
}

function getHeadlessItems(payload: unknown): HeadlessMenuItem[] {
  if (Array.isArray(payload)) return payload as HeadlessMenuItem[];
  if (!payload || typeof payload !== 'object') return [];

  const response = payload as HeadlessMenuResponse;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data?.items)) return response.data.items;
  return [];
}

function normalizeHeadlessItems(rawItems: HeadlessMenuItem[]): WPMenuItem[] {
  let generatedId = 1_000_000;
  const normalized: WPMenuItem[] = [];

  const visit = (raw: HeadlessMenuItem, inheritedParent = 0, index = 0) => {
    const parsedId = Number(raw.id ?? raw.menu_item_id);
    const id = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : generatedId++;
    const parsedParent = inheritedParent > 0
      ? inheritedParent
      : Number(raw.parent ?? raw.menu_item_parent ?? 0);
    const parsedOrder = Number(raw.menu_order ?? raw.order ?? index + 1);
    const title = typeof raw.title === 'string'
      ? raw.title
      : raw.title?.rendered ?? raw.label ?? '';
    const classes = Array.isArray(raw.classes)
      ? raw.classes
      : typeof raw.classes === 'string'
        ? raw.classes.split(/\s+/).filter(Boolean)
        : [];

    normalized.push({
      id,
      title: { rendered: title },
      url: raw.url || '#',
      description: raw.description ?? '',
      type: raw.type ?? 'custom',
      type_label: raw.type === 'taxonomy' ? 'Category' : 'Custom Link',
      object: raw.object ?? 'custom',
      object_id: Number(raw.object_id) || 0,
      parent: Number.isFinite(parsedParent) ? parsedParent : inheritedParent,
      menu_order: Number.isFinite(parsedOrder) ? parsedOrder : index + 1,
      status: 'publish',
      target: raw.target === '_blank' ? '_blank' : '',
      attr_title: '',
      classes,
      xfn: [],
      menus: 0,
    });

    raw.children?.forEach((child, childIndex) => visit(child, id, childIndex));
  };

  rawItems.forEach((item, index) => visit(item, 0, index));
  return normalized;
}

async function getHeadlessMenuTree(
  slugOrLocation: string,
  locale: Locale,
): Promise<WPMenuItemWithChildren[]> {
  const fetchMenu = async (includeLanguage: boolean) => {
    const url = new URL('/wp-json/headless/v1/menus', WP_SITE_URL);
    url.searchParams.set('location', slugOrLocation);
    if (includeLanguage) url.searchParams.set('lang', locale);

    return fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_MENUS,
        tags: [...TAGS, `menu-${slugOrLocation}-${locale}${includeLanguage ? '' : '-default'}`],
      },
      signal: AbortSignal.timeout(10_000),
    });
  };

  try {
    // The current TLU endpoint resolves VI only without a lang parameter.
    // EN keeps the language parameter so it can start working independently.
    const response = await fetchMenu(locale !== 'vi');

    if (!response.ok) return [];
    const items = getHeadlessItems(await response.json());
    return buildMenuTree(normalizeHeadlessItems(items));
  } catch {
    return [];
  }
}

/** Converts a flat array of WPMenuItems into a nested tree sorted by menu_order. */
export function buildMenuTree(items: WPMenuItem[]): WPMenuItemWithChildren[] {
  const map = new Map<number, WPMenuItemWithChildren>();
  const roots: WPMenuItemWithChildren[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, url: toRelativePath(item.url, item.object), children: [] });
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

  const sortLevel = (level: WPMenuItemWithChildren[]): WPMenuItemWithChildren[] =>
    level
      .sort((a, b) => a.menu_order - b.menu_order)
      .map((item) => ({ ...item, children: sortLevel(item.children) }));

  return sortLevel(roots);
}

/**
 * Fetches and tree-builds the WordPress menu identified by slug or location name.
 * Returns [] if the menu does not exist or the API is unreachable.
 */
export async function getMenuTree(
  slugOrLocation: string,
  locale: Locale = 'vi',
): Promise<WPMenuItemWithChildren[]> {
  const headlessMenu = await getHeadlessMenuTree(slugOrLocation, locale);
  if (headlessMenu.length > 0) return headlessMenu;

  try {
    const menus = await getMenus();
    const menu =
      menus.find((m) => m.slug === slugOrLocation) ??
      menus.find((m) => m.locations.includes(slugOrLocation));

    if (!menu) return [];

    const items = await getMenuItems(menu.id, locale);
    return buildMenuTree(items);
  } catch {
    return [];
  }
}
