import type { Metadata } from 'next';
import { SITE_NAME } from '@/constants/api';
import type { HeadlessSeoData, HeadlessSeoMedia, SeoData } from '@/types/seo';
import { getOgLocale } from '@/lib/i18n/locales';
import { buildHreflangAlternates } from '@/lib/seo/hreflang';

const UX_BUILDER_SHORTCODE = /\[(?:\/?(?:ux_[a-z0-9_-]+|section|row|col|block|gap|button|stack|grid)\b[^\]]*)\]/i;
const SHORTCODE = /\[(?:\/?[a-z][a-z0-9_-]*)(?:\s[^\]]*)?\]/gi;

/** Remove builder markup and HTML before a description reaches a meta tag. */
export function sanitizeMetaDescription(value: string | null | undefined, fallback = ''): string {
  const clean = (candidate: string) => {
    if (UX_BUILDER_SHORTCODE.test(candidate)) return '';
    return candidate
      .replace(SHORTCODE, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\s+/g, ' ')
      .trim();
  };

  const description = value?.trim() ? clean(value) : '';
  if (description) return description;
  return fallback.trim() ? clean(fallback) : '';
}

/** Generates Next.js Metadata for a page or article. */
export function generatePageMetadata(seo: SeoData): Metadata {
  const description = sanitizeMetaDescription(seo.description);
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
    description,
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
    description,
    openGraph,
    twitter: {
      card: seo.imageUrl ? 'summary_large_image' : 'summary',
      title: seo.title,
      description,
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

function mediaUrl(media: HeadlessSeoMedia | string | null | undefined): string | undefined {
  if (typeof media === 'string') return media || undefined;
  return media?.url || undefined;
}

function frontendCanonical(candidate: string | undefined, fallback: string): string {
  if (!candidate?.trim()) return fallback;
  try {
    const fallbackUrl = new URL(fallback);
    const candidateUrl = new URL(candidate.trim(), fallbackUrl);
    // WordPress may still emit localhost or CMS-host canonicals. Never publish
    // those on the public headless site; its route-level URL is authoritative.
    return candidateUrl.origin === fallbackUrl.origin ? candidateUrl.toString() : fallback;
  } catch {
    return fallback;
  }
}

function getRobots(seo: HeadlessSeoData): Metadata['robots'] | undefined {
  if (!seo.robots) return undefined;

  const raw = Array.isArray(seo.robots) ? seo.robots : seo.robots.raw;
  const values = new Set((raw ?? []).map((value) => value.toLowerCase()));
  if (Array.isArray(seo.robots)) {
    const index = !values.has('noindex');
    const follow = !values.has('nofollow');
    return {
      index,
      follow,
      noarchive: values.has('noarchive'),
      noimageindex: values.has('noimageindex'),
      nosnippet: values.has('nosnippet'),
      googleBot: {
        index,
        follow,
        noimageindex: values.has('noimageindex'),
        'max-image-preview': 'large',
        'max-snippet': values.has('nosnippet') ? 0 : -1,
        'max-video-preview': -1,
      },
    };
  }

  const index = seo.robots.index ?? !values.has('noindex');
  const follow = seo.robots.follow ?? !values.has('nofollow');
  const noimageindex = seo.robots.image_index === undefined
    ? values.has('noimageindex')
    : !seo.robots.image_index;
  const nosnippet = seo.robots.snippet === undefined
    ? values.has('nosnippet')
    : !seo.robots.snippet;

  return {
    index,
    follow,
    noarchive:
      seo.robots.archive === undefined
        ? values.has('noarchive')
        : !seo.robots.archive,
    noimageindex,
    nosnippet,
    googleBot: {
      index,
      follow,
      noimageindex,
      'max-image-preview': 'large',
      'max-snippet': nosnippet ? 0 : -1,
      'max-video-preview': -1,
    },
  };
}

/** Merges Rank Math output over safe route-level fallbacks. */
export function generateHeadlessMetadata(
  headlessSeo: HeadlessSeoData | null,
  fallback: SeoData,
): Metadata {
  const title = headlessSeo?.title?.trim() || fallback.title;
  const fallbackDescription = sanitizeMetaDescription(fallback.description);
  const description = sanitizeMetaDescription(headlessSeo?.description, fallbackDescription);
  const canonical = frontendCanonical(headlessSeo?.canonical, fallback.canonical);
  const ogImage = mediaUrl(headlessSeo?.open_graph?.image) || fallback.imageUrl;
  const headlessOgImage = headlessSeo?.open_graph?.image;

  const metadata = generatePageMetadata({
    ...fallback,
    title,
    description,
    canonical,
    imageUrl: ogImage,
    imageAlt:
      (typeof headlessOgImage === 'object' && headlessOgImage
        ? headlessOgImage.alt
        : undefined) || fallback.imageAlt || title,
  });

  const twitterImage = mediaUrl(headlessSeo?.twitter?.image) || ogImage;
  const twitterCard = headlessSeo?.twitter?.card_type === 'summary'
    ? 'summary'
    : 'summary_large_image';

  return {
    ...metadata,
    title:
      headlessSeo?.source === 'rank_math' && headlessSeo.title?.trim()
        ? { absolute: title }
        : metadata.title,
    robots: headlessSeo ? getRobots(headlessSeo) : metadata.robots,
    openGraph: {
      ...metadata.openGraph,
      title: headlessSeo?.open_graph?.title?.trim() || title,
      description: sanitizeMetaDescription(headlessSeo?.open_graph?.description, description),
    },
    twitter: {
      ...metadata.twitter,
      card: twitterCard,
      title: headlessSeo?.twitter?.title?.trim() || title,
      description: sanitizeMetaDescription(headlessSeo?.twitter?.description, description),
      ...(twitterImage && { images: [twitterImage] }),
    },
  };
}
