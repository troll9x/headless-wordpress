import Image from 'next/image';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { sanitizeCmsHtml } from '@/lib/security/html';
import MediaGalleryGrid from '@/components/media/MediaGalleryGrid';
import { getHomePath } from '@/constants/duong-dan';
import type {
  MediaGalleryCategoriesData,
  MediaGalleryCategoryData,
} from '@/lib/wordpress/media-gallery';
import type { Locale } from '@/types/ngon-ngu';

interface MediaLibraryProps {
  locale: Locale;
  categories: MediaGalleryCategoriesData;
  gallery?: MediaGalleryCategoryData | null;
}

export default function MediaLibrary({ locale, categories, gallery }: MediaLibraryProps) {
  const isEn = locale === 'en';
  const rootPath = isEn ? '/en/media' : '/media';
  const title = gallery?.category.name || (isEn ? 'Media Library' : 'Thư Viện Media');

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              ...(gallery ? [{ label: isEn ? 'Media' : 'Media', href: rootPath }] : []),
              { label: title },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
        <h1 className="mb-10 text-center font-heading text-3xl font-extrabold uppercase text-[#0118d8] sm:text-4xl">
          {title}
        </h1>

        {gallery ? (
          <>
            {gallery.category.description && (
              <div
                className="mx-auto mb-8 max-w-3xl text-center leading-7 text-slate-600"
                dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(gallery.category.description) }}
              />
            )}
            <MediaGalleryGrid
              images={gallery.images}
              locale={locale}
              emptyText={isEn
                ? 'Images will appear after Headless API 1.14 is deployed.'
                : 'Ảnh sẽ hiển thị đầy đủ sau khi Headless API 1.14 được cập nhật lên WordPress.'}
            />
            {gallery.pagination.total_pages > 1 && (
              <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label={isEn ? 'Pagination' : 'Phân trang'}>
                {Array.from({ length: gallery.pagination.total_pages }, (_, index) => index + 1).map((page) => (
                  <Link
                    key={page}
                    href={`${rootPath}/${encodeURIComponent(gallery.category.slug)}?page=${page}`}
                    className={`flex h-10 min-w-10 items-center justify-center rounded border px-3 text-sm font-semibold ${
                      page === gallery.pagination.page
                        ? 'border-[#0118d8] bg-[#0118d8] text-white'
                        : 'border-slate-200 text-slate-700 hover:border-[#0118d8] hover:text-[#0118d8]'
                    }`}
                    aria-current={page === gallery.pagination.page ? 'page' : undefined}
                  >
                    {page}
                  </Link>
                ))}
              </nav>
            )}
          </>
        ) : categories.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.items.map((category) => {
              const cover = category.cover;
              return (
                <Link
                  key={category.slug}
                  href={`${rootPath}/${encodeURIComponent(category.slug)}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] bg-slate-100">
                    {cover?.url ? (
                      <Image
                        src={cover.sizes.medium || cover.sizes.large || cover.url}
                        alt={cover.alt || category.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl text-slate-300" aria-hidden="true">▧</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-[#0118d8] group-hover:text-[#136aa0]">{category.name}</h2>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{category.count} {isEn ? 'images' : 'ảnh'}</span>
                      {category.latest_image_date && <span>{category.latest_image_date}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-5 py-10 text-center text-slate-500">
            {isEn ? 'No media categories are available.' : 'Chưa có danh mục media.'}
          </p>
        )}
      </div>
    </main>
  );
}
