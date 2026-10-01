import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { HeroSlide } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

const HERO_OPTIONS_KEY = 'tlu_site_hero';
const HERO_REQUEST_TIMEOUT_MS = 20_000;
const VIDEO_EXTENSIONS = /\.(?:mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

type JsonRecord = Record<string, unknown>;

interface MediaCandidate {
  url: string;
  alt: string;
  title: string;
  mimeType: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (isRecord(value) && typeof value.value === 'string') return value.value.trim();
  return '';
}

function safeHttpUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';

  try {
    const url = new URL(raw, WP_SITE_URL);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function mediaCandidate(value: unknown): MediaCandidate | null {
  if (typeof value === 'string') {
    const url = safeHttpUrl(value);
    return url ? { url, alt: '', title: '', mimeType: '' } : null;
  }

  if (!isRecord(value)) return null;

  const url = safeHttpUrl(value.url ?? value.source_url ?? value.src);
  if (!url) return null;

  return {
    url,
    alt: text(value.alt ?? value.alt_text),
    title: text(value.title),
    mimeType: text(value.mime_type ?? value.mimeType ?? value.type).toLowerCase(),
  };
}

function mediaKind(candidate: MediaCandidate, keyHint = ''): HeroSlide['kind'] | null {
  const hint = `${candidate.mimeType} ${keyHint}`.toLowerCase();
  if (candidate.mimeType.startsWith('video/') || /video|clip|movie/.test(hint) || VIDEO_EXTENSIONS.test(candidate.url)) {
    return 'video';
  }
  if (candidate.mimeType.startsWith('image/') || /image|banner|hero|photo|picture|poster|anh|hinh/.test(hint) || IMAGE_EXTENSIONS.test(candidate.url)) {
    return 'image';
  }
  return null;
}

function entriesMatching(record: JsonRecord, pattern: RegExp): Array<[string, unknown]> {
  return Object.entries(record).filter(([key]) => pattern.test(key));
}

function firstMedia(
  record: JsonRecord,
  pattern: RegExp,
  expectedKind?: HeroSlide['kind'],
): MediaCandidate | null {
  for (const [key, value] of entriesMatching(record, pattern)) {
    const candidate = mediaCandidate(value);
    if (candidate && (!expectedKind || mediaKind(candidate, key) === expectedKind)) return candidate;
  }
  return null;
}

function safeNavigationUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return safeHttpUrl(raw);
}

function getLink(record: JsonRecord): Pick<HeroSlide, 'linkUrl' | 'linkTarget'> {
  const raw = record.slide_link
    ?? record.link
    ?? record.url_link
    ?? record.cta_link
    ?? record.lien_ket
    ?? record.duong_dan;
  const linkRecord = isRecord(raw) ? raw : null;
  const linkUrl = safeNavigationUrl(linkRecord?.url ?? raw) || null;
  const target = text(linkRecord?.target ?? record.link_target ?? record.target);

  return {
    linkUrl,
    linkTarget: target === '_blank' ? '_blank' : '_self',
  };
}

function makeSlide(
  candidate: MediaCandidate,
  kind: HeroSlide['kind'],
  index: number,
  record: JsonRecord,
  options: { mobile?: MediaCandidate | null; poster?: MediaCandidate | null } = {},
): HeroSlide {
  const title = text(record.title ?? record.tieu_de ?? record.heading) || candidate.title || null;
  const alt = text(record.alt ?? record.mo_ta ?? record.description) || candidate.alt || title || '';

  return {
    id: `${kind}-${index}-${candidate.url}`,
    kind,
    src: candidate.url,
    mobileSrc: options.mobile?.url ?? null,
    posterUrl: kind === 'video' ? options.poster?.url ?? null : null,
    alt,
    title,
    ...getLink(record),
    mimeType: candidate.mimeType || null,
  };
}

function normalizeRow(value: unknown, index: number): HeroSlide[] {
  const direct = mediaCandidate(value);
  if (direct && !isRecord(value)) {
    const kind = mediaKind(direct);
    return kind ? [makeSlide(direct, kind, index, {})] : [];
  }

  if (!isRecord(value)) return [];

  const explicitType = text(value.kind ?? value.type ?? value.media_type ?? value.slide_type ?? value.banner_type ?? value.loai).toLowerCase();
  const generic = firstMedia(value, /media|file|asset|tep/i);
  const video = firstMedia(value, /video|clip|movie|mp4|webm/i, 'video')
    ?? (generic && mediaKind(generic, explicitType) === 'video' ? generic : null);
  const mobile = firstMedia(value, /mobile|tablet|dien_thoai/i, 'image');
  const poster = firstMedia(value, /poster|thumbnail|cover|anh_dai_dien/i, 'image');
  const image = firstMedia(value, /desktop|image|banner|hero|photo|picture|background|anh|hinh/i, 'image')
    ?? (generic && mediaKind(generic, explicitType) === 'image' ? generic : null)
    ?? (direct && mediaKind(direct) === 'image' ? direct : null);

  if (/video|clip|movie/.test(explicitType) && video) {
    return [makeSlide(video, 'video', index, value, { poster: poster ?? image })];
  }
  if (/image|photo|picture|anh|hinh/.test(explicitType) && image) {
    return [makeSlide(image, 'image', index, value, { mobile })];
  }

  // Without a type selector, separate populated image and video fields are
  // treated as separate slides. In a repeater row, an image beside a video is
  // commonly intended as the video's poster only when its key says so.
  const slides: HeroSlide[] = [];
  if (image && image.url !== poster?.url) slides.push(makeSlide(image, 'image', index, value, { mobile }));
  if (video) slides.push(makeSlide(video, 'video', index, value, { poster: poster ?? null }));

  if (slides.length > 0) return slides;
  if (!direct) return [];

  const kind = mediaKind(direct);
  return kind ? [makeSlide(direct, kind, index, value)] : [];
}

function findConfiguredRows(fields: unknown, locale?: Locale): unknown[] {
  if (Array.isArray(fields)) return fields;
  if (!isRecord(fields)) return [];

  const preferredKeys = [
    ...(locale ? [`hero_slides_${locale}`] : ['hero_slides_vi', 'hero_slides_en']),
    'slides',
    'hero_slides',
    'banner_slides',
    'banners',
    'slider',
    'carousel',
    'tlu_site_hero',
  ];

  for (const key of preferredKeys) {
    if (Array.isArray(fields[key])) return fields[key];
  }

  return [fields];
}

function collectMedia(value: unknown, path = 'hero', output: HeroSlide[] = []): HeroSlide[] {
  const candidate = mediaCandidate(value);
  if (candidate) {
    const kind = mediaKind(candidate, path);
    if (kind) output.push(makeSlide(candidate, kind, output.length, isRecord(value) ? value : {}));
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectMedia(item, `${path}-${index}`, output));
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sizes') continue;
      collectMedia(item, `${path}-${key}`, output);
    }
  }

  return output;
}

function uniqueSlides(slides: HeroSlide[]): HeroSlide[] {
  const seen = new Set<string>();
  return slides.filter((slide) => {
    if (seen.has(slide.src)) return false;
    seen.add(slide.src);
    return true;
  });
}

export function extractHeroSlides(payload: unknown, locale?: Locale): HeroSlide[] {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && 'fields' in response ? response.fields : response;
  const rows = findConfiguredRows(fields, locale);
  const configured = uniqueSlides(rows.flatMap((row, index) => normalizeRow(row, index)));

  // Locale-specific fields are authoritative, including an intentionally
  // empty array. Never scan the opposite language as a fallback.
  if (locale && isRecord(fields) && Array.isArray(fields[`hero_slides_${locale}`])) {
    return configured;
  }

  return configured.length > 0 ? configured : uniqueSlides(collectMedia(fields));
}

export async function getHeroSlides(locale: Locale): Promise<HeroSlide[]> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: HERO_OPTIONS_KEY,
    lang: locale,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, `hero-slides-${locale}`],
    },
    signal: AbortSignal.timeout(HERO_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Hero options API returned ${response.status}.`);
  }

  return extractHeroSlides(await response.json(), locale);
}
