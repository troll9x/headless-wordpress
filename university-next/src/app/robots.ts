import type { MetadataRoute } from 'next';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';

/**
 * robots.txt source of truth.
 *
 * - Production frontend origin: derived from NEXT_PUBLIC_SITE_URL.
 * - Public static routes are explicitly allowed.
 * - Draft/preview, internal Next paths, and any route not verified
 *   as public stay out of the allow list.
 * - Sitemap points to the production frontend origin.
 * - Phase 7 keeps this route minimal and data-driven; no WordPress CMS
 *   backend URLs are referenced.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/sitemap.xml`,
    host: NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ''),
  };
}