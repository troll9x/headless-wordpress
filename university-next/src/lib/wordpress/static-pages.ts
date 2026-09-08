import { getPageById } from '@/lib/wordpress/pages';
import { stripHtml } from '@/lib/utils/html';
import { sanitizeCmsHtml } from '@/lib/security/html';
import type { Locale } from '@/types/ngon-ngu';

const MISSION_PAGE_IDS: Record<Locale, number> = {
  vi: 286,
  en: 49_696,
};

const ORGANIZATION_PAGE_IDS: Record<Locale, number> = {
  vi: 284,
  en: 49_736,
};

const DEFAULT_MISSION_HERO =
  'https://tlu.edu.vn/wp-content/uploads/2025/06/Toan-truong-scaled-1.webp';

export interface MissionStrategyContent {
  pageTitle: string;
  heroTitle: string;
  heroImageUrl: string;
  overviewLabel: string;
  strategyLabel: string;
  overviewHtml: string;
  strategyHtml: string;
}

export interface OrganizationStaticSections {
  trainingHtml: string;
  administrativeHtml: string;
  scienceHtml: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract a div panel without depending on the WordPress page-builder classes. */
function extractDivInnerHtmlById(html: string, id: string): string {
  const openingPattern = new RegExp(
    `<div\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>`,
    'i',
  );
  const opening = openingPattern.exec(html);
  if (!opening || opening.index === undefined) return '';

  const contentStart = opening.index + opening[0].length;
  const divPattern = /<div\b[^>]*>|<\/div\s*>/gi;
  divPattern.lastIndex = contentStart;
  let depth = 1;
  let token: RegExpExecArray | null;

  while ((token = divPattern.exec(html)) !== null) {
    if (/^<\/div/i.test(token[0])) depth -= 1;
    else depth += 1;

    if (depth === 0) return html.slice(contentStart, token.index);
  }

  return '';
}

function extractFirstPanel(html: string, ids: string[]): string {
  for (const id of ids) {
    const panel = extractDivInnerHtmlById(html, id);
    if (panel) return panel;
  }
  return '';
}

function cleanCmsHtml(html: string, locale: Locale): string {
  let cleaned = html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<p\b[^>]*>\s*(?:&nbsp;|<br\s*\/?\s*>|\s)*<\/p>/gi, '');

  if (locale === 'en') {
    cleaned = cleaned.replace(
      /IV\.\s*CHIẾN LƯỢC ĐẢM BẢO CHẤT LƯỢNG/gi,
      'IV. QUALITY ASSURANCE STRATEGY',
    );
    cleaned = cleaned.replace(
      /<p\b[^>]*>\s*Không tìm thấy danh mục tổ chức\.\s*<\/p>/gi,
      '',
    );
  }

  return sanitizeCmsHtml(cleaned.trim());
}

function firstImageUrl(html: string): string {
  return html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? '';
}

export async function getMissionStrategyContent(
  locale: Locale,
): Promise<MissionStrategyContent | null> {
  const page = await getPageById(MISSION_PAGE_IDS[locale], locale);
  if (!page) return null;

  const html = page.content.rendered;
  const overviewHtml = extractFirstPanel(
    html,
    locale === 'en'
      ? ['tab_mission---vision---core-values']
      : ['tab_sứ-mạng---tầm-nhìn---giá-trị-cốt-lõi', 'tab_su-mang---tam-nhin---gia-tri-cot-loi'],
  );
  const strategyHtml = extractFirstPanel(
    html,
    locale === 'en'
      ? ['tab_development-strategy']
      : ['tab_chiến-lược-phát-triển', 'tab_chien-luoc-phat-trien'],
  );

  if (!overviewHtml || !strategyHtml) return null;

  const isEn = locale === 'en';
  return {
    pageTitle: stripHtml(page.title.rendered),
    heroTitle: isEn
      ? 'Vision – Mission – Development Strategy'
      : 'Tầm nhìn – Sứ mạng – Chiến lược phát triển',
    heroImageUrl: firstImageUrl(html) || DEFAULT_MISSION_HERO,
    overviewLabel: isEn ? 'Mission – Vision – Core Values' : 'Sứ mạng – Tầm nhìn – Giá trị cốt lõi',
    strategyLabel: isEn ? 'Development Strategy' : 'Chiến lược phát triển',
    overviewHtml: cleanCmsHtml(overviewHtml, locale),
    strategyHtml: cleanCmsHtml(strategyHtml, locale),
  };
}

export async function getOrganizationStaticSections(
  locale: Locale,
): Promise<OrganizationStaticSections> {
  const page = await getPageById(ORGANIZATION_PAGE_IDS[locale], locale);
  if (!page) {
    return {
      trainingHtml: '',
      administrativeHtml: '',
      scienceHtml: '',
    };
  }

  const html = page.content.rendered;
  const trainingHtml = extractFirstPanel(html, [
    'tab_cac-khoa-trung-tam',
    'cac-khoa-trung-tam',
  ]);
  const administrativeHtml = extractFirstPanel(
    html,
    locale === 'en'
      ? ['tab_departments---centers']
      : ['tab_các-phòng---trung-tâm', 'tab_cac-phong---trung-tam'],
  );
  const scienceHtml = extractFirstPanel(html, [
    'tab_cac_don_vi_khcn',
    'tab_các_đơn_vị_khcn',
  ]);

  return {
    trainingHtml: cleanCmsHtml(trainingHtml, locale),
    administrativeHtml: cleanCmsHtml(administrativeHtml, locale),
    scienceHtml: cleanCmsHtml(scienceHtml, locale),
  };
}
