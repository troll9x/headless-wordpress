import { FRONTEND_URL, SITE_NAME } from '@/constants/api';
import type { Locale } from '@/types/ngon-ngu';

export const SEO_CONFIG = {
  siteName: SITE_NAME,
  siteUrl: FRONTEND_URL,
  twitterHandle: '',
  ogLocale: {
    vi: 'vi_VN',
    en: 'en_US',
  } satisfies Record<Locale, string>,
} as const;
