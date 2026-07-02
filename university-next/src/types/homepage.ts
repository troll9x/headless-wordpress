import type { WPPost, WPPage, WPMenuItemWithChildren } from './wordpress';

export interface HeroData {
  title: string | null;
  subtitle: string | null;
  backgroundImageUrl: string | null;
  backgroundImageAlt: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  secondaryCtaText: string | null;
  secondaryCtaUrl: string | null;
}

export interface SiteStatistic {
  value: string;
  label: string;
}

export interface HomepageData {
  heroPage: WPPage | null;
  quickLinks: WPMenuItemWithChildren[];
  announcements: WPPost[];
  news: WPPost[];
  events: WPPost[];
  admissionsPage: WPPage | null;
  faculties: WPPost[];
  partners: WPPost[];
  cooperation: WPPost[];
  research: WPPost[];
  community: WPPost[];
  moments: WPPost[];
}
