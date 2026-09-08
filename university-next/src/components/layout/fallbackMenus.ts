import type { Locale } from '@/types/ngon-ngu';
import type { WPMenuItemWithChildren } from '@/types/wordpress';
import { stripHtml } from '@/lib/utils/html';

interface MenuSpec {
  title: string;
  url: string;
  external?: boolean;
  children?: MenuSpec[];
}

const VIETNAMESE_MENU: MenuSpec[] = [
  {
    title: 'GIỚI THIỆU',
    url: '/gioi-thieu',
    children: [
      { title: 'Chiến lược phát triển', url: '/su-mang-muc-tieu-chien-luoc' },
      { title: 'Cơ cấu tổ chức', url: '/co-cau-to-chuc' },
      { title: 'Thông tin công khai', url: '/thong-tin-cong-khai' },
    ],
  },
  {
    title: 'TIN TỨC',
    url: '/tin-tuc-thong-bao',
    children: [
      { title: 'Hoạt động chung', url: '/tin-tuc' },
      { title: 'Tin hoạt động Đảng', url: '/tin-hoat-dong-dang' },
      { title: 'Công tác đào tạo', url: '/cong-tac-dao-tao' },
      { title: 'Khoa học công nghệ', url: '/tin-khoa-hoc-cong-nghe' },
      { title: 'Hợp tác quốc tế', url: '/tin-tuc-doi-ngoai' },
      { title: 'Công tác sinh viên', url: '/hoat-dong-sinh-vien' },
    ],
  },
  {
    title: 'TUYỂN SINH',
    url: 'https://ts.tlu.edu.vn/',
    external: true,
    children: [
      { title: 'Đại học', url: 'https://ts.tlu.edu.vn/Tuy%E1%BB%83n-sinh-%C4%90H', external: true },
      { title: 'Thạc sĩ', url: 'https://ts.tlu.edu.vn/tin-tuyen-sinh-thac-si', external: true },
      { title: 'Tiến sĩ', url: 'https://ts.tlu.edu.vn/tin-tuyen-tien-si', external: true },
    ],
  },
  {
    title: 'ĐÀO TẠO',
    url: '/dao-tao',
    children: [
      { title: 'Đại học', url: '/dai-hoc-chinh-quy' },
      { title: 'Thạc sĩ', url: '/thac-si' },
      { title: 'Tiến sĩ', url: '/tien-si' },
    ],
  },
  {
    title: 'NGHIÊN CỨU',
    url: '/nghien-cuu',
    children: [
      { title: 'Hoạt động KHCN', url: '/hoat-dong-khcn' },
      { title: 'Các đơn vị KHCN', url: '/co-cau-to-chuc' },
      { title: 'Tạp chí', url: 'https://tapchivatuyentap.tlu.edu.vn/', external: true },
      { title: 'Hội nghị hội thảo', url: '/hoi-nghi-hoi-thao' },
    ],
  },
  {
    title: 'HỢP TÁC QUỐC TẾ',
    url: '/doi-ngoai',
    children: [
      { title: 'Mạng lưới đối tác', url: '/doi-ngoai' },
      { title: 'Dự án', url: '/du-an-quoc-te' },
    ],
  },
  {
    title: 'SINH VIÊN',
    url: '/sinh-vien',
    children: [
      { title: 'Hỗ trợ sinh viên', url: '/ho-tro-sinh-vien' },
      { title: 'Học bổng', url: '/hoc-bong-sinh-vien' },
      { title: 'Học phí – chế độ chính sách', url: '/hoc-phi' },
      { title: 'Khảo sát sinh viên', url: '/khao-sat-sinh-vien' },
      { title: 'Công tác sinh hoạt lớp', url: '/cong-tac-sinh-hoat-lop' },
      { title: 'Cựu sinh viên', url: '/cuu-sinh-vien' },
    ],
  },
  {
    title: 'eTLU',
    url: '#',
    children: [
      { title: 'Công tác Đảng', url: '/cong-tac-dang' },
      { title: 'Giáo dục chính trị – tư tưởng', url: '/giao-duc-chinh-tri-tu-tuong' },
      { title: 'Văn bản', url: 'https://web18.tlu.edu.vn/Van-ban', external: true },
      { title: 'Cổng thông tin việc làm', url: 'https://job.tlu.edu.vn/', external: true },
      { title: 'Thư viện', url: 'https://lib.tlu.edu.vn/', external: true },
      { title: 'Trang hành chính', url: 'https://hanhchinh.tlu.edu.vn/', external: true },
      { title: 'Email cán bộ GV', url: 'https://outlook.office365.com/', external: true },
      { title: 'Trang đăng ký học của SV', url: 'https://sinhvien.tlu.edu.vn/', external: true },
      { title: 'TLU Tour', url: 'https://tour.tlu.edu.vn/', external: true },
      { title: 'Media', url: '/media' },
      { title: 'Vì cộng đồng', url: '/vi-cong-dong' },
      { title: 'Bầu cử đại biểu Quốc hội khoá XVI', url: '/bau-cu-dai-bieu-quoc-hoi-khoa-xvi' },
    ],
  },
];

const ENGLISH_MENU: MenuSpec[] = [
  {
    title: 'INTRODUCTION',
    url: '/en/introduction',
    children: [
      { title: 'Mission – Goals – Strategy', url: '/en/mission-goals-strategy' },
      { title: 'Organizational Structure', url: '/en/organizational-structure' },
      { title: 'Public Information', url: '/en/public-information' },
    ],
  },
  {
    title: 'NEWS AND EVENTS',
    url: '/en/news-and-events',
    children: [
      { title: 'News', url: '/en/news' },
      { title: 'Training Activities', url: '/en/training-activities' },
      { title: 'Science and Technology', url: '/en/science-and-technology' },
      { title: 'International Cooperation', url: '/en/ir-news' },
      { title: 'Student Activities', url: '/en/student-activities' },
    ],
  },
  {
    title: 'ADMISSIONS',
    url: 'https://ts.tlu.edu.vn/',
    external: true,
    children: [
      { title: 'Full-time Undergraduate Program', url: 'https://ts.tlu.edu.vn/Tuy%E1%BB%83n-sinh-%C4%90H', external: true },
      { title: 'Master’s Admissions', url: 'https://ts.tlu.edu.vn/tin-tuyen-sinh-thac-si', external: true },
      { title: 'Doctoral Admissions', url: 'https://ts.tlu.edu.vn/tin-tuyen-tien-si', external: true },
    ],
  },
  {
    title: 'EDUCATION',
    url: '/en/education',
    children: [
      { title: 'Undergraduate Programs', url: '/en/undergraduate-programs' },
      { title: 'Master’s Programs', url: '/en/masters-programs' },
      { title: 'Doctoral Programs', url: '/en/doctoral-programs' },
    ],
  },
  {
    title: 'RESEARCH',
    url: '/en/research',
    children: [
      { title: 'Science and Technology Activities', url: '/en/science-and-technology-activities' },
      { title: 'Science and Technology Units', url: '/en/organizational-structure' },
      { title: 'Journals', url: 'https://tapchivatuyentap.tlu.edu.vn/', external: true },
      { title: 'Conferences and Seminars', url: '/en/conferences-and-seminars' },
    ],
  },
  {
    title: 'INTERNATIONAL RELATIONS',
    url: '/en/external-relations',
    children: [
      { title: 'Partnership Network', url: '/en/external-relations' },
      { title: 'International Cooperation Projects', url: '/en/international-cooperation-projects' },
    ],
  },
  {
    title: 'STUDENTS',
    url: '/en/students',
    children: [
      { title: 'Student Support', url: '/en/student-support' },
      { title: 'Student Activities', url: '/en/student-activities' },
      { title: 'Scholarships', url: '/en/scholarships' },
      { title: 'Tuition', url: '/en/tuition' },
      { title: 'Student Survey', url: '/en/student-survey' },
      { title: 'Class Activities', url: '/en/class-activities' },
      { title: 'Alumni', url: '/en/alumni' },
    ],
  },
  {
    title: 'eTLU',
    url: '#',
    children: [
      { title: 'Job portal', url: 'https://job.tlu.edu.vn/', external: true },
      { title: 'Library', url: 'https://lib.tlu.edu.vn/', external: true },
      { title: 'TLU Tour', url: 'https://tour.tlu.edu.vn/', external: true },
      { title: 'Media', url: '/en/media' },
    ],
  },
];

function createItem(spec: MenuSpec, id: number, parent: number, menuOrder: number): WPMenuItemWithChildren {
  return {
    id,
    title: { rendered: spec.title },
    url: spec.url,
    description: '',
    type: 'custom',
    type_label: 'Custom Link',
    object: 'custom',
    object_id: 0,
    parent,
    menu_order: menuOrder,
    status: 'publish',
    target: spec.external ? '_blank' : '',
    attr_title: '',
    classes: [],
    xfn: [],
    menus: 0,
    children: [],
  };
}

function buildFallbackMenu(specs: MenuSpec[]): WPMenuItemWithChildren[] {
  let nextId = 1;

  const buildLevel = (items: MenuSpec[], parent = 0): WPMenuItemWithChildren[] =>
    items.map((spec, index) => {
      const id = nextId++;
      const item = createItem(spec, id, parent, index + 1);
      item.children = buildLevel(spec.children ?? [], id);
      return item;
    });

  return buildLevel(specs);
}

export function getFallbackPrimaryMenu(locale: Locale): WPMenuItemWithChildren[] {
  return buildFallbackMenu(locale === 'en' ? ENGLISH_MENU : VIETNAMESE_MENU);
}

function menuKey(item: WPMenuItemWithChildren) {
  return stripHtml(item.title.rendered).replace(/\s+/g, ' ').trim().toLocaleUpperCase('vi');
}

function collectDescendantKeys(items: WPMenuItemWithChildren[], keys = new Set<string>()) {
  for (const item of items) {
    keys.add(menuKey(item));
    collectDescendantKeys(item.children, keys);
  }
  return keys;
}

/**
 * Preserve WordPress URLs and labels while filling gaps from the audited menu.
 * This also removes API-orphaned children that were incorrectly promoted to root.
 */
export function mergeMenuWithFallback(
  apiItems: WPMenuItemWithChildren[],
  fallbackItems: WPMenuItemWithChildren[],
): WPMenuItemWithChildren[] {
  const apiByKey = new Map(apiItems.map((item) => [menuKey(item), item]));
  const fallbackRootKeys = new Set(fallbackItems.map(menuKey));
  const fallbackDescendantKeys = collectDescendantKeys(
    fallbackItems.flatMap((item) => item.children),
  );

  const merged = fallbackItems.map((fallbackItem) => {
    const apiItem = apiByKey.get(menuKey(fallbackItem));
    if (!apiItem) return fallbackItem;

    return {
      ...apiItem,
      children: mergeMenuWithFallback(apiItem.children, fallbackItem.children),
    };
  });

  for (const apiItem of apiItems) {
    const key = menuKey(apiItem);
    if (!fallbackRootKeys.has(key) && !fallbackDescendantKeys.has(key)) merged.push(apiItem);
  }

  return merged;
}
