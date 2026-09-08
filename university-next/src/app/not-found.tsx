import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

/**
 * Global 404 page for the application.
 *
 * Called when:
 * - next/navigation notFound() is invoked
 * - A route segment doesn't match any defined page
 * - WordPress content is not found (null result from API)
 *
 * This is distinct from server/network errors, which are handled
 * by error boundaries (error.tsx / global-error.tsx).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="mb-2 text-7xl font-extrabold text-blue-700">404</p>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        Không tìm thấy trang
      </h1>
      <p className="mb-8 max-w-md text-gray-600">
        Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
