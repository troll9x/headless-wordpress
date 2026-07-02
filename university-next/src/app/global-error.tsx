'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2>Có lỗi xảy ra</h2>
          <p style={{ color: '#666' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
