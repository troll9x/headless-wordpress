import { NextRequest, NextResponse } from 'next/server';
import { WP_API_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';

const categories = new Set(['van-ban-cua-dang', 'van-ban-nha-nuoc', 'van-ban-truong', 'bieu-mau']);

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const category = input.get('category') ?? 'van-ban-truong';
  if (!categories.has(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  const params = new URLSearchParams({ category });
  const sector = (input.get('sector') ?? '').slice(0, 100);
  const q = (input.get('q') ?? '').trim().slice(0, 100);
  if (sector) params.set('sector', sector);
  if (q) params.set('q', q);
  params.set('page', String(Math.min(1000, Math.max(1, Number(input.get('page')) || 1))));
  params.set('per_page', '20');
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/document-library', Object.fromEntries(params));
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`CMS ${response.status}`);
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Document library is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
