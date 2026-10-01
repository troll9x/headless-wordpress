import type { Metadata } from 'next';
import './globals.css';
import '@/styles/site-font.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MangXaHoiNoi from '@/components/layout/MangXaHoiNoi';
import DocumentLanguage from '@/components/ngon-ngu/DocumentLanguage';
import { SITE_NAME } from '@/constants/api';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';
import { getSiteFavicon, type SiteFavicon } from '@/lib/wordpress/site-favicon';
import { getSiteLogos } from '@/lib/wordpress/site-logo';
import { getSiteFooter } from '@/lib/wordpress/site-footer';
import { getSiteSocialLinks } from '@/lib/wordpress/site-social';

const baseMetadata: Metadata = {
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

function faviconDescriptor(favicon: SiteFavicon) {
  return {
    url: favicon.url,
    ...(favicon.mimeType ? { type: favicon.mimeType } : {}),
    ...(favicon.width && favicon.height
      ? { sizes: `${favicon.width}x${favicon.height}` }
      : {}),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await getSiteFavicon().catch(() => null);

  if (!favicon) return baseMetadata;

  const icon = faviconDescriptor(favicon);

  return {
    ...baseMetadata,
    icons: {
      icon,
      shortcut: icon,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [logos, footer, social] = await Promise.all([
    getSiteLogos().catch(() => null),
    getSiteFooter().catch(() => null),
    getSiteSocialLinks().catch(() => null),
  ]);

  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white">
        <DocumentLanguage />
        <Header logos={logos} />
        <main className="flex-1">{children}</main>
        <MangXaHoiNoi social={social} />
        <Footer logos={logos} footer={footer} social={social} />
      </body>
    </html>
  );
}
