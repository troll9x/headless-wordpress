'use client';

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/**
 * Error boundary for English post detail routes.
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
        Unable to load article
      </h1>
      <p className="mb-8 text-gray-600">
        An error occurred while loading this article. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  );
}
