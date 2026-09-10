import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_CATEGORIES, REVALIDATE_POSTS } from '@/constants/api';
import { wpFetch } from '@/lib/wordpress/client';
import { buildWordPressUrl } from '@/lib/wordpress/url';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPApiError, WPMedia } from '@/types/wordpress';

const DOCUMENT_ENDPOINT = '/tai-lieu';
const DOCUMENT_TERM_ENDPOINT = '/loai-tai-lieu';
const DOCUMENT_ROOT_SLUG = 'van-ban-tai-lieu';

export interface DocumentTerm {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'loai-tai-lieu';
  parent: number;
  acf?: Record<string, unknown> | [];
}

export interface WPDocument {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: 'tai-lieu';
  link: string;
  title: { rendered: string };
  featured_media: number;
  parent: number;
  'loai-tai-lieu': number[];
  acf?: Record<string, unknown> | [];
  _embedded?: {
    'wp:featuredmedia'?: (WPMedia | WPApiError)[];
  };
}

interface HeadlessMedia {
  url?: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
}

interface HeadlessDocumentTerm extends Omit<DocumentTerm, 'parent' | 'acf'> {
  ancestors?: HeadlessDocumentTerm[];
  children_count?: number;
  acf?: { banner_tin_tuc?: HeadlessMedia | string | null } | [];
  parent: number | HeadlessDocumentTerm | null;
}

interface HeadlessPageDocumentDetails {
  acf?: Record<string, unknown>;
}

export interface DocumentFileMedia {
  id: number | null;
  url: string;
  alt: string;
  title: string;
  caption: string;
  description: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  sizes: Record<'thumbnail' | 'medium' | 'large' | 'full', string>;
}

export interface DocumentFileRow {
  index: number;
  symbol: string;
  issued_date: string | null;
  issued_date_display: string;
  title: string;
  file: DocumentFileMedia;
}

export interface DocumentDetailsData {
  source: string;
  post_type: 'tai-lieu';
  taxonomy: 'loai-tai-lieu';
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  link: string;
  date: string;
  modified: string;
  lang: string;
  translations: unknown[] | Record<string, unknown>;
  banner: {
    image: DocumentFileMedia;
    inherited: boolean;
    term: { id: number; slug: string; name: string; parent: number };
  } | null;
  documents: DocumentFileRow[];
  document_count: number;
  redirect: { required: boolean; url: string; status: number | null };
}

export interface DocumentBanner {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface DocumentGroup {
  term: DocumentTerm;
  termPath: string;
  documents: WPDocument[];
  total: number;
}

export interface DocumentTaxonomyData {
  term: DocumentTerm;
  ancestors: DocumentTerm[];
  banner: DocumentBanner | null;
  groups: DocumentGroup[];
}

function isDescendantOf(
  term: DocumentTerm,
  ancestorId: number,
  termsById: Map<number, DocumentTerm>,
): boolean {
  let parentId = term.parent;
  const visited = new Set<number>();

  while (parentId > 0 && !visited.has(parentId)) {
    if (parentId === ancestorId) return true;
    visited.add(parentId);
    parentId = termsById.get(parentId)?.parent ?? 0;
  }

  return false;
}

function buildTermPath(term: DocumentTerm, termsById: Map<number, DocumentTerm>): string {
  const segments = [term.slug];
  let parentId = term.parent;
  const visited = new Set<number>();

  while (parentId > 0 && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = termsById.get(parentId);
    if (!parent) break;
    segments.unshift(parent.slug);
    parentId = parent.parent;
  }

  return `/${segments.map(encodeURIComponent).join('/')}`;
}

function buildAncestors(term: DocumentTerm, termsById: Map<number, DocumentTerm>): DocumentTerm[] {
  const ancestors: DocumentTerm[] = [];
  let parentId = term.parent;
  const visited = new Set<number>();

  while (parentId > 0 && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = termsById.get(parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parent;
  }

  return ancestors;
}

async function getAllDocumentTerms(locale: Locale): Promise<DocumentTerm[]> {
  return wpFetch<DocumentTerm[]>(DOCUMENT_TERM_ENDPOINT, {
    params: {
      per_page: 100,
      hide_empty: false,
      orderby: 'name',
      order: 'asc',
      lang: locale,
    },
    revalidate: REVALIDATE_CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES, `document-terms-${locale}`],
  });
}

async function getHeadlessDocumentTerm(
  slug: string,
  locale: Locale,
): Promise<HeadlessDocumentTerm | null> {
  const url = new URL(
    `/wp-json/headless/v1/term/loai-tai-lieu/${encodeURIComponent(slug)}`,
    WP_SITE_URL,
  );
  url.searchParams.set('lang', locale);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '1');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_CATEGORIES,
        tags: [CACHE_TAGS.CATEGORIES, `document-term-${slug}-${locale}`],
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const payload = await response.json() as HeadlessDocumentTerm;
    return payload && typeof payload.id === 'number' ? payload : null;
  } catch {
    return null;
  }
}

function extractBanner(term: HeadlessDocumentTerm | null): DocumentBanner | null {
  if (!term?.acf || Array.isArray(term.acf)) return null;
  const value = term.acf.banner_tin_tuc;
  const url = typeof value === 'string' ? value : value?.url ?? '';
  if (!url) return null;

  return {
    url,
    alt: typeof value === 'string' ? term.name : value?.alt || term.name,
    width: typeof value === 'string' ? 2560 : value?.width || 2560,
    height: typeof value === 'string' ? 551 : value?.height || 551,
  };
}

async function resolveDocumentBanner(
  term: DocumentTerm,
  locale: Locale,
): Promise<DocumentBanner | null> {
  const details = await getHeadlessDocumentTerm(term.slug, locale);
  const ownBanner = extractBanner(details);
  if (ownBanner) return ownBanner;

  const parent = details?.parent;
  if (parent && typeof parent === 'object') {
    const embeddedParentBanner = extractBanner(parent);
    if (embeddedParentBanner) return embeddedParentBanner;
  }

  const firstAncestor = details?.ancestors?.[0];
  return extractBanner(firstAncestor ?? null);
}

async function enrichDocumentWithAcf(
  document: WPDocument,
  locale: Locale,
): Promise<WPDocument> {
  const url = new URL('/wp-json/headless/v1/page', WP_SITE_URL);
  url.searchParams.set('slug', document.slug);
  url.searchParams.set('post_type', 'tai-lieu');
  url.searchParams.set('lang', locale);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_POSTS,
        tags: [CACHE_TAGS.POSTS, `document-${document.slug}-${locale}`],
      },
    });
    if (!response.ok) return document;

    const details = await response.json() as HeadlessPageDocumentDetails;
    return details.acf ? { ...document, acf: details.acf } : document;
  } catch {
    return document;
  }
}

async function getDocumentsByTerm(
  termId: number,
  limit: number,
  locale: Locale,
): Promise<{ documents: WPDocument[]; total: number }> {
  const url = buildWordPressUrl(WP_API_URL, DOCUMENT_ENDPOINT, {
    'loai-tai-lieu': termId,
    per_page: limit,
    page: 1,
    orderby: 'date',
    order: 'desc',
    _embed: 1,
    lang: locale,
  });

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: {
        revalidate: REVALIDATE_POSTS,
        tags: [CACHE_TAGS.POSTS, `documents-term-${termId}-${locale}`],
      },
    });
    if (!response.ok) return { documents: [], total: 0 };

    const documents = await response.json() as WPDocument[];
    const total = Number.parseInt(response.headers.get('x-wp-total') ?? '', 10);

    return {
      documents: await Promise.all(
        documents.map((document) => enrichDocumentWithAcf(document, locale)),
      ),
      total: Number.isFinite(total) ? total : documents.length,
    };
  } catch {
    return { documents: [], total: 0 };
  }
}

export async function getDocumentTaxonomyData(
  slug: string,
  loadCount: number,
  locale: Locale = 'vi',
): Promise<DocumentTaxonomyData | null> {
  const allTerms = await getAllDocumentTerms(locale).catch(() => []);
  const term = allTerms.find((candidate) => candidate.slug === slug);
  const root = allTerms.find((candidate) => candidate.slug === DOCUMENT_ROOT_SLUG);
  if (!term || !root) return null;

  const termsById = new Map(allTerms.map((candidate) => [candidate.id, candidate]));
  if (term.id !== root.id && !isDescendantOf(term, root.id, termsById)) return null;

  const limit = Math.min(96, Math.max(6, loadCount * 6));
  const descendants = allTerms.filter((candidate) => (
    candidate.id !== term.id && isDescendantOf(candidate, term.id, termsById)
  ));

  const descendantGroups = await Promise.all(
    descendants.map(async (childTerm): Promise<DocumentGroup> => {
      const result = await getDocumentsByTerm(childTerm.id, limit, locale);
      return {
        term: childTerm,
        termPath: buildTermPath(childTerm, termsById),
        documents: result.documents,
        total: result.total,
      };
    }),
  );
  const populatedChildGroups = descendantGroups.filter((group) => group.documents.length > 0);

  let groups = populatedChildGroups;
  if (groups.length === 0) {
    const result = await getDocumentsByTerm(term.id, limit, locale);
    groups = [{
      term,
      termPath: buildTermPath(term, termsById),
      documents: result.documents,
      total: result.total,
    }];
  }

  return {
    term,
    ancestors: buildAncestors(term, termsById),
    banner: await resolveDocumentBanner(term, locale),
    groups,
  };
}

export function getDocumentFileUrl(document: WPDocument): string | null {
  const acf = document.acf;
  if (!acf || Array.isArray(acf)) return null;
  const rows = acf.tai_len_tai_lieu;
  if (!Array.isArray(rows) || rows.length !== 1) return null;

  const row = rows[0];
  if (!row || typeof row !== 'object' || !('tai_lieu' in row)) return null;
  const file = row.tai_lieu;
  if (typeof file === 'string') return /^https?:\/\//i.test(file) ? file : null;
  if (!file || typeof file !== 'object' || !('url' in file)) return null;

  return typeof file.url === 'string' && /^https?:\/\//i.test(file.url)
    ? file.url
    : null;
}

export function getDocumentAcfText(document: WPDocument, key: string): string {
  const acf = document.acf;
  if (!acf || Array.isArray(acf)) return '';
  const value = acf[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function getDocumentFeaturedImage(document: WPDocument): WPMedia | null {
  const media = document._embedded?.['wp:featuredmedia']?.[0];
  return media && 'source_url' in media ? media : null;
}

function normalizeDocumentFile(value: unknown): DocumentFileMedia | null {
  if (typeof value === 'string') {
    if (!/^https?:\/\//i.test(value)) return null;
    return {
      id: null,
      url: value,
      alt: '',
      title: '',
      caption: '',
      description: '',
      width: null,
      height: null,
      mime_type: '',
      sizes: { thumbnail: value, medium: value, large: value, full: value },
    };
  }
  if (!value || typeof value !== 'object') return null;
  const file = value as Partial<DocumentFileMedia> & { ID?: number };
  if (typeof file.url !== 'string' || !/^https?:\/\//i.test(file.url)) return null;
  const sizes: Partial<Record<'thumbnail' | 'medium' | 'large' | 'full', string>> =
    file.sizes && typeof file.sizes === 'object' ? file.sizes : {};
  return {
    id: typeof file.id === 'number' ? file.id : typeof file.ID === 'number' ? file.ID : null,
    url: file.url,
    alt: typeof file.alt === 'string' ? file.alt : '',
    title: typeof file.title === 'string' ? file.title : '',
    caption: typeof file.caption === 'string' ? file.caption : '',
    description: typeof file.description === 'string' ? file.description : '',
    width: typeof file.width === 'number' ? file.width : null,
    height: typeof file.height === 'number' ? file.height : null,
    mime_type: typeof file.mime_type === 'string' ? file.mime_type : '',
    sizes: {
      thumbnail: typeof sizes.thumbnail === 'string' ? sizes.thumbnail : file.url,
      medium: typeof sizes.medium === 'string' ? sizes.medium : file.url,
      large: typeof sizes.large === 'string' ? sizes.large : file.url,
      full: typeof sizes.full === 'string' ? sizes.full : file.url,
    },
  };
}

function fallbackDocumentRows(document: WPDocument): DocumentFileRow[] {
  const acf = document.acf;
  if (!acf || Array.isArray(acf) || !Array.isArray(acf.tai_len_tai_lieu)) return [];
  return acf.tai_len_tai_lieu.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    const file = normalizeDocumentFile(row.tai_lieu);
    if (!file) return [];
    const symbol = typeof row.ky_hieu === 'string' ? row.ky_hieu : '';
    const issuedDate = typeof row.ngay_ban_hanh === 'string' ? row.ngay_ban_hanh : '';
    return [{
      index,
      symbol,
      issued_date: null,
      issued_date_display: issuedDate,
      title: file.title || `Tài liệu ${index + 1}`,
      file,
    }];
  });
}

async function getLegacyDocumentRedirect(slug: string): Promise<string | null> {
  const url = new URL(`/tai-lieu/${encodeURIComponent(slug)}/`, WP_SITE_URL);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { Accept: 'text/html,application/xhtml+xml' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, `document-legacy-redirect-${slug}`] },
      signal: AbortSignal.timeout(10_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return null;
    const location = response.headers.get('location');
    return location && /^https?:\/\//i.test(location) ? location : null;
  } catch {
    return null;
  }
}

async function getLegacyDocumentFileFromArchive(title: string): Promise<string | null> {
  const url = new URL('/van-ban-tai-lieu/', WP_SITE_URL);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, 'document-legacy-archive'] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const normalizedTitle = stripHtml(title).replace(/\s+/g, ' ').trim();
    while ((match = pattern.exec(html)) !== null) {
      const label = stripHtml(match[2]).replace(/\s+/g, ' ').trim();
      if (label === normalizedTitle && /\/wp-content\/uploads\//i.test(match[1])) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/** Detail contract for the former single-tai-lieu.php template, with a core REST fallback. */
export async function getDocumentDetails(
  slug: string,
  locale: Locale = 'vi',
): Promise<DocumentDetailsData | null> {
  const url = new URL(`/wp-json/headless/v1/documents/${encodeURIComponent(slug)}`, WP_SITE_URL);
  url.searchParams.set('lang', locale);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, `document-detail-${slug}-${locale}`] },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return await response.json() as DocumentDetailsData;
  } catch {
    // Continue with the core REST fallback below.
  }

  const documents = await wpFetch<WPDocument[]>(DOCUMENT_ENDPOINT, {
    params: { slug, _embed: 1, lang: locale },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS, `document-detail-core-${slug}-${locale}`],
  }).catch(() => []);
  const source = documents[0];
  if (!source) return null;
  const document = await enrichDocumentWithAcf(source, locale);
  let rows = fallbackDocumentRows(document);
  if (rows.length === 0) {
    const redirectUrl = await getLegacyDocumentRedirect(document.slug)
      ?? await getLegacyDocumentFileFromArchive(document.title.rendered);
    if (redirectUrl) {
      const file = normalizeDocumentFile(redirectUrl)!;
      rows = [{
        index: 0,
        symbol: '',
        issued_date: null,
        issued_date_display: '',
        title: stripHtml(document.title.rendered),
        file,
      }];
    }
  }
  return {
    source: 'wordpress-core-fallback',
    post_type: 'tai-lieu',
    taxonomy: 'loai-tai-lieu',
    id: document.id,
    slug: document.slug,
    title: stripHtml(document.title.rendered),
    excerpt: '',
    link: document.link,
    date: document.date,
    modified: document.modified,
    lang: locale,
    translations: {},
    banner: null,
    documents: rows,
    document_count: rows.length,
    redirect: { required: rows.length === 1, url: rows.length === 1 ? rows[0].file.url : '', status: rows.length === 1 ? 302 : null },
  };
}
