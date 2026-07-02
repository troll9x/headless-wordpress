import type { Locale } from '@/types/ngon-ngu';
import { buildPostUrl, getHomePath, ROUTES } from '@/constants/duong-dan';

export { buildPostUrl, getHomePath };

/** Map a Vietnamese path to its equivalent in another locale. */
const VI_TO_EN_MAP: Record<string, string> = {
  '/': '/en',
  '/tin-tuc': '/en/news',
  '/gioi-thieu': '/en/about',
  '/tuyen-sinh': '/en/admission',
  '/dao-tao': '/en/education',
  '/nghien-cuu': '/en/research',
  '/hop-tac': '/en/cooperation',
};

const EN_TO_VI_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(VI_TO_EN_MAP).map(([vi, en]) => [en, vi])
);

/**
 * Returns the equivalent path for the given locale.
 * For post URLs, use buildPostUrl(slug, locale) instead.
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  if (locale === 'en') return VI_TO_EN_MAP[path] ?? '/en';
  return EN_TO_VI_MAP[path] ?? '/';
}

export { ROUTES };
