import 'server-only';

import { CACHE_TAGS, REVALIDATE_POSTS } from '@/constants/api';
import { WP_API_URL } from '@/config/env/server';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPage, WPPost } from '@/types/wordpress';
import { buildWordPressRestUrl } from '@/lib/wordpress/url';

export interface HomepageContentSnapshot {
  heroPage: WPPage | null;
  announcements: WPPost[];
  news: WPPost[];
  events: WPPost[];
  admissionsPage: WPPage | null;
  featurePosts: {
    training: WPPost | null;
    students: WPPost | null;
    alumni: WPPost | null;
  };
  partners: WPPost[];
  cooperation: WPPost[];
  research: WPPost[];
  community: WPPost[];
  moments: WPPost[];
}

/** The plugin Response::success() returns the payload directly, without an envelope. */
interface HomepageSnapshotResponse {
  schema?: number;
  lang?: string;
  data?: HomepageContentSnapshot;
}

/**
 * Fetch all core homepage content in one request from the Headless API.
 * A missing endpoint keeps compatibility with the currently installed CMS plugin.
 */
export async function getHomepageContentSnapshot(
  locale: Locale,
): Promise<HomepageContentSnapshot | null> {
  const url = buildWordPressRestUrl(WP_API_URL, '/headless/v1/homepage', { lang: locale });
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: REVALIDATE_POSTS,
      tags: [CACHE_TAGS.POSTS, CACHE_TAGS.CATEGORIES, CACHE_TAGS.PAGES, `homepage-${locale}`],
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Homepage snapshot API returned ${response.status}.`);
  }

  const payload = await response.json() as HomepageSnapshotResponse;
  const snapshot = payload.data;
  if (
    payload.schema !== 1
    || payload.lang !== locale
    || !snapshot
    || !Array.isArray(snapshot.news)
    || !Array.isArray(snapshot.announcements)
    || !Array.isArray(snapshot.events)
  ) {
    throw new Error('Homepage snapshot API returned an invalid schema or locale.');
  }

  return snapshot;
}
