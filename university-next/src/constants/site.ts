/** Non-navigation site configuration. Update these values to match the institution. */
export const UNIVERSITY = {
  shortName: 'TLU',
  fullName: 'Trường Đại học Thủy lợi',
  tagline: 'Khoa học – Thực tiễn – Sáng tạo',
  slogan: 'KHƠI NGUỒN – TRÍ TUỆ – TỎA SÁNG',
  values: ['Đoàn kết', 'Hội nhập', 'Tiên phong', 'Lan tỏa'],
  address: '175 Tây Sơn, Đống Đa, Hà Nội',
  phone: '+84 (24) 3563 7111',
  email: 'dhthuyloivn@tlu.edu.vn',
  fax: '+84 (24) 8522 7757',
} as const;

export const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' as const },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' as const },
  { label: 'Twitter / X', href: 'https://x.com', icon: 'twitter' as const },
] as const;

export type SocialIcon = (typeof SOCIAL_LINKS)[number]['icon'];

/**
 * University statistics — used as fallback when WordPress ACF fields are not configured.
 * To override: WordPress admin → ACF → Homepage page → `statistics` repeater field
 * with subfields `value` and `label`.
 */
export const SITE_STATS = [
  { value: '24.000+', label: 'Người học' },
  { value: '500+', label: 'Giảng viên & Nghiên cứu viên' },
  { value: '95%', label: 'Sinh viên có việc làm' },
  { value: '75', label: 'Ngành đào tạo' },
  { value: '60%', label: 'Giảng viên trình độ tiến sĩ' },
] as const;
