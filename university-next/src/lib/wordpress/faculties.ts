import { REVALIDATE_POSTS } from '@/constants/api';
import { WP_SITE_URL } from '@/config/env/server';
import { stripHtml } from '@/lib/utils/html';
import { wpFetchUrl } from '@/lib/wordpress/client';
import type { FacultySliderItem } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

interface NormalizedImage {
  url?: string;
  alt?: string;
}

interface FacultyDetail {
  id: number;
  slug: string;
  title: string;
  language?: { slug?: string };
  featured_image?: NormalizedImage;
  acf?: {
    ten_khoa?: string;
    mo_ta_ngan_ve_khoa?: string;
    anh_khoa?: NormalizedImage | string | number | null;
    website_cua_khoa?: string;
  };
}

const PREFERRED_ORDER: Record<Locale, string[]> = {
  vi: [
    'khoa-kinh-te-va-quan-ly',
    'khoa-hoa-va-moi-truong',
    'khoa-ke-toan-va-kinh-doanh',
    'phan-hieu-truong-dai-hoc-thuy-loi',
    'khoa-cong-nghe-thong-tin',
    'khoa-co-khi',
    'khoa-luat-va-ly-luan-chinh-tri',
    'khoa-dien-dien-tu',
    'khoa-cong-trinh',
    'khoa-ky-thuat-tai-nguyen-nuoc',
    'trung-tam-dao-tao-quoc-te',
  ],
  en: [
    'faculty-of-economics-and-management',
    'faculty-of-chemistry-and-environment',
    'faculty-of-accounting-and-business',
    'thuyloi-universitys-southern-campus',
    'faculty-of-computer-science-and-engineering',
    'faculty-of-mechanical-engineering',
    'faculty-of-electrical-and-electronics-engineering',
    'faculty-of-civil-engineering',
    'faculty-of-water-resources-engineering',
    'school-of-international-education',
  ],
};

function getImage(value: unknown): NormalizedImage | null {
  if (!value || typeof value !== 'object') return null;
  const image = value as NormalizedImage;
  return image.url ? image : null;
}

function normalizeWebsiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function trimWords(value: string, limit = 50): string {
  const words = stripHtml(value).split(/\s+/).filter(Boolean);
  return words.length > limit ? `${words.slice(0, limit).join(' ')}…` : words.join(' ');
}

async function getFacultyDetail(slug: string, locale: Locale): Promise<FacultyDetail | null> {
  const url = new URL('/wp-json/headless/v1/page', WP_SITE_URL);
  url.searchParams.set('slug', slug);
  url.searchParams.set('post_type', 'phan-hieu-khoa');
  url.searchParams.set('lang', locale);
  return wpFetchUrl<FacultyDetail>(url.toString(), REVALIDATE_POSTS).catch(() => null);
}

function normalizeFaculty(detail: FacultyDetail): FacultySliderItem {
  const acfImage = getImage(detail.acf?.anh_khoa);
  const featuredImage = getImage(detail.featured_image);
  const image = acfImage ?? featuredImage;

  return {
    id: detail.id,
    slug: detail.slug,
    title: stripHtml(detail.acf?.ten_khoa || detail.title),
    description: trimWords(detail.acf?.mo_ta_ngan_ve_khoa || ''),
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt || stripHtml(detail.acf?.ten_khoa || detail.title),
    websiteUrl: normalizeWebsiteUrl(detail.acf?.website_cua_khoa),
  };
}

function removeDuplicateFaculties(items: FacultySliderItem[]): FacultySliderItem[] {
  const uniqueItems = new Map<string, FacultySliderItem>();

  for (const item of items) {
    const key = item.title.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const current = uniqueItems.get(key);

    // Nếu REST trả trùng bản ghi, ưu tiên bản có đầy đủ website, ảnh và mô tả hơn.
    if (
      !current ||
      Number(Boolean(item.websiteUrl)) + Number(Boolean(item.imageUrl)) + Number(Boolean(item.description)) >
        Number(Boolean(current.websiteUrl)) + Number(Boolean(current.imageUrl)) + Number(Boolean(current.description))
    ) {
      uniqueItems.set(key, item);
    }
  }

  return [...uniqueItems.values()];
}

/**
 * Lấy custom post type khoa từ Core REST rồi bổ sung ACF qua Headless API.
 * Core REST hiện không lọc Polylang ổn định cho CPT này, nên ngôn ngữ được
 * kiểm tra lại từ payload chi tiết trước khi trả dữ liệu cho giao diện.
 */
export async function getFacultySliderItems(locale: Locale): Promise<FacultySliderItem[]> {
  // Fetch only the units actually displayed. Loading every CPT record and then
  // making one detail request per record caused a large N+1 request burst.
  const details = await Promise.all(
    PREFERRED_ORDER[locale].map((slug) => getFacultyDetail(slug, locale)),
  );
  const items = removeDuplicateFaculties(details
    .filter((detail): detail is FacultyDetail => Boolean(detail))
    .filter((detail) => !detail.language?.slug || detail.language.slug === locale)
    .map(normalizeFaculty));

  const order = new Map(PREFERRED_ORDER[locale].map((slug, index) => [slug, index]));
  return items.sort((left, right) => {
    const leftOrder = order.get(left.slug) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.slug) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id - right.id;
  });
}
