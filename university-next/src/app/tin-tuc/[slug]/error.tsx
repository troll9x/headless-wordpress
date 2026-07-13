'use client';

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/**
 * Error boundary for Vietnamese post detail routes.
 *
 * Handles:
 * - WordPress API unavailable / timeout
 * - WordPress REST errors (500, 503, etc.)
 * - Invalid JSON / malformed response
 *
 * These errors are distinct from content-not-found (404),
 * which is handled by notFound() in the page component.
 */
export default function PostError({ reset }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        Kh&#244;ng thể tải b&#224;i viết
      </h1>
      <p className="mb-8 text-gray-600">
        Có lỗi xảy ra khi tải bài viết. Vui lòng thử lại.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        Thử lại
      </button>
    </div>
  );
}
