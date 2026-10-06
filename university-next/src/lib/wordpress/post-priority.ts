import { WP_API_URL, WP_SITE_URL } from '@/config/env/server';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';
import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { getPostSummaries } from '@/lib/wordpress/posts';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export type PostPriorityLabel = 'hot' | 'new';

// The homepage starts many CMS requests together; leave enough time for this
// small priority response without exceeding the homepage's 30-second budget.
const PRIORITY_ADAPTER_TIMEOUT_MS = 12_000;

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
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/priority-posts', {
    lang: locale,
  });

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_POSTS, tags: [CACHE_TAGS.POSTS, `post-priority-${locale}`] },
      signal: AbortSignal.timeout(PRIORITY_ADAPTER_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    return normalizeApiItems(await response.json() as PriorityApiResponse | PriorityApiItem[]);
  } catch {
    return null;
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
  posts: WPPost[] | Promise<WPPost[]>,
  locale: Locale,
): Promise<WPPost[]> {
  // Category discovery and the priority API are independent.
  const [resolvedPosts, apiSelection] = await Promise.all([
    posts,
    getPriorityApiSelection(locale),
  ]);
  // Keep the ordinary news feed when the optional priority API is unavailable.
  const selections = apiSelection ?? [];
  if (selections.length === 0) return resolvedPosts;

  const currentIds = new Set(resolvedPosts.map((post) => post.id));
  const missingIds = selections
    .map((selection) => selection.id)
    .filter((id): id is number => id !== null && !currentIds.has(id));
  const missingPosts = missingIds.length > 0
    ? await getPostSummaries({ include: missingIds.join(','), per_page: missingIds.length }, locale).catch(() => [])
    : [];
  const candidates = [
    ...resolvedPosts,
    ...missingPosts.filter((post) => !currentIds.has(post.id)),
  ];

  return candidates.map((post) => {
    const selection = selections.find((item) => matchesSelection(post, item));
    return selection ? applySelection(post, selection) : post;
  });
}
