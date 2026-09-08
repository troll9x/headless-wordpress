import { NextRequest, NextResponse } from 'next/server';
import { searchHeadlessSite } from '@/lib/wordpress/headless-search';
import type { Locale } from '@/types/ngon-ngu';

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
  const locale: Locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'vi';
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ items: [] });
  }

  try {
    const result = await searchHeadlessSite(query, locale, 1, limit);
    return NextResponse.json(
      {
        items: result.items.map((item) => ({
          title: item.title,
          url: item.url,
          excerpt: item.excerpt,
          thumb: item.thumb,
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { items: [], error: 'Search service is temporarily unavailable.' },
      { status: 502 },
    );
  }
}
