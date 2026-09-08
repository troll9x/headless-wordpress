import type { Metadata } from 'next';
import './globals.css';
import '@/styles/site-font.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MangXaHoiNoi from '@/components/layout/MangXaHoiNoi';
import DocumentLanguage from '@/components/ngon-ngu/DocumentLanguage';
import { SITE_NAME } from '@/constants/api';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: `Trang web chính thức của ${SITE_NAME}`,
  applicationName: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white">
        <DocumentLanguage />
        <Header />
        <main className="flex-1">{children}</main>
        <MangXaHoiNoi />
        <Footer />
      </body>
    </html>
  );
}
