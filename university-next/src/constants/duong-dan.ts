import type { Locale } from '@/types/ngon-ngu';

/** Static route paths per locale. */
export const ROUTES = {
  vi: {
    home: '/',
    news: '/tin-tuc',
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
    cooperation: '/en/cooperation',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/** Build a post URL for the given locale. */
export function buildPostUrl(slug: string, locale: Locale): string {
  return locale === 'en' ? `/en/news/${slug}` : `/tin-tuc/${slug}`;
}

/** Return the news listing path for the given locale. */
export function getNewsPath(locale: Locale): string {
  return ROUTES[locale].news;
}

/** Return the home path for the given locale. */
export function getHomePath(locale: Locale): string {
  return ROUTES[locale].home;
}
