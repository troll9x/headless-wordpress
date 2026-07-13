export const REVALIDATE_POSTS = 60;
export const REVALIDATE_PAGES = 300;
export const REVALIDATE_CATEGORIES = 600;
export const REVALIDATE_MEDIA = 3600;
export const REVALIDATE_MENUS = 3600;

export const DEFAULT_PER_PAGE = 10;

export const CACHE_TAGS = {
  POSTS: 'wp-posts',
  PAGES: 'wp-pages',
  CATEGORIES: 'wp-categories',
  MEDIA: 'wp-media',
  MENUS: 'wp-menus',
} as const;