import { WP_SITE_URL } from '@/config/env/server';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { getPostSummaries } from '@/lib/wordpress/posts';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export type PostPriorityLabel = 'hot' | 'new';

interface PostPrioritySelection {
  id: number | null;
  link: string;
  label: PostPriorityLabel;
  order: number;
  expireDate: string | null;
}

interface PriorityApiItem {
  id?: unknown;
  link?: unknown;
  url?: unknown;
  label?: unknown;
  order?: unknown;
  expire_date?: unknown;
  expireDate?: unknown;
}

interface PriorityApiResponse {
  items?: PriorityApiItem[];
}

function normalizePermalink(value: string): string {
  try {
    return decodeURIComponent(new URL(value, WP_SITE_URL).pathname)
      .replace(/\/+$/, '')
      .toLocaleLowerCase('en-US');
  } catch {
    return value.replace(/\/+$/, '').toLocaleLowerCase('en-US');
  }
}

function parsePostId(value: string): number | null {
  const match = normalizePermalink(value).match(/-(\d+)$/);
  if (!match) return null;

  const id = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function readAttribute(block: string, name: string): string {
  const match = block.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return (match?.[1] ?? '').replace(/&amp;/gi, '&');
}

function normalizeApiItems(data: PriorityApiResponse | PriorityApiItem[]): PostPrioritySelection[] {
  const items = Array.isArray(data) ? data : data.items ?? [];

  return items.flatMap((item, index) => {
    const rawLabel = String(item.label ?? '').toLowerCase();
    if (rawLabel !== 'hot' && rawLabel !== 'new') return [];

    const link = String(item.link ?? item.url ?? '');
    const rawId = Number(item.id);
    const rawOrder = Number(item.order);

    return [{
      id: Number.isSafeInteger(rawId) && rawId > 0 ? rawId : parsePostId(link),
      link,
      label: rawLabel,
      order: Number.isFinite(rawOrder) && rawOrder > 0 ? rawOrder : index + 1,
      expireDate: item.expire_date || item.expireDate
        ? String(item.expire_date ?? item.expireDate)
        : null,
    }];
  });
}

async function getPriorityApiSelection(locale: Locale): Promise<PostPrioritySelection[] | null> {
  const url = new URL('/wp-json/headless/v1/priority-posts', WP_SITE_URL);
  url.searchParams.set('lang', locale);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, `post-priority-${locale}`] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    return normalizeApiItems(await response.json() as PriorityApiResponse | PriorityApiItem[]);
  } catch {
    return null;
  }
}

/**
 * Read only the public HOT/NEW links rendered by the legacy homepage shortcode.
 * This keeps the new frontend working while the dedicated REST adapter is being deployed.
 */
export function parseLegacyPrioritySelection(html: string): PostPrioritySelection[] {
  const marker = html.search(/<div\b[^>]*class=["'][^"']*\bfeatured-slides-layout\b[^"']*["'][^>]*>/i);
  if (marker < 0) return [];

  const sectionEnd = html.indexOf('</section>', marker);
  const segment = html.slice(marker, sectionEnd > marker ? sectionEnd : marker + 150_000);
  const selections: PostPrioritySelection[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(segment)) !== null) {
    const labelMatch = match[2].match(/(?:^|\/)\s*(hot|new)\.gif(?:[?"'])/i);
    if (!labelMatch) continue;

    const link = readAttribute(match[1], 'href');
    const key = normalizePermalink(link);
    if (!link || seen.has(key)) continue;

    seen.add(key);
    selections.push({
      id: parsePostId(link),
      link,
      label: labelMatch[1].toLowerCase() as PostPriorityLabel,
      order: selections.length + 1,
      expireDate: null,
    });
  }

  return selections;
}

async function getLegacyPrioritySelection(locale: Locale): Promise<PostPrioritySelection[]> {
  const path = locale === 'en' ? '/en/' : '/';

  try {
    const response = await fetch(new URL(path, WP_SITE_URL), {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, `post-priority-legacy-${locale}`] },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? parseLegacyPrioritySelection(await response.text()) : [];
  } catch {
    return [];
  }
}

function matchesSelection(post: WPPost, selection: PostPrioritySelection): boolean {
  return selection.id === post.id || (
    Boolean(selection.link) && normalizePermalink(selection.link) === normalizePermalink(post.link)
  );
}

function applySelection(post: WPPost, selection: PostPrioritySelection): WPPost {
  return {
    ...post,
    post_priority_label: selection.label,
    post_priority_order: selection.order,
    post_priority_expire_date: selection.expireDate ?? '',
  };
}

/** Add the selected HOT/NEW posts and their display metadata to the normal news feed. */
export async function applyHomepagePostPriorities(
  posts: WPPost[],
  locale: Locale,
): Promise<WPPost[]> {
  const apiSelection = await getPriorityApiSelection(locale);
  const selections = apiSelection ?? await getLegacyPrioritySelection(locale);
  if (selections.length === 0) return posts;

  const currentIds = new Set(posts.map((post) => post.id));
  const missingIds = selections
    .map((selection) => selection.id)
    .filter((id): id is number => id !== null && !currentIds.has(id));
  const missingPosts = missingIds.length > 0
    ? await getPostSummaries({ include: missingIds.join(','), per_page: missingIds.length }, locale).catch(() => [])
    : [];
  const candidates = [...posts, ...missingPosts.filter((post) => !currentIds.has(post.id))];

  return candidates.map((post) => {
    const selection = selections.find((item) => matchesSelection(post, item));
    return selection ? applySelection(post, selection) : post;
  });
}
