import type { MetadataRoute } from 'next';
import { NEXT_PUBLIC_SITE_URL } from '@/config/env/public';

/**
 * sitemap.xml source of truth.
 *
 * Phase 7 creates a minimal sitemap with only the verified static routes.
 * Dynamic post/page/category routes are excluded because no reliable runtime
 * source of all slugs has been verified.
 *
 * lastModified is intentionally omitted because no verified content
 * modification timestamp exists for these static route entries.
 * changeFrequency and priority are not used.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');

  return [
    {
      url: `${baseUrl}/`,
    },
    {
      url: `${baseUrl}/en`,
    },
  ];
}