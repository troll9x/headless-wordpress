'use client';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const isEn = typeof window !== 'undefined'
    && (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'));

  return (
    <html lang={isEn ? 'en' : 'vi'}>
      <body>
        <main style={{ maxWidth: '40rem', margin: '10vh auto', padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>{isEn ? 'Content is temporarily unavailable' : 'Nội dung tạm thời chưa tải được'}</h1>
          <p style={{ color: '#555', lineHeight: 1.6 }}>
            {isEn
              ? 'Please try again shortly. If the problem continues, return to the homepage.'
              : 'Vui lòng thử lại sau ít phút. Nếu lỗi tiếp diễn, hãy về trang chủ.'}
          </p>
          {error.digest && (
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              {isEn ? 'Error code' : 'Mã lỗi'}: {error.digest}
            </p>
          )}
          <button
            onClick={retry}
            style={{ marginTop: '1rem', padding: '0.65rem 1rem', cursor: 'pointer' }}
          >
            {isEn ? 'Try again' : 'Thử lại'}
          </button>
          <a href={isEn ? '/en' : '/'} style={{ marginLeft: '1rem' }}>
            {isEn ? 'Homepage' : 'Trang chủ'}
          </a>
        </main>
      </body>
    </html>
  );
}
