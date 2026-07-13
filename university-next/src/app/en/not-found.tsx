import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * English 404 page.
 *
 * This file is required to render a localized 404 page for routes
 * under the /en/ segment. Without it, the root not-found.tsx is used,
 * which may show the wrong language.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="mb-2 text-7xl font-extrabold text-blue-700">404</p>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-gray-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/en"
        className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        Go to homepage
      </Link>
    </div>
  );
}