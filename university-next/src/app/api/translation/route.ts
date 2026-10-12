import { NextRequest, NextResponse } from 'next/server';
import { buildPostUrl, buildCategoryUrl } from '@/constants/duong-dan';
import { WP_API_URL } from '@/config/env/server';
import { wpFetchUrl } from '@/lib/wordpress/client';
import { WordPressApiError } from '@/lib/wordpress/errors';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

interface ResolvedContent {
  id?: number;
  slug?: string;
  type?: string;
  canonical_path?: string;
  translations?: { language?: string; url?: string }[];
}

export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get('lang');
  const path = request.nextUrl.searchParams.get('path') || '';
  const id = Number(request.nextUrl.searchParams.get('id') || path.match(/-(\d+)\/?$/)?.[1]);
  if ((language !== 'vi' && language !== 'en') || (!Number.isSafeInteger(id) && !path) || path.length > 500 || (path && (!path.startsWith('/') || path.startsWith('//')))) {
    return NextResponse.json({ error: 'Invalid translation request.' }, { status: 400 });
  }
  const locale: Locale = language;
  const fallback = locale === 'en' ? '/en' : '/';
  const reply = (target: string, translated = true) => NextResponse.json({ path: target, translated }, { headers: { 'Cache-Control': 'private, max-age=60' } });
  try {
    if (Number.isSafeInteger(id) && id > 0) {
      const endpoint = buildWordPressRestUrl(WP_API_URL, '/headless/v1/resolve', { id, lang: locale });
      const content = await wpFetchUrl<ResolvedContent>(endpoint.toString(), { revalidate: 60, timeoutMs: 6_000 });
      if (content.type !== 'post' || typeof content.id !== 'number' || typeof content.slug !== 'string') return reply(fallback, false);
      return reply(buildPostUrl(content.slug, locale, undefined, content.id, content.canonical_path));
    }
    const sourceLocale = path === '/en' || path.startsWith('/en/') ? 'en' : 'vi';
    const slug = path.replace(/\/+$/, '').split('/').at(-1) || '';
    const endpoint = buildWordPressRestUrl(WP_API_URL, `/headless/v1/term/category/${encodeURIComponent(slug)}`, { lang: sourceLocale, per_page: 1 });
    const term = await wpFetchUrl<ResolvedContent>(endpoint.toString(), { revalidate: 60, timeoutMs: 6_000 });
    const translated = term.translations?.find((item) => item.language === locale);
    if (!translated?.url) return reply(fallback, false);
    // CMS frontend URL settings may point to localhost. Only derive a slug;
    // never redirect the browser to an origin provided by the CMS.
    const translatedSlug = new URL(translated.url, 'https://cms.tlu.edu.vn').pathname.split('/').filter(Boolean).at(-1);
    return translatedSlug ? reply(buildCategoryUrl(translatedSlug, locale)) : reply(fallback, false);
  } catch (error) {
    if (error instanceof WordPressApiError && error.status === 404) return reply(fallback, false);
    console.error('[translation] Lookup failed', error);
    return NextResponse.json({ error: 'Translation lookup is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
