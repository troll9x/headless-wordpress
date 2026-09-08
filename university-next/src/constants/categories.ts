export const CATEGORY_SLUGS = {
  ANNOUNCEMENTS: ['thong-bao', 'thong-bao-chung', 'announcements', 'notices'],
  // The original [hot_featured_posts] shortcode uses category="tin-tuc".
  // Its WP_Query tax_query includes descendants, so keep that category first.
  NEWS: ['tin-tuc', 'news', 'tin-tuc-chung', 'tin-tuc-thong-bao', 'tin-tuc-su-kien', 'bai-viet'],
  EVENTS: ['su-kien', 'hoat-dong', 'lich-su-kien', 'events'],
  ADMISSIONS: ['tuyen-sinh', 'admissions'],
  PARTNERS: ['doi-tac', 'hop-tac', 'lien-ket', 'partners'],
  COOPERATION: [
    'tin-tuc-doi-ngoai',
    'doi-ngoai',
    'hop-tac-quoc-te',
    'quoc-te',
    'external-relations',
    'ir-news',
    'international-cooperation',
    'international',
  ],
  RESEARCH: [
    'nghien-cuu',
    'khoa-hoc-cong-nghe',
    'research',
    'science-and-technology',
    'science-and-technology-activites',
    'science',
  ],
  COMMUNITY: ['vi-cong-dong', 'hoat-dong-xa-hoi', 'community', 'tin-tuc-chung'],
  MOMENTS: ['khoanhkhac', 'thu-vien-anh', 'moments', 'gallery', 'hinh-anh'],
  FEATURE_TRAINING: [
    'dao-tao',
    'education',
    'thong-tin-luan-an-ts',
    'cong-tac-dao-tao',
    'training-activities',
  ],
  FEATURE_STUDENTS: [
    'guong-mat-sinh-vien',
    'sinh-vien',
    'students',
    'student-activities',
  ],
  FEATURE_ALUMNI: ['cuu-sinh-vien', 'alumni'],
} as const;

/** Matches the WordPress `posts_per_page` setting used by the archive template. */
export const CATEGORY_POSTS_PER_PAGE = 10;

export const PAGE_SLUGS = {
  HERO: ['trang-chu', 'home', 'trang-home', 'homepage'],
  ADMISSIONS: ['tuyen-sinh', 'admissions', 'thong-tin-tuyen-sinh'],
} as const;

export const MENU_SLUGS = {
  QUICK_LINKS: ['quick-links', 'lien-ket-nhanh', 'tro-cap-nhanh', 'utility', 'quick-access'],
} as const;
