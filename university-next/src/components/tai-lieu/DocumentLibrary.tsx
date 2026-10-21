'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const tabs = [
  { slug: 'van-ban-cua-dang', label: 'Văn bản của Đảng' },
  { slug: 'van-ban-nha-nuoc', label: 'Văn bản nhà nước' },
  { slug: 'van-ban-truong', label: 'Văn bản trường' },
  { slug: 'bieu-mau', label: 'Biểu mẫu' },
];

export interface LibraryRow {
  id: number;
  slug: string;
  title: string;
  symbol: string;
  issued_date: string;
  effect_status: string;
  sectors: { id: number; slug: string; name: string }[];
  files: { url: string; title: string }[];
  detail_url: string;
}

export interface LibraryData {
  items: LibraryRow[];
  total: number;
  page: number;
  pages: number;
  sectors: { id: number; slug: string; name: string; count: number }[];
}

function status(value: string) {
  if (value === 'conhieuluc') return { text: 'Còn hiệu lực', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
  if (value === 'hethieuluc') return { text: 'Hết hiệu lực', className: 'bg-rose-50 text-rose-800 ring-rose-200' };
  if (value === 'chuacohieuluc') return { text: 'Chưa có hiệu lực', className: 'bg-amber-50 text-amber-800 ring-amber-200' };
  return null;
}

function displayDate(value: string) {
  if (/^\d{8}$/.test(value)) return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
  return value || '—';
}

export default function DocumentLibrary({ initial, category }: { initial: LibraryData; category: string }) {
  const [data, setData] = useState(initial);
  const [sector, setSector] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ category, page: String(page) });
    if (sector) params.set('sector', sector);
    if (debounced) params.set('q', debounced);
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return null;
      setLoading(true);
      setError(false);
      return fetch(`/api/document-library?${params}`, { signal: controller.signal });
    })
      .then(async response => {
        if (!response) return null;
        if (!response.ok) throw new Error('Request failed');
        return response.json() as Promise<LibraryData>;
      })
      .then(result => { if (result) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, sector, debounced, page, retry]);

  return <main className="min-h-screen bg-slate-50 py-8 sm:py-12">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Thư viện tài liệu</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Văn bản & tài liệu</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Tra cứu văn bản theo nhóm, lĩnh vực hoặc từ khóa. Chọn tên văn bản để xem chi tiết và tệp đính kèm.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav aria-label="Loại văn bản" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2">
          {tabs.map(tab => <Link key={tab.slug} href={`/van-ban-tai-lieu/${tab.slug}`}
            aria-current={category === tab.slug ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-4 py-3 text-sm font-semibold transition sm:px-5 ${category === tab.slug ? 'bg-blue-800 text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-800'}`}>
            {tab.label}
          </Link>)}
        </nav>

        <div className="grid gap-4 border-b border-slate-200 bg-white p-4 sm:grid-cols-[minmax(210px,1fr)_minmax(260px,2fr)] sm:p-6">
          <label className="block text-sm font-semibold text-slate-700">Chọn lĩnh vực
            <select value={sector} onChange={event => { setSector(event.target.value); setPage(1); }}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Tất cả lĩnh vực</option>
              {data.sectors.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Tìm theo từ khóa hoặc ký hiệu
            <input type="search" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1); }}
              placeholder="Nhập tên văn bản hoặc ký hiệu…"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600 sm:px-6" role="status" aria-live="polite">
          <span>{error ? 'Không thể tải tài liệu. Vui lòng thử lại.' : `${data.total} văn bản${loading ? ' · Đang tìm…' : ''}`}</span>
          {error && <button type="button" onClick={() => setRetry(value => value + 1)} className="font-semibold text-blue-800 underline" >Thử lại</button>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-700"><tr>
              <th className="w-[16%] px-5 py-4">Ký hiệu</th><th className="w-[14%] px-5 py-4">Ngày ban hành</th>
              <th className="px-5 py-4">Tên văn bản</th><th className="w-[15%] px-5 py-4">Hiệu lực</th><th className="w-[10%] px-5 py-4">Tệp</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map(row => <tr key={row.id} className="align-top hover:bg-blue-50/50">
                <td className="break-words px-5 py-5 font-semibold text-slate-800">{row.symbol || '—'}</td>
                <td className="px-5 py-5 text-slate-600">{displayDate(row.issued_date)}</td>
                <td className="px-5 py-5"><Link href={row.detail_url} className="font-medium leading-relaxed text-slate-900 hover:text-blue-800 hover:underline">{row.title}</Link>
                  {row.sectors.length > 0 && <div className="mt-2 text-xs text-slate-500">{row.sectors.map(item => item.name).join(', ')}</div>}</td>
                <td className="px-5 py-5">{status(row.effect_status) && <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status(row.effect_status)!.className}`}>{status(row.effect_status)!.text}</span>}</td>
                <td className="px-5 py-5">{row.files.length ? <a href={row.files[0].url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-800 hover:underline" aria-label={`Tải tệp: ${row.title}`}>Tải xuống</a> : '—'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {data.items.map(row => <article key={row.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="font-bold text-blue-800">{row.symbol || 'Văn bản'}</span><span>· {displayDate(row.issued_date)}</span></div>
            <h2 className="mt-2 font-semibold leading-snug text-slate-900"><Link href={row.detail_url}>{row.title}</Link></h2>
            {row.sectors.length > 0 && <p className="mt-2 text-xs text-slate-500">{row.sectors.map(item => item.name).join(', ')}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {status(row.effect_status) ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status(row.effect_status)!.className}`}>{status(row.effect_status)!.text}</span> : <span />}
              {row.files.length > 0 && <a href={row.files[0].url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-800 underline">Tải xuống</a>}
            </div>
          </article>)}
        </div>
        {!loading && !error && data.items.length === 0 && <p className="px-4 py-12 text-center text-slate-600">Không tìm thấy văn bản phù hợp.</p>}
        {data.pages > 1 && <nav aria-label="Phân trang tài liệu" className="flex items-center justify-center gap-4 border-t border-slate-200 p-5 text-sm">
          <button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-blue-800 disabled:opacity-40">Trước</button>
          <span>Trang {page}/{data.pages}</span>
          <button disabled={page >= data.pages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-blue-800 disabled:opacity-40">Tiếp</button>
        </nav>}
      </div>
    </div>
  </main>;
}
