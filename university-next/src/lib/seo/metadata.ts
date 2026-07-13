import type { Metadata } from 'next';
import { SITE_NAME } from '@/constants/api';
import type { SeoData } from '@/types/seo';
import { getOgLocale } from '@/lib/i18n/locales';
import { buildHreflangAlternates } from '@/lib/seo/hreflang';

/** Generates Next.js Metadata for a page or article. */
export function generatePageMetadata(seo: SeoData): Metadata {
  const viUrl = seo.locale === 'vi' ? seo.canonical : seo.viUrl;
  const enUrl = seo.locale === 'en' ? seo.canonical : seo.enUrl;
  const hreflang =
    seo.includeAlternates === false
      ? undefined
      : buildHreflangAlternates(viUrl, enUrl);

  const imageEntry = seo.imageUrl
    ? [{ url: seo.imageUrl, alt: seo.imageAlt ?? seo.title }]
    : undefined;

  const ogBase = {
    url: seo.canonical,
    siteName: SITE_NAME,
    title: seo.title,
    description: seo.description,
    locale: getOgLocale(seo.locale),
    ...(imageEntry && { images: imageEntry }),
  };

  const openGraph =
    seo.type === 'article'
      ? ({
          ...ogBase,
          type: 'article' as const,
          publishedTime: seo.publishedTime,
          modifiedTime: seo.modifiedTime,
        } as Metadata['openGraph'])
      : ({ ...ogBase, type: 'website' as const } as Metadata['openGraph']);

  return {
    title: seo.title,
    description: seo.description,
    openGraph,
    twitter: {
      card: seo.imageUrl ? 'summary_large_image' : 'summary',
      title: seo.title,
      description: seo.description,
      ...(seo.imageUrl && { images: [seo.imageUrl] }),
    },
    alternates: {
      canonical: seo.canonical,
      ...(hreflang ? { languages: hreflang } : {}),
    },
  };
}

/** Convenience wrapper that sets `type: 'article'`. */
export function generatePostMetadata(seo: SeoData): Metadata {
  return generatePageMetadata({ ...seo, type: 'article' });
}
