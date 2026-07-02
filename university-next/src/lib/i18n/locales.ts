import type { Locale } from '@/types/ngon-ngu';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_CONFIG } from '@/constants/ngon-ngu';

export function getLocaleFromPathname(pathname: string): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  return DEFAULT_LOCALE;
}

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getOgLocale(locale: Locale): string {
  return locale === 'vi' ? 'vi_VN' : 'en_US';
}

export function getWpLang(locale: Locale): string {
  return LOCALE_CONFIG[locale].wpLang;
}
