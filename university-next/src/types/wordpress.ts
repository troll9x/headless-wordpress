// ─── Shared primitives ────────────────────────────────────────────────────────

export interface WPRendered {
  rendered: string;
  protected?: boolean;
}

export interface WPApiError {
  code: string;
  message: string;
  data?: { status: number };
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface WPMediaSize {
  file: string;
  width: number;
  height: number;
  mime_type: string;
  source_url: string;
}

export interface WPMediaDetails {
  width: number;
  height: number;
  file: string;
  sizes: Record<string, WPMediaSize>;
}

export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  author: number;
  source_url: string;
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: WPMediaDetails;
}

// ─── Author (embedded) ────────────────────────────────────────────────────────

export interface WPAuthor {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface CategoryBannerData {
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  imageAlt: string;
  width: number;
  height: number;
}

export interface CategorySidebarTermItem {
  type: 'term';
  id: number;
  parent: number;
  name: string;
  slug: string;
  url: string;
  children: CategorySidebarItem[];
}

export interface CategorySidebarCustomItem {
  type: 'custom';
  label: string;
  url: string;
  children: CategorySidebarItem[];
}

export type CategorySidebarItem =
  | CategorySidebarTermItem
  | CategorySidebarCustomItem;

export interface CategorySidebarData {
  root: {
    id: number;
    name: string;
    slug: string;
    url: string;
  };
  items: CategorySidebarItem[];
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface WPTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}

// ─── Embedded resources (from ?_embed=1) ─────────────────────────────────────
// WordPress returns an error object instead of the resource when it's missing,
// so each slot is typed as a union.

export interface WPEmbedded {
  author?: (WPAuthor | WPApiError)[];
  'wp:featuredmedia'?: (WPMedia | WPApiError)[];
  'wp:term'?: (WPCategory | WPTag | WPApiError)[][];
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  format: string;
  categories: number[];
  tags: number[];
  /** Public post meta returned when the priority fields are registered with show_in_rest. */
  meta?: Record<string, unknown>;
  acf?: Record<string, unknown>;
  /** Also supported when a custom REST field exposes priority values at the post root. */
  post_priority_label?: 'hot' | 'new' | '';
  post_priority_order?: number | string;
  post_priority_expire_date?: string;
  /** Legacy field names used by the original WordPress shortcode. */
  _priority_label?: 'hot' | 'new' | '';
  _priority_order?: number | string;
  _priority_expire?: string;
  _embedded?: WPEmbedded;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  template: string;
  acf?: Record<string, unknown>;
  _embedded?: WPEmbedded;
}

// ─── Query params shared by all list endpoints ────────────────────────────────

export interface WPQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'id' | 'include' | 'relevance' | 'slug' | 'title' | 'modified' | 'count' | 'name';
  slug?: string;
  status?: string;
  author?: number;
  categories?: number | number[];
  tags?: number | number[];
  _embed?: 1 | boolean;
  /** Polylang language code. Append lang=vi or lang=en to filter by locale. */
  lang?: string;
}

// ─── Navigation Menus (wp/v2/menus + wp/v2/menu-items — WordPress 5.9+) ──────

export interface WPMenu {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  locations: string[];
  auto_add: boolean;
}

export interface WPMenuItem {
  id: number;
  title: WPRendered;
  url: string;
  description: string;
  type: string;          // 'post_type' | 'taxonomy' | 'custom'
  type_label: string;
  object: string;        // 'page' | 'category' | 'custom' | …
  object_id: number;
  parent: number;        // 0 for top-level items
  menu_order: number;
  status: string;
  target: string;        // '_blank' or ''
  attr_title: string;
  classes: string[];
  xfn: string[];
  menus: number;         // ID of the menu this item belongs to
}

/** WPMenuItem enriched with its nested children after tree-building. */
export interface WPMenuItemWithChildren extends WPMenuItem {
  children: WPMenuItemWithChildren[];
}

// ─── Site info (from /wp-json root) ──────────────────────────────────────────

export interface WPSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
}
