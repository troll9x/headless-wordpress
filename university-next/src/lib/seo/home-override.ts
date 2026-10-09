import type { HeadlessSeoData } from '@/types/seo';

export interface HeadlessHomeSeoOverride {
  title?: string;
  description?: string;
}

/** Parse only the two public fields; malformed CMS responses use route defaults. */
export function parseHomeSeoOverride(payload: unknown, lang: 'vi' | 'en'): HeadlessHomeSeoOverride | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const localized = (payload as Record<string, unknown>)[lang];
  if (!localized || typeof localized !== 'object' || Array.isArray(localized)) return null;

  const fields = localized as Record<string, unknown>;
  const clean = (value: unknown, limit: number) => typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
    : '';
  const title = clean(fields.title, 240);
  const description = clean(fields.description, 500);
  return title || description ? { title, description } : null;
}

/** ACF fields take precedence while missing fields retain Rank Math values. */
export function mergeHomeSeoOverride(
  rankMathSeo: HeadlessSeoData | null,
  homeSeo: HeadlessHomeSeoOverride | null,
): Partial<HeadlessSeoData> | null {
  if (!homeSeo) return rankMathSeo;

  const title = homeSeo.title || rankMathSeo?.title;
  const description = homeSeo.description || rankMathSeo?.description;

  return {
    ...rankMathSeo,
    source: homeSeo.title ? 'acf' : rankMathSeo?.source,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(rankMathSeo?.open_graph || homeSeo.title || homeSeo.description
      ? {
          open_graph: {
            ...rankMathSeo?.open_graph,
            ...(homeSeo.title ? { title: homeSeo.title } : {}),
            ...(homeSeo.description ? { description: homeSeo.description } : {}),
          },
        }
      : {}),
    ...(rankMathSeo?.twitter || homeSeo.title || homeSeo.description
      ? {
          twitter: {
            ...rankMathSeo?.twitter,
            ...(homeSeo.title ? { title: homeSeo.title } : {}),
            ...(homeSeo.description ? { description: homeSeo.description } : {}),
          },
        }
      : {}),
  };
}
