import 'server-only';

import { CACHE_TAGS, REVALIDATE_PAGES } from '@/constants/api';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';
import { LEGACY_WP_SITE_URL, WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

const FOOTER_OPTIONS_KEY = 'tlu_site_footer';
const FOOTER_REQUEST_TIMEOUT_MS = 6_000;

type JsonRecord = Record<string, unknown>;

export interface SiteFooterLink {
  label: string;
  url: string;
  external: boolean;
}

export interface SiteFooterLocaleData {
  aboutLinks: SiteFooterLink[];
  quickLinks: SiteFooterLink[];
  address: string;
}

export interface SiteFooterData {
  locales: Record<Locale, SiteFooterLocaleData>;
  email: string;
  phone: string;
  phoneHref: string;
  mapEmbedUrl: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function normalizeNavigationUrl(value: unknown): Pick<SiteFooterLink, 'url' | 'external'> | null {
  const raw = text(value);
  if (!raw || /^\s*(?:data|javascript|vbscript):/i.test(raw)) return null;

  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return { url: raw, external: false };
  }

  try {
    const url = new URL(raw, NEXT_PUBLIC_SITE_URL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const frontend = new URL(NEXT_PUBLIC_SITE_URL);
    const wordpress = new URL(WP_SITE_URL);
    const legacyFrontend = new URL(LEGACY_WP_SITE_URL);
    const isInternal = [frontend.origin, wordpress.origin, legacyFrontend.origin].includes(url.origin);

    return {
      url: isInternal ? `${url.pathname}${url.search}${url.hash}` : url.toString(),
      external: !isInternal,
    };
  } catch {
    return null;
  }
}

function normalizeLinks(value: unknown): SiteFooterLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = text(item.label);
    const navigation = normalizeNavigationUrl(item.link);
    return label && navigation ? [{ label, ...navigation }] : [];
  });
}

function normalizeEmail(value: unknown): string {
  const email = text(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizePhoneHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `${value.trim().startsWith('+') ? '+' : ''}${digits}`;
}

function normalizeGoogleMapsEmbedUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowedHost = host === 'www.google.com' || host === 'maps.google.com';
    const isEmbedPath = url.pathname.startsWith('/maps/embed');
    const isOutputEmbed = url.pathname.startsWith('/maps') && url.searchParams.get('output') === 'embed';

    return url.protocol === 'https:' && allowedHost && (isEmbedPath || isOutputEmbed)
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

export function extractSiteFooter(payload: unknown): SiteFooterData {
  const response = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const fields = isRecord(response) && isRecord(response.fields) ? response.fields : {};
  const phone = text(fields.footer_phone);

  return {
    locales: {
      vi: {
        aboutLinks: normalizeLinks(fields.footer_about_links_vi),
        quickLinks: normalizeLinks(fields.footer_quick_links_vi),
        address: text(fields.footer_address_vi),
      },
      en: {
        aboutLinks: normalizeLinks(fields.footer_about_links_en),
        quickLinks: normalizeLinks(fields.footer_quick_links_en),
        address: text(fields.footer_address_en),
      },
    },
    email: normalizeEmail(fields.footer_email),
    phone,
    phoneHref: normalizePhoneHref(phone),
    mapEmbedUrl: normalizeGoogleMapsEmbedUrl(fields.url_map),
  };
}

export async function getSiteFooter(): Promise<SiteFooterData> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/options', {
    key: FOOTER_OPTIONS_KEY,
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_PAGES,
      tags: [CACHE_TAGS.PAGES, 'site-footer'],
    },
    signal: AbortSignal.timeout(FOOTER_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Footer options API returned ${response.status}.`);
  }

  return extractSiteFooter(await response.json());
}
