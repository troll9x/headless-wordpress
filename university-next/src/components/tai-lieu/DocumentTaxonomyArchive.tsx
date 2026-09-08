import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getHomePath } from '@/constants/duong-dan';
import {
  getDocumentAcfText,
  getDocumentFeaturedImage,
  getDocumentFileUrl,
  type DocumentGroup,
  type DocumentTaxonomyData,
  type WPDocument,
} from '@/lib/wordpress/documents';
import { stripHtml } from '@/lib/utils/html';
import { documentArchiveStyles as styles } from '@/styles/tlu-template-recipes';
import type { Locale } from '@/types/ngon-ngu';

const FALLBACK_IMAGE = 'https://tlu.edu.vn/wp-content/uploads/2025/07/Mau-don-sinh-vien.webp';

interface DocumentTaxonomyArchiveProps {
  data: DocumentTaxonomyData;
  locale: Locale;
  view: 'grid' | 'list';
  loadCount: number;
  basePath: string;
}

function queryHref(basePath: string, view: 'grid' | 'list', loadCount: number): string {
  const params = new URLSearchParams();
  if (view === 'list') params.set('view', 'list');
  if (loadCount > 1) params.set('load', String(loadCount));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function DocumentImage({ document, view, locale }: { document: WPDocument; view: 'grid' | 'list'; locale: Locale }) {
  const image = getDocumentFeaturedImage(document);
  const src = image?.source_url || FALLBACK_IMAGE;
  const alt = image?.alt_text || stripHtml(document.title.rendered) || (locale === 'en' ? 'Document' : 'Tài liệu');

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${
      view === 'list' ? 'aspect-[4/3] w-full sm:w-[220px]' : 'aspect-[4/3] w-full'
    }`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={view === 'list' ? '(max-width: 640px) 100vw, 220px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}

function DocumentCard({
  document,
  locale,
  view,
}: {
  document: WPDocument;
  locale: Locale;
  view: 'grid' | 'list';
}) {
  const fileUrl = getDocumentFileUrl(document);
  const href = fileUrl || (locale === 'en'
    ? `/en/tai-lieu/${encodeURIComponent(document.slug)}`
    : `/tai-lieu/${encodeURIComponent(document.slug)}`);
  const title = stripHtml(document.title.rendered);
  const issueDate = getDocumentAcfText(document, 'ngay_ban_hanh');
  const symbol = getDocumentAcfText(document, 'ky_hieu');
  const isEn = locale === 'en';
  const externalProps = fileUrl
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <article className={`group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
      view === 'list' ? 'flex flex-col gap-5 p-4 sm:flex-row' : ''
    }`}>
      <div className={view === 'list' ? 'shrink-0' : ''}>
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          {issueDate
            ? `${isEn ? 'Issued date' : 'Ngày ban hành'}: ${issueDate}`
            : (isEn ? 'Updating' : 'Đang cập nhật')}
        </div>
        <a href={href} {...externalProps} className="block">
          <DocumentImage document={document} view={view} locale={locale} />
        </a>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm font-medium text-[#0118d8]">
          {symbol
            ? `${isEn ? 'Reference' : 'Ký hiệu'}: ${symbol}`
            : (isEn ? 'Updating' : 'Đang cập nhật')}
        </div>
      </div>

      <div className={view === 'list' ? 'min-w-0 flex-1 self-center py-2' : 'p-4'}>
        <h3 className="text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-[#0118d8]">
          <a href={href} {...externalProps}>{title}</a>
        </h3>
      </div>
    </article>
  );
}

function DocumentGroupSection({
  group,
  locale,
  view,
  loadCount,
  basePath,
}: {
  group: DocumentGroup;
  locale: Locale;
  view: 'grid' | 'list';
  loadCount: number;
  basePath: string;
}) {
  const isEn = locale === 'en';

  return (
    <section className="mb-12">
      <h2 className="mb-6 border-b-2 border-[#0118d8] pb-2 text-2xl font-bold text-[#0118d8]">
        <Link href={locale === 'en' ? `/en${group.termPath}` : group.termPath} className="hover:text-[#007cba]">
          {stripHtml(group.term.name)}
        </Link>
      </h2>

      {group.documents.length > 0 ? (
        <div className={view === 'list' ? 'grid gap-5' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
          {group.documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              locale={locale}
              view={view}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-5 py-8 text-center text-slate-500">
          {isEn ? 'No documents in this category.' : 'Không có tài liệu nào trong danh mục này.'}
        </p>
      )}

      {loadCount < 16 && group.total > group.documents.length && (
        <div className={styles.loadMore}>
          <Link
            href={queryHref(basePath, view, loadCount + 1)}
            className={styles.loadMoreButton}
            scroll={false}
          >
            {isEn ? 'Load more' : 'Xem thêm'}
          </Link>
        </div>
      )}
    </section>
  );
}

export default function DocumentTaxonomyArchive({
  data,
  locale,
  view,
  loadCount,
  basePath,
}: DocumentTaxonomyArchiveProps) {
  const isEn = locale === 'en';

  return (
    <main className="min-h-screen bg-white">
      {data.banner && (
        <div className="relative w-full overflow-hidden bg-slate-100">
          <Image
            src={data.banner.url}
            alt={data.banner.alt}
            width={data.banner.width}
            height={data.banner.height}
            priority
            sizes="100vw"
            className="block min-h-[170px] w-full object-cover sm:min-h-0"
          />
        </div>
      )}

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              ...data.ancestors.map((ancestor) => ({
                label: stripHtml(ancestor.name),
                href: ancestor.slug === 'van-ban-tai-lieu'
                  ? (isEn ? '/en/van-ban-tai-lieu' : '/van-ban-tai-lieu')
                  : `${isEn ? '/en' : ''}/van-ban-tai-lieu/${encodeURIComponent(ancestor.slug)}`,
              })),
              { label: stripHtml(data.term.name) },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-center text-3xl font-bold uppercase text-[#0118d8] sm:text-4xl">
          {stripHtml(data.term.name)}
        </h1>

        <nav className={styles.viewToggle} aria-label={isEn ? 'View type' : 'Kiểu hiển thị'}>
          <Link
            href={queryHref(basePath, 'list', loadCount)}
            className={`${styles.viewButton} ${view === 'list' ? styles.activeViewButton : ''}`}
            aria-current={view === 'list' ? 'page' : undefined}
            title={isEn ? 'List view' : 'Dạng danh sách'}
          >
            <FontAwesomeIcon icon={faList} className="h-4 w-4" />
          </Link>
          <Link
            href={queryHref(basePath, 'grid', loadCount)}
            className={`${styles.viewButton} ${view === 'grid' ? styles.activeViewButton : ''}`}
            aria-current={view === 'grid' ? 'page' : undefined}
            title={isEn ? 'Grid view' : 'Dạng lưới'}
          >
            <FontAwesomeIcon icon={faTableCellsLarge} className="h-4 w-4" />
          </Link>
        </nav>

        {data.groups.map((group) => (
          <DocumentGroupSection
            key={group.term.id}
            group={group}
            locale={locale}
            view={view}
            loadCount={loadCount}
            basePath={basePath}
          />
        ))}
      </div>
    </main>
  );
}
