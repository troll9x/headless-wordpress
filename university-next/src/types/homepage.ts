import type { WPPost, WPPage } from './wordpress';
import type { HomeMediaGalleryData } from '@/lib/wordpress/media-gallery';
import type { SiteStaticImage } from '@/lib/wordpress/site-static-image';

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

export interface HeroSlide {
  id: string;
  kind: 'image' | 'video';
  src: string;
  mobileSrc: string | null;
  posterUrl: string | null;
  alt: string;
  title: string | null;
  linkUrl: string | null;
  linkTarget: '_self' | '_blank';
  mimeType: string | null;
}

export interface SiteStatistic {
  value: string;
  label: string;
}

/** Dữ liệu đã chuẩn hóa cho slider custom post type `phan-hieu-khoa`. */
export interface FacultySliderItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  websiteUrl: string | null;
}

export interface HomepageFeaturePosts {
  training: WPPost | null;
  students: WPPost | null;
  alumni: WPPost | null;
}

/** Một logo trong ACF repeater `danh_sach_doi_tac`. */
export interface PartnerLogo {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

export interface HomepageData {
  /** Section integrations that fell back during this request. */
  loadErrors: string[];
  heroPage: WPPage | null;
  heroSlides: HeroSlide[];
  staticImage: SiteStaticImage | null;
  announcements: WPPost[];
  news: WPPost[];
  events: WPPost[];
  admissionsPage: WPPage | null;
  featurePosts: HomepageFeaturePosts;
  faculties: FacultySliderItem[];
  partnerLogos: PartnerLogo[];
  partners: WPPost[];
  cooperation: WPPost[];
  research: WPPost[];
  community: WPPost[];
  moments: WPPost[];
  momentGallery: HomeMediaGalleryData | null;
}
