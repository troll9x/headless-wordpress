export type Locale = 'vi' | 'en';

export interface LocaleConfig {
  code: Locale;
  label: string;
  wpLang: string;
  urlPrefix: string;
}

export interface LocalizedString {
  vi: string;
  en: string;
}
