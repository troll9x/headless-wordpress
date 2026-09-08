import { WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { getPageById } from '@/lib/wordpress/pages';
import { wpFetch } from '@/lib/wordpress/client';
import { stripHtml } from '@/lib/utils/html';
import type { HeadlessMedia } from '@/lib/wordpress/media-gallery';
import type { Locale } from '@/types/ngon-ngu';

export interface OrganizationCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  parent: number;
  count: number;
  link: string;
}

export interface OrganizationMember {
  id: number;
  slug: string;
  name: string;
  position: string;
  description: string;
  priority: number | null;
  link: string;
  avatar: HeadlessMedia;
  initial: string;
}

export interface OrganizationData {
  source: string;
  post_type: 'to-chuc';
  taxonomy: 'danh-muc-to-chuc';
  lang: string;
  category: OrganizationCategory;
  leader: OrganizationMember | null;
  members: OrganizationMember[];
  total: number;
  member_count: number;
}

export interface OrganizationMemberDetails {
  source: string;
  post_type: 'to-chuc';
  id: number;
  slug: string;
  name: string;
  title: string;
  primary_position: string;
  secondary_position: string;
  positions: { type: 'primary' | 'secondary'; value: string }[];
  birth_year: string;
  hometown: string;
  qualification: string;
  avatar: HeadlessMedia;
  initial: string;
  work_history: { index: number; side: 'left' | 'right'; date: string; description: string }[];
  biography: string;
  link: string;
  date: string;
  modified: string;
  categories: OrganizationCategory[];
  lang: string;
  translations: unknown[] | Record<string, unknown>;
}

const EMPTY_MEDIA: HeadlessMedia = {
  id: null,
  url: '',
  alt: '',
  title: '',
  caption: '',
  description: '',
  width: null,
  height: null,
  mime_type: '',
  sizes: { thumbnail: '', medium: '', large: '', full: '' },
};

function localPath(url: string): string {
  try {
    return new URL(url, WP_SITE_URL).pathname.replace(/\/$/, '') || '/';
  } catch {
    return url;
  }
}

async function fetchOrganization<T>(pathname: string, tag: string): Promise<T | null> {
  try {
    const response = await fetch(new URL(pathname, WP_SITE_URL), {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, tag] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function readImage(block: string, name: string): HeadlessMedia {
  const tag = block.match(/<img\b[^>]*>/i)?.[0] ?? '';
  const url = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? '';
  const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? name;
  return url
    ? { ...EMPTY_MEDIA, url, alt, title: name, sizes: { thumbnail: url, medium: url, large: url, full: url } }
    : EMPTY_MEDIA;
}

function parseMember(block: string, isLeader: boolean, index: number): OrganizationMember | null {
  const linkMatch = isLeader
    ? block.match(/<a\b[^>]*href=["']([^"']+)["']/i)
    : block.match(/onclick=["'][^"']*href=['"]([^'"]+)['"]/i);
  const nameHtml = isLeader
    ? block.match(/class=["'][^"']*leader-name[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1]
    : block.match(/class=["'][^"']*member-name[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1];
  const positionHtml = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '';
  const name = stripHtml(nameHtml ?? '');
  if (!name) return null;
  const link = localPath(linkMatch?.[1] ?? '#');
  const slug = link.split('/').filter(Boolean).at(-1) ?? `member-${index}`;
  return {
    id: index,
    slug,
    name,
    position: stripHtml(positionHtml),
    description: '',
    priority: index + 1,
    link,
    avatar: readImage(block, name),
    initial: name.charAt(0).toLocaleUpperCase('vi'),
  };
}

function parseLegacyOrganization(html: string, slug: string, locale: Locale): OrganizationData | null {
  const marker = `data-category="${slug}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const nextPanel = html.indexOf('class="panel ', start + marker.length);
  const segment = html.slice(start, nextPanel > start ? nextPanel : Math.min(html.length, start + 30_000));
  const leaderBlock = segment.match(/<div\b[^>]*class=["'][^"']*leader-card[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[0] ?? '';
  const leader = leaderBlock ? parseMember(leaderBlock, true, 1) : null;
  const members: OrganizationMember[] = [];
  const memberPattern = /<div\b[^>]*class=["'][^"']*member-card[^"']*["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*(?:member-card|modal-overlay)|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = memberPattern.exec(segment)) !== null) {
    const member = parseMember(match[0], false, members.length + 2);
    if (member) members.push(member);
  }

  if (!leader && members.length === 0) return null;
  const labels: Record<string, string> = {
    'dang-uy': locale === 'en' ? 'Party Committee' : 'Đảng ủy Trường',
    'ban-giam-hieu': locale === 'en' ? 'Presidential Board' : 'Ban Giám hiệu',
    'hoi-dong-truong': locale === 'en' ? "University's Council" : 'Hội đồng Trường',
    'party-committee': 'Party Committee',
    'presidential-board': 'Presidential Board',
    'universitys-council': "University's Council",
  };
  return {
    source: 'wordpress-page-fallback',
    post_type: 'to-chuc',
    taxonomy: 'danh-muc-to-chuc',
    lang: locale,
    category: { id: 0, slug, name: labels[slug] || slug, description: '', parent: 0, count: members.length + Number(Boolean(leader)), link: '' },
    leader,
    members,
    total: members.length + Number(Boolean(leader)),
    member_count: members.length,
  };
}

export async function getOrganization(slug: string, locale: Locale): Promise<OrganizationData | null> {
  const query = new URLSearchParams({ lang: locale });
  const data = await fetchOrganization<OrganizationData>(
    `/wp-json/headless/v1/organizations/${encodeURIComponent(slug)}?${query}`,
    `organization-${slug}-${locale}`,
  );
  if (data) return {
    ...data,
    leader: data.leader ? { ...data.leader, link: localPath(data.leader.link) } : null,
    members: data.members.map((member) => ({ ...member, link: localPath(member.link) })),
  };

  const pageId = locale === 'en' ? 49_736 : 284;
  const page = await getPageById(pageId, locale).catch(() => null);
  return page ? parseLegacyOrganization(page.content.rendered, slug, locale) : null;
}

export async function getOrganizationMember(
  slug: string,
  locale: Locale,
): Promise<OrganizationMemberDetails | null> {
  const query = new URLSearchParams({ lang: locale });
  const data = await fetchOrganization<OrganizationMemberDetails>(
    `/wp-json/headless/v1/organizations/members/${encodeURIComponent(slug)}?${query}`,
    `organization-member-${slug}-${locale}`,
  );
  if (data) return data;

  interface CoreMember {
    id: number;
    slug: string;
    title: { rendered: string };
    content: { rendered: string };
    excerpt?: { rendered: string };
    link: string;
    date: string;
    modified: string;
    _embedded?: { 'wp:featuredmedia'?: { source_url?: string; alt_text?: string }[] };
  }

  const members = await wpFetch<CoreMember[]>('/to-chuc', {
    params: { slug, _embed: 1, lang: locale },
    revalidate: REVALIDATE_POSTS,
    tags: [CACHE_TAGS.POSTS, `organization-member-core-${slug}-${locale}`],
  }).catch(() => []);
  const member = members[0];
  if (!member) return null;
  const name = stripHtml(member.title.rendered);
  const image = member._embedded?.['wp:featuredmedia']?.[0];
  const avatar = image?.source_url
    ? {
        ...EMPTY_MEDIA,
        url: image.source_url,
        alt: image.alt_text || name,
        title: name,
        sizes: { thumbnail: image.source_url, medium: image.source_url, large: image.source_url, full: image.source_url },
      }
    : EMPTY_MEDIA;

  return {
    source: 'wordpress-core-fallback',
    post_type: 'to-chuc',
    id: member.id,
    slug: member.slug,
    name,
    title: name,
    primary_position: '',
    secondary_position: '',
    positions: [],
    birth_year: '',
    hometown: '',
    qualification: '',
    avatar,
    initial: name.charAt(0).toLocaleUpperCase('vi'),
    work_history: [],
    biography: member.content.rendered,
    link: localPath(member.link),
    date: member.date,
    modified: member.modified,
    categories: [],
    lang: locale,
    translations: {},
  };
}
