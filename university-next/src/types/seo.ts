import type { Locale } from './ngon-ngu';

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  locale: Locale;
  type?: 'website' | 'article';
  imageUrl?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** Vietnamese canonical URL for hreflang (required for `x-default` and `vi` tags). */
  viUrl?: string;
  /** English canonical URL for hreflang (`en` tag). */
  enUrl?: string;
  /** Disable hreflang output when translated URLs are not verified. */
  includeAlternates?: boolean;
}

export interface HeadlessSeoMedia {
  url?: string;
  alt?: string;
}

export interface HeadlessSeoRobots {
  index?: boolean;
  follow?: boolean;
  archive?: boolean;
  image_index?: boolean;
  snippet?: boolean;
  raw?: string[];
}

/** Structured SEO response returned by the TLU Headless API. */
export interface HeadlessSeoData {
  id: number;
  slug: string;
  type: string;
  lang?: string;
  source?: 'rank_math' | 'wordpress' | string;
  title?: string;
  description?: string;
  canonical?: string;
  robots?: HeadlessSeoRobots | string[];
  open_graph?: {
    title?: string;
    description?: string;
    image?: HeadlessSeoMedia | string | null;
    type?: string;
  };
  twitter?: {
    title?: string;
    description?: string;
    image?: HeadlessSeoMedia | string | null;
    card_type?: string;
  };
  schema?: Record<string, unknown>[];
  schema_json?: string;
  hreflang?: { lang: string; url: string }[];
}
