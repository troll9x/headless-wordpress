import type { Locale } from '@/types/ngon-ngu';
import type { WPPost, WPPage } from '@/types/wordpress';
import { buildPostUrl } from '@/constants/duong-dan';
import { LOCALE_CONFIG } from '@/constants/ngon-ngu';

/** Returns the WordPress `lang` query param value for a locale. */
export function getWpLangParam(locale: Locale): string {
  return LOCALE_CONFIG[locale].wpLang;
}

/**
 * Extracts the translated slug for the target locale from a WordPress post/page.
 *
 * Polylang Pro exposes translations in two possible places:
 *  1. `translations` object: { vi: 'slug-vi', en: 'slug-en' }
 *  2. ACF field: `translation_{locale}_slug`
 *
 * Returns null when no translation data is found (Polylang not configured
 * or using the free tier without REST API support).
 */
export function getTranslationSlug(
  post: WPPost | WPPage,
  targetLocale: Locale,
): string | null {
  const raw = post as unknown as Record<string, unknown>;

  // The Headless API returns translation records; some WP REST installations
  // expose Polylang's language-to-value map. Support either response shape.
  const translations = raw['translations'];
  if (Array.isArray(translations)) {
    const translation = translations.find((item) =>
      typeof item === 'object' && item !== null &&
      (item as Record<string, unknown>).language === targetLocale,
    ) as Record<string, unknown> | undefined;
    if (typeof translation?.slug === 'string' && translation.slug) return translation.slug;
  } else if (translations && typeof translations === 'object') {
    const translatedSlug = (translations as Record<string, unknown>)[targetLocale];
    if (typeof translatedSlug === 'string' && translatedSlug) return translatedSlug;
  }

  // ACF fallback: `translation_en_slug` or `translation_vi_slug`
  const acf = (post.acf ?? {}) as Record<string, unknown>;
  const acfKey = `translation_${targetLocale}_slug`;
  if (typeof acf[acfKey] === 'string' && acf[acfKey]) return acf[acfKey] as string;

  return null;
}

/**
 * Returns the URL for a verified translated post slug.
 *
 * Returns null when translation mapping is unavailable. Metadata must omit an
 * unverified alternate rather than pointing an article alternate to a homepage.
 */
export function getTranslatedPostUrl(
  post: WPPost,
  targetLocale: Locale,
): string | null {
  const rawTranslations = (post as unknown as Record<string, unknown>)['translations'];
  if (Array.isArray(rawTranslations)) {
    const translation = rawTranslations.find((item) =>
      typeof item === 'object' && item !== null &&
      (item as Record<string, unknown>).language === targetLocale,
    ) as Record<string, unknown> | undefined;
    if (typeof translation?.slug === 'string' && typeof translation.id === 'number') {
      return buildPostUrl(translation.slug, targetLocale, undefined, translation.id);
    }
  }
  const slug = getTranslationSlug(post, targetLocale);
  return slug ? buildPostUrl(slug, targetLocale) : null;
}
