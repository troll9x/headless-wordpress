import { cache } from 'react';
import { getMenuTree } from '@/lib/api/menus';
import { getPostsByCategories, getFirstPageBySlug } from '@/lib/api/homepage';
import { CATEGORY_SLUGS, PAGE_SLUGS, MENU_SLUGS } from '@/constants/categories';
import { SITE_STATS } from '@/constants/site';
import type { Locale } from '@/types/ngon-ngu';
import { stripHtml } from '@/lib/utils/html';
import type { WPPage, WPMedia } from '@/types/wordpress';
import type { HomepageData, HeroData, SiteStatistic } from '@/types/homepage';

async function tryQuickLinksMenu() {
  for (const slug of MENU_SLUGS.QUICK_LINKS) {
    const items = await getMenuTree(slug).catch(() => []);
    if (items.length > 0) return items;
  }
  return [];
}

export const getFullHomepageData = cache(async function getFullHomepageData(
  locale: Locale = 'vi'
): Promise<HomepageData> {
  const [
    heroPage,
    quickLinks,
    announcements,
    news,
    events,
    admissionsPage,
    faculties,
    partners,
    cooperation,
    research,
    community,
    moments,
  ] = await Promise.all([
    getFirstPageBySlug(PAGE_SLUGS.HERO, locale),
    tryQuickLinksMenu(),
    getPostsByCategories(CATEGORY_SLUGS.ANNOUNCEMENTS, 8, locale),
    getPostsByCategories(CATEGORY_SLUGS.NEWS, 6, locale),
    getPostsByCategories(CATEGORY_SLUGS.EVENTS, 4, locale),
    getFirstPageBySlug(PAGE_SLUGS.ADMISSIONS, locale),
    getPostsByCategories(CATEGORY_SLUGS.FACULTIES, 12, locale),
    getPostsByCategories(CATEGORY_SLUGS.PARTNERS, 12, locale),
    getPostsByCategories(CATEGORY_SLUGS.COOPERATION, 4, locale),
    getPostsByCategories(CATEGORY_SLUGS.RESEARCH, 4, locale),
    getPostsByCategories(CATEGORY_SLUGS.COMMUNITY, 4, locale),
    getPostsByCategories(CATEGORY_SLUGS.MOMENTS, 8, locale),
  ]);

  return {
    heroPage,
    quickLinks,
    announcements,
    news,
    events,
    admissionsPage,
    faculties,
    partners,
    cooperation,
    research,
    community,
    moments,
  };
});

function getPageFeaturedImage(page: WPPage): WPMedia | null {
  const media = page._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

export function extractHeroData(page: WPPage | null): HeroData {
  const acf = (page?.acf ?? {}) as Record<string, unknown>;
  const media = page ? getPageFeaturedImage(page) : null;

  return {
    title: page ? stripHtml(page.title.rendered) : null,
    subtitle: acf.hero_subtitle
      ? String(acf.hero_subtitle)
      : page?.excerpt.rendered
        ? stripHtml(page.excerpt.rendered)
        : null,
    backgroundImageUrl: media?.source_url ?? null,
    backgroundImageAlt: media?.alt_text ?? null,
    ctaText: acf.cta_text ? String(acf.cta_text) : null,
    ctaUrl: acf.cta_url ? String(acf.cta_url) : null,
    secondaryCtaText: acf.secondary_cta_text ? String(acf.secondary_cta_text) : null,
    secondaryCtaUrl: acf.secondary_cta_url ? String(acf.secondary_cta_url) : null,
  };
}

export function extractStats(page: WPPage | null): SiteStatistic[] {
  const acf = (page?.acf ?? {}) as Record<string, unknown>;

  for (const key of ['statistics', 'stats', 'so_lieu', 'thong_ke']) {
    const val = acf[key];
    if (!Array.isArray(val) || val.length === 0) continue;

    const result: SiteStatistic[] = val
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null
      )
      .map((item) => ({
        value: String(item.value ?? item.so_lieu ?? item.count ?? ''),
        label: String(item.label ?? item.ten ?? item.name ?? ''),
      }))
      .filter((stat) => stat.value && stat.label);

    if (result.length > 0) return result;
  }

  return SITE_STATS.map((stat) => ({ value: stat.value, label: stat.label }));
}
