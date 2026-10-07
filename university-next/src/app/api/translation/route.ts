import { NextRequest, NextResponse } from 'next/server';
import { buildPostUrl } from '@/constants/duong-dan';
import { WP_API_URL } from '@/config/env/server';
import { wpFetchUrl } from '@/lib/wordpress/client';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import type { Locale } from '@/types/ngon-ngu';

interface ResolvedContent {
  id?: unknown;
  slug?: unknown;
  type?: unknown;
  canonical_path?: unknown;
}

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('id'));
  const language = request.nextUrl.searchParams.get('lang');
  if (!Number.isSafeInteger(id) || id <= 0 || (language !== 'vi' && language !== 'en')) {
    return NextResponse.json({ error: 'Invalid translation request.' }, { status: 400 });
  }

  const endpoint = buildWordPressRestUrl(WP_API_URL, '/headless/v1/resolve', {
    id,
    lang: language,
  });

  try {
    const content = await wpFetchUrl<ResolvedContent>(endpoint.toString(), 60);
    if (content.type !== 'post' || typeof content.id !== 'number' || typeof content.slug !== 'string') {
      return NextResponse.json({ error: 'No translated article is available.' }, { status: 404 });
    }

    return NextResponse.json(
      { path: buildPostUrl(
        content.slug,
        language as Locale,
        undefined,
        content.id,
        typeof content.canonical_path === 'string' ? content.canonical_path : undefined,
      ) },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    );
  } catch {
    return NextResponse.json({ error: 'Translation lookup is temporarily unavailable.' }, { status: 503 });
  }
}
