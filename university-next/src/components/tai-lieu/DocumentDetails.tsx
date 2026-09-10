import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getHomePath } from '@/constants/duong-dan';
import type { DocumentDetailsData } from '@/lib/wordpress/documents';
import type { Locale } from '@/types/ngon-ngu';

export default function DocumentDetails({ data, locale }: { data: DocumentDetailsData; locale: Locale }) {
  const isEn = locale === 'en';
  const archivePath = isEn ? '/en/van-ban-tai-lieu' : '/van-ban-tai-lieu';

  return (
    <main className="min-h-screen bg-white">
      {data.banner?.image.url && (
        <div className="relative w-full overflow-hidden bg-slate-100">
          <Image
            src={data.banner.image.sizes.large || data.banner.image.url}
            alt={data.banner.image.alt || data.banner.term.name}
            width={data.banner.image.width || 2560}
            height={data.banner.image.height || 551}
            priority
            sizes="100vw"
            className="block min-h-[170px] w-full object-cover sm:min-h-0"
          />
        </div>
      )}

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb items={[
            { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
            { label: isEn ? 'Documents' : 'Văn bản – Tài liệu', href: archivePath },
            { label: data.title },
          ]} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#0118d8]">
            <FontAwesomeIcon icon={faFileArrowDown} className="h-6 w-6" />
          </span>
          <h1 className="max-w-5xl font-heading text-2xl font-extrabold uppercase leading-tight text-[#0118d8] sm:text-3xl">{data.title}</h1>
          {data.excerpt && <p className="max-w-3xl leading-7 text-slate-600">{data.excerpt}</p>}
        </div>

        {data.documents.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-[#0118d8] text-sm uppercase text-white">
                  <tr>
                    <th className="px-5 py-4">{isEn ? 'Reference' : 'Ký hiệu'}</th>
                    <th className="px-5 py-4">{isEn ? 'Issued date' : 'Ngày ban hành'}</th>
                    <th className="px-5 py-4">{isEn ? 'Document name' : 'Tên văn bản'}</th>
                    <th className="w-28 px-5 py-4 text-center">{isEn ? 'Download' : 'Tải xuống'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.documents.map((document) => (
                    <tr key={`${document.index}-${document.file.url}`} className="transition hover:bg-blue-50/60">
                      <td className="px-5 py-4 font-semibold text-slate-700">{document.symbol || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{document.issued_date_display || document.issued_date || '—'}</td>
                      <td className="px-5 py-4">
                        <a href={document.file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0118d8] hover:text-[#136aa0] hover:underline">{document.title}</a>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <a href={document.file.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#0118d8] transition hover:bg-[#0118d8] hover:text-white" aria-label={`${isEn ? 'Download' : 'Tải xuống'} ${document.title}`}>
                          <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 px-5 py-10 text-center">
            <p className="font-semibold text-slate-600">{isEn ? 'No downloadable files were found.' : 'Không tìm thấy tệp tài liệu.'}</p>
            <Link href={archivePath} className="mt-4 inline-flex font-semibold text-[#0118d8] hover:underline">{isEn ? 'Back to documents' : 'Quay lại kho tài liệu'}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
