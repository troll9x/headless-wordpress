export const WP_API_URL =
  process.env.WP_API_URL ?? 'https://tlu.edu.vn/wp-json/wp/v2';

export const WP_SITE_URL =
  process.env.WP_SITE_URL ?? 'https://tlu.edu.vn';

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? 'MyLab TLU';

export const FRONTEND_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// ISR revalidation windows (seconds)
export const REVALIDATE_POSTS = 60;
export const REVALIDATE_PAGES = 300;
export const REVALIDATE_CATEGORIES = 600;
export const REVALIDATE_MEDIA = 3600;
export const REVALIDATE_MENUS = 3600;

// Default fetch limit used when no per_page is specified
export const DEFAULT_PER_PAGE = 10;

// Cache tags — used with revalidateTag() for on-demand ISR
export const CACHE_TAGS = {
  POSTS: 'wp-posts',
  PAGES: 'wp-pages',
  CATEGORIES: 'wp-categories',
  MEDIA: 'wp-media',
  MENUS: 'wp-menus',
} as const;
