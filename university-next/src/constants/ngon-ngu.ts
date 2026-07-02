import type { Locale, LocaleConfig } from '@/types/ngon-ngu';

export const DEFAULT_LOCALE: Locale = 'vi';

export const SUPPORTED_LOCALES: readonly Locale[] = ['vi', 'en'] as const;

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  vi: {
    code: 'vi',
    label: 'Tiếng Việt',
    wpLang: 'vi',
    urlPrefix: '',
  },
  en: {
    code: 'en',
    label: 'English',
    wpLang: 'en',
    urlPrefix: '/en',
  },
};
