import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { SearchIcon } from '@/components/ui/icons';
import { getHomePath } from '@/constants/duong-dan';
import { searchSite } from '@/lib/wordpress/search';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';

const RESULTS_PER_PAGE = 10;

interface SearchResultsPageProps {
  locale: Locale;
  query?: string;
  page?: string;
}

function pageNumber(value?: string): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function resultType(type: string, subtype: string, locale: Locale): string {
  const isPage = subtype === 'page' || type === 'page';
  if (locale === 'en') return isPage ? 'Page' : 'Article';
  return isPage ? 'Trang' : 'Bài viết';
}

function paginationHref(path: string, query: string, page: number): string {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return `${path}?${params.toString()}`;
}

export default async function SearchResultsPage({
  locale,
  query = '',
  page: rawPage,
}: SearchResultsPageProps) {
  const isEn = locale === 'en';
  const searchPath = isEn ? '/en/search' : '/tim-kiem';
  const cleanQuery = query.trim().replace(/\s+/g, ' ').slice(0, 120);
  const currentPage = pageNumber(rawPage);
  const result = cleanQuery
    ? await searchSite(cleanQuery, locale, currentPage, RESULTS_PER_PAGE).catch(() => ({
        items: [],
        total: 0,
        totalPages: 0,
      }))
    : { items: [], total: 0, totalPages: 0 };
  const totalPages = Math.max(1, result.totalPages);
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  const pages = Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, index) => startPage + index,
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              { label: isEn ? 'Search' : 'Tìm kiếm' },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#0118d8]">
          {isEn ? 'Search' : 'Tìm kiếm'}
        </h1>

        <form action={searchPath} method="get" role="search" className="mt-6 flex gap-3">
          <label htmlFor="search-page-query" className="sr-only">
            {isEn ? 'Search keywords' : 'Từ khóa tìm kiếm'}
          </label>
          <input
            id="search-page-query"
            name="q"
            type="search"
            defaultValue={cleanQuery}
            required
            placeholder={isEn ? 'Enter keywords...' : 'Nhập từ khóa...'}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0118d8] focus:ring-2 focus:ring-[#0118d8]/20"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0118d8] px-5 py-3 font-semibold text-white transition hover:bg-[#0014b8]"
          >
            <SearchIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{isEn ? 'Search' : 'Tìm kiếm'}</span>
          </button>
        </form>

        {!cleanQuery ? (
          <p className="mt-8 rounded-lg bg-slate-50 p-6 text-slate-600">
            {isEn ? 'Enter a keyword to search the website.' : 'Nhập từ khóa để tìm kiếm trên website.'}
          </p>
        ) : result.items.length === 0 ? (
          <p className="mt-8 rounded-lg bg-slate-50 p-6 text-slate-600">
            {isEn ? `No results found for “${cleanQuery}”.` : `Không tìm thấy kết quả cho “${cleanQuery}”.`}
          </p>
        ) : (
          <>
            <p className="mt-8 text-sm text-slate-600">
              {isEn
                ? `Search results for “${cleanQuery}”`
                : `Kết quả tìm kiếm cho “${cleanQuery}”`}
            </p>

            <ol className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              {result.items.map((item) => (
                <li key={`${item.type}-${item.subtype}-${item.id}`} className="py-6">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#009051]">
                    {resultType(item.type, item.subtype, locale)}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
                    <Link href={item.url} className="transition-colors hover:text-[#0118d8]">
                      {stripHtml(item.title)}
                    </Link>
                  </h2>
                </li>
              ))}
            </ol>

            {result.totalPages > 1 && (
              <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label={isEn ? 'Search pagination' : 'Phân trang tìm kiếm'}>
                {currentPage > 1 && (
                  <Link href={paginationHref(searchPath, cleanQuery, currentPage - 1)} className="rounded border px-3 py-2 hover:border-[#0118d8] hover:text-[#0118d8]">
                    {isEn ? 'Previous' : 'Trước'}
                  </Link>
                )}
                {pages.map((page) => (
                  <Link
                    key={page}
                    href={paginationHref(searchPath, cleanQuery, page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={`min-w-10 rounded border px-3 py-2 text-center ${
                      page === currentPage
                        ? 'border-[#0118d8] bg-[#0118d8] text-white'
                        : 'hover:border-[#0118d8] hover:text-[#0118d8]'
                    }`}
                  >
                    {page}
                  </Link>
                ))}
                {currentPage < result.totalPages && (
                  <Link href={paginationHref(searchPath, cleanQuery, currentPage + 1)} className="rounded border px-3 py-2 hover:border-[#0118d8] hover:text-[#0118d8]">
                    {isEn ? 'Next' : 'Sau'}
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
