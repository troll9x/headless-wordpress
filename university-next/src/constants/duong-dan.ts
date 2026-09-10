import type { Locale } from '@/types/ngon-ngu';

/** Static route paths per locale. */
export const ROUTES = {
  vi: {
    home: '/',
    news: '/tin-tuc-thong-bao/tin-tuc/',
    about: '/gioi-thieu',
    admission: '/tuyen-sinh',
    training: '/dao-tao',
    research: '/nghien-cuu',
    cooperation: '/hop-tac',
  },
  en: {
    home: '/en',
    news: '/en/news',
    about: '/en/about',
    admission: '/en/admission',
    training: '/en/education',
    research: '/en/research',
    cooperation: '/en/external-relations',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * Build a post URL for the given locale.
 *
 * Permalink Manager can expose a public path that differs from `post.slug`
 * (for example, by appending the post ID). Prefer that public pathname when
 * WordPress supplied it and keep the slug-only form as a safe fallback.
 */
export function buildPostUrl(
  slug: string,
  locale: Locale,
  wordpressLink?: string,
): string {
  if (wordpressLink) {
    try {
      const pathname = new URL(wordpressLink).pathname.replace(/\/+$/, '');
      if (pathname && pathname !== '/') return pathname;
    } catch {
      // Fall back to the locale-aware slug below for malformed legacy links.
    }
  }

  return locale === 'en' ? `/en/${slug}` : `/${slug}`;
}

/** Build a category archive URL for the given locale. */
export function buildCategoryUrl(slug: string, locale: Locale): string {
  return locale === 'en' ? `/en/${slug}` : `/${slug}`;
}

/** Return the news listing path for the given locale. */
export function getNewsPath(locale: Locale): string {
  return ROUTES[locale].news;
}

/** Return the home path for the given locale. */
export function getHomePath(locale: Locale): string {
  return ROUTES[locale].home;
}
