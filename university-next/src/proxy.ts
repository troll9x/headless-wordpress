import { NextRequest, NextResponse } from 'next/server';
import legacyRedirects from './data/legacy-permalink-redirects.json';

const redirectMap = legacyRedirects as Record<string, string>;

function normalizePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  } catch {
    return pathname.replace(/\/+$/, '') || '/';
  }
}

export function proxy(request: NextRequest) {
  const source = normalizePath(request.nextUrl.pathname);
  const target = redirectMap[source];
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return NextResponse.next();
  }

  const destination = new URL(target, request.url);
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
