import { WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_MEDIA } from '@/constants/api';
import { getPageBySlug } from '@/lib/wordpress/pages';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';

export interface HeadlessMedia {
  id: number | null;
  url: string;
  alt: string;
  title: string;
  caption: string;
  description: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  sizes: {
    thumbnail: string;
    medium: string;
    large: string;
    full: string;
  };
  position?: number;
  is_featured?: boolean;
}

export interface MediaGalleryCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  count: number;
  parent: number;
  legacy_url: string;
  images_url: string;
  cover?: HeadlessMedia;
  latest_image_date?: string | null;
}

export interface GalleryPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface MediaGalleryCategoriesData {
  source: string;
  taxonomy: string;
  back_url: string;
  lang: string;
  items: MediaGalleryCategory[];
  pagination: GalleryPagination;
}

export interface MediaGalleryCategoryData {
  source: string;
  taxonomy: string;
  back_url: string;
  lang: string;
  order: 'asc' | 'desc';
  category: MediaGalleryCategory;
  images: HeadlessMedia[];
  pagination: GalleryPagination;
}

export interface HomeMediaGalleryData {
  source: string;
  configured: boolean;
  category: MediaGalleryCategory | null;
  featured_image: HeadlessMedia | null;
  featured_index: number | null;
  selected_images: HeadlessMedia[];
  selection_limit: number;
}

const EMPTY_MEDIA: HeadlessMedia = {
  id: null,
  url: '',
  alt: '',
  title: '',
  caption: '',
  description: '',
  width: null,
  height: null,
  mime_type: '',
  sizes: { thumbnail: '', medium: '', large: '', full: '' },
};

async function fetchHeadless<T>(pathname: string, tags: string[]): Promise<T | null> {
  const url = new URL(pathname, WP_SITE_URL);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_MEDIA, tags },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function attribute(block: string, name: string): string {
  const match = block.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match?.[1] ?? '';
}

interface LegacyHomeSelection {
  images: HeadlessMedia[];
  featuredIndex: number | null;
}

function parseLegacyHomeSelection(html: string): LegacyHomeSelection | null {
  const marker = html.search(/<div\b[^>]*class=["'][^"']*\bsonnh-gallery-grid\b[^"']*["'][^>]*>/i);
  if (marker < 0) return null;

  const sectionEnd = html.indexOf('</section>', marker);
  const segment = html.slice(marker, sectionEnd > marker ? sectionEnd : marker + 100_000);
  const images: HeadlessMedia[] = [];
  let featuredIndex: number | null = null;
  const itemPattern = /<div\b[^>]*class=["']([^"']*\bsonnh-gallery-item\b[^"']*)["'][^>]*>\s*<a\b([^>]*)>\s*<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(segment)) !== null && images.length < 15) {
    const classes = match[1].split(/\s+/);
    if (classes.includes('sonnh-hidden')) continue;

    const linkAttributes = match[2];
    const imageAttributes = match[3];
    const source = attribute(imageAttributes, 'src') || attribute(linkAttributes, 'href');
    if (!source) continue;

    const index = images.length;
    const alt = stripHtml(attribute(imageAttributes, 'alt'));
    const title = stripHtml(attribute(linkAttributes, 'data-caption')) || alt;
    if (classes.includes('large')) featuredIndex = index;

    images.push({
      ...EMPTY_MEDIA,
      url: source,
      alt,
      title,
      sizes: { thumbnail: source, medium: source, large: source, full: attribute(linkAttributes, 'href') || source },
      position: index,
      is_featured: classes.includes('large'),
    });
  }

  return images.length > 0 ? { images, featuredIndex } : null;
}

async function getLegacyHomeSelection(): Promise<LegacyHomeSelection | null> {
  try {
    const response = await fetch(new URL('/', WP_SITE_URL), {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      next: { revalidate: REVALIDATE_MEDIA, tags: [CACHE_TAGS.MEDIA, 'media-gallery-home-legacy'] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return parseLegacyHomeSelection(await response.text());
  } catch {
    return null;
  }
}

/**
 * The production site may still run a plugin version without the gallery API.
 * Parse only the public gallery cards as a temporary read-only fallback.
 */
function parseLegacyCategories(html: string): MediaGalleryCategory[] {
  const items: MediaGalleryCategory[] = [];
  const pattern = /<a\b[^>]*href=["'][^"']*[?&]media_cat=([^&"']+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const slug = decodeURIComponent(match[1]);
    const block = match[2];
    const imageTag = block.match(/<img\b[^>]*>/i)?.[0] ?? '';
    const nameHtml = block.match(/class=["'][^"']*media-gallery-name[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1];
    const countText = block.match(/class=["'][^"']*media-gallery-count[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? '';
    const dateText = block.match(/class=["'][^"']*media-gallery-date[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? '';
    const imageUrl = attribute(imageTag, 'src');
    const name = stripHtml(nameHtml || attribute(imageTag, 'alt') || slug);
    const count = Number.parseInt(stripHtml(countText).replace(/\D+/g, ''), 10) || 0;

    items.push({
      id: items.length + 1,
      slug,
      name,
      description: '',
      count,
      parent: 0,
      legacy_url: `/media/${encodeURIComponent(slug)}`,
      images_url: '',
      cover: imageUrl
        ? {
            ...EMPTY_MEDIA,
            url: imageUrl,
            alt: attribute(imageTag, 'alt') || name,
            title: name,
            sizes: { thumbnail: imageUrl, medium: imageUrl, large: imageUrl, full: imageUrl },
          }
        : undefined,
      latest_image_date: stripHtml(dateText) || null,
    });
  }

  return items;
}

async function getLegacyCategories(locale: Locale): Promise<MediaGalleryCategory[]> {
  const page = await getPageBySlug('media', locale).catch(() => null);
  return page ? parseLegacyCategories(page.content.rendered) : [];
}

export async function getMediaGalleryCategories(
  locale: Locale,
  page = 1,
  perPage = 50,
): Promise<MediaGalleryCategoriesData> {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    lang: locale,
  });
  const data = await fetchHeadless<MediaGalleryCategoriesData>(
    `/wp-json/headless/v1/media-gallery/categories?${query}`,
    [CACHE_TAGS.MEDIA, `media-gallery-categories-${locale}`],
  );
  if (data) return data;

  const items = await getLegacyCategories(locale);
  return {
    source: 'legacy-media-page-fallback',
    taxonomy: 'mlo-category',
    back_url: locale === 'en' ? '/en/media' : '/media',
    lang: locale,
    items,
    pagination: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: items.length ? 1 : 0 },
  };
}

export async function getMediaGalleryCategory(
  slug: string,
  locale: Locale,
  page = 1,
  perPage = 24,
): Promise<MediaGalleryCategoryData | null> {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order: 'desc',
    lang: locale,
  });
  const data = await fetchHeadless<MediaGalleryCategoryData>(
    `/wp-json/headless/v1/media-gallery/categories/${encodeURIComponent(slug)}?${query}`,
    [CACHE_TAGS.MEDIA, `media-gallery-${slug}-${locale}`],
  );
  if (data) return data;

  const categories = await getMediaGalleryCategories(locale);
  const category = categories.items.find((item) => item.slug === slug);
  if (!category) return null;

  return {
    source: 'legacy-media-page-fallback',
    taxonomy: 'mlo-category',
    back_url: locale === 'en' ? '/en/media' : '/media',
    lang: locale,
    order: 'desc',
    category,
    images: category.cover?.url ? [category.cover] : [],
    pagination: { page: 1, per_page: perPage, total: category.cover?.url ? 1 : 0, total_pages: 1 },
  };
}

export async function getHomeMediaGallery(
  locale: Locale = 'vi',
): Promise<HomeMediaGalleryData | null> {
  const home = await fetchHeadless<HomeMediaGalleryData>(
    '/wp-json/headless/v1/media-gallery/home',
    [CACHE_TAGS.MEDIA, 'media-gallery-home'],
  );

  if (!home || home.selected_images.length > 0 || !home.category?.slug) return home;

  // The legacy Sondz Gallery allows its 15 selected images to live outside
  // the configured Media Library Organizer category. Headless API 1.14.0
  // currently filters those IDs by category and therefore returns an empty
  // selection. Read the same public gallery markup until that API is updated.
  const legacySelection = await getLegacyHomeSelection();
  if (legacySelection) {
    const featuredIndex = legacySelection.featuredIndex ?? (legacySelection.images.length > 6 ? 6 : 0);
    return {
      ...home,
      featured_image: legacySelection.images[featuredIndex] ?? null,
      featured_index: featuredIndex,
      selected_images: legacySelection.images,
    };
  }

  // WordPress may have a homepage gallery category configured before the
  // administrator selects individual images. Keep the section tied to that
  // gallery instead of falling back to unrelated post thumbnails.
  const category = await getMediaGalleryCategory(home.category.slug, locale, 1, home.selection_limit);
  if (!category?.images.length) return home;

  const selectedImages = category.images.slice(0, home.selection_limit);
  const featuredIndex = selectedImages.length > 6 ? 6 : 0;

  return {
    ...home,
    featured_image: selectedImages[featuredIndex] ?? null,
    featured_index: featuredIndex,
    selected_images: selectedImages.map((image, position) => ({
      ...image,
      position,
      is_featured: position === featuredIndex,
    })),
  };
}
