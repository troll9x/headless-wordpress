import type { Locale } from '@/types/ngon-ngu';

const dictionaries = {
  vi: {
    nav: {
      home: 'Trang chủ',
      news: 'Tin tức',
      about: 'Giới thiệu',
      admission: 'Tuyển sinh',
      training: 'Đào tạo',
      research: 'Nghiên cứu',
      cooperation: 'Hợp tác',
    },
    common: {
      viewAll: 'Xem tất cả',
      backToNews: 'Quay lại Tin tức',
      readMore: 'Đọc thêm',
      noContent: 'Chưa có nội dung.',
      home: 'Trang chủ',
      news: 'Tin tức',
      notFound: 'Không tìm thấy bài viết',
    },
    sections: {
      news: 'Tin Tức',
      announcements: 'Thông Báo',
      events: 'Sự Kiện',
      stats: 'Những Con Số Ấn Tượng',
      cooperation: 'Hợp Tác Quốc Tế',
      research: 'Nghiên Cứu',
      community: 'Vì Cộng Đồng',
      moments: 'Khoảnh Khắc TLU',
      trainingUnits: 'Các Đơn Vị Đào Tạo',
      partners: 'Đối Tác & Liên Kết',
    },
  },
  en: {
    nav: {
      home: 'Home',
      news: 'News',
      about: 'About',
      admission: 'Admission',
      training: 'Education',
      research: 'Research',
      cooperation: 'Cooperation',
    },
    common: {
      viewAll: 'View all',
      backToNews: 'Back to News',
      readMore: 'Read more',
      noContent: 'No content yet.',
      home: 'Home',
      news: 'News',
      notFound: 'Article not found',
    },
    sections: {
      news: 'News',
      announcements: 'Announcements',
      events: 'Events',
      stats: 'Key Figures',
      cooperation: 'International Cooperation',
      research: 'Research',
      community: 'Community',
      moments: 'TLU Moments',
      trainingUnits: 'Training Units',
      partners: 'Partners & Networks',
    },
  },
} as const;

export type Dictionary = typeof dictionaries.vi;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as unknown as Dictionary;
}
