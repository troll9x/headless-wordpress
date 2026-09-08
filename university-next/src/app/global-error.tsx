'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isEn = typeof window !== 'undefined'
    && (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'));

  return (
    <html lang={isEn ? 'en' : 'vi'}>
      <body>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2>{isEn ? 'Something went wrong' : 'Có lỗi xảy ra'}</h2>
          <p style={{ color: '#666' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            {isEn ? 'Try again' : 'Thử lại'}
          </button>
        </div>
      </body>
    </html>
  );
}
