export default function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
