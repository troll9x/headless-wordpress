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
}
