'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import SectionTitle from '@/components/ui/SectionTitle';
import { buildPostUrl } from '@/constants/duong-dan';
import { NEXT_PUBLIC_WP_BASE_URL } from '@/config/env/public';
import { featuredSliderStyles as styles, miscTemplateStyles } from '@/styles/tlu-template-recipes';
import { formatDateShort } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPCategory, WPMedia, WPPost } from '@/types/wordpress';

interface KhuVucTinTucProps {
  posts: WPPost[];
  locale: Locale;
}

type PriorityLabel = 'hot' | 'new' | null;

interface PriorityData {
  label: PriorityLabel;
  order: number | null;
  expireDate: string | null;
}

const POSTS_COUNT = 6;
const NORMAL_DELAY = 3_000;
const HOT_DELAY = 7_000;

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

function getFirstCategory(post: WPPost): WPCategory | null {
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  const category = terms.find(
    (term): term is WPCategory => !('code' in term) && term.taxonomy === 'category',
  );
  return category ?? null;
}

function readPriorityValue(post: WPPost, ...keys: string[]): unknown {
  const root = post as WPPost & Record<string, unknown>;
  for (const source of [root, post.meta, post.acf]) {
    for (const key of keys) {
      if (source?.[key] !== undefined && source[key] !== null && source[key] !== '') {
        return source[key];
      }
    }
  }
  return undefined;
}

function getPriorityData(post: WPPost): PriorityData {
  const rawLabel = String(
    readPriorityValue(post, 'post_priority_label', '_priority_label') ?? '',
  ).toLowerCase();
  const rawOrder = readPriorityValue(post, 'post_priority_order', '_priority_order');
  const order = Number(rawOrder);
  const rawExpireDate = readPriorityValue(
    post,
    'post_priority_expire_date',
    '_priority_expire',
  );

  return {
    label: rawLabel === 'hot' || rawLabel === 'new' ? rawLabel : null,
    order: Number.isFinite(order) && order > 0 ? order : null,
    expireDate: rawExpireDate ? String(rawExpireDate) : null,
  };
}

function normalizePriorityDate(value: string): string | null {
  const trimmed = value.trim();
  let match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}${match[2]}${match[3]}`;

  match = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return `${match[1]}${match[2]}${match[3]}`;

  match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}${match[2]}${match[1]}`;

  if (/^\d{10,13}$/.test(trimmed)) {
    const timestamp = Number(trimmed) * (trimmed.length === 10 ? 1_000 : 1);
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('');
    }
  }

  return null;
}

function isPriorityActive(post: WPPost): boolean {
  const { expireDate } = getPriorityData(post);
  if (!expireDate) return true;

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');

  const normalizedExpireDate = normalizePriorityDate(expireDate);
  return normalizedExpireDate ? normalizedExpireDate >= localToday : true;
}

function selectPriorityPosts(posts: WPPost[]) {
  const featured =
    posts.find((post) => {
      const priority = getPriorityData(post);
      return priority.label !== null && priority.order === 1 && isPriorityActive(post);
    }) ?? posts[0];

  if (!featured) return { featured: null, sidePosts: [] as WPPost[] };

  const usedIds = new Set([featured.id]);
  const sidePosts = posts
    .filter((post) => {
      const priority = getPriorityData(post);
      return (
        !usedIds.has(post.id) &&
        priority.label !== null &&
        (priority.order === 2 || priority.order === 3) &&
        isPriorityActive(post)
      );
    })
    .sort((left, right) => {
      const orderDifference =
        (getPriorityData(left).order ?? Number.MAX_SAFE_INTEGER) -
        (getPriorityData(right).order ?? Number.MAX_SAFE_INTEGER);
      return orderDifference || Date.parse(right.date) - Date.parse(left.date);
    });

  sidePosts.forEach((post) => usedIds.add(post.id));

  for (const post of posts) {
    if (sidePosts.length >= POSTS_COUNT) break;
    if (usedIds.has(post.id)) continue;
    sidePosts.push(post);
    usedIds.add(post.id);
  }

  return { featured, sidePosts: sidePosts.slice(0, POSTS_COUNT) };
}

function chunkPosts(posts: WPPost[]): WPPost[][] {
  const groups: WPPost[][] = [];
  for (let index = 0; index < posts.length; index += 2) {
    groups.push(posts.slice(index, index + 2));
  }
  return groups;
}

function getSlideDelay(posts: WPPost[]): number {
  const hasSidePriority = posts.some((post) => {
    const priority = getPriorityData(post);
    return (
      priority.label !== null &&
      (priority.order === 2 || priority.order === 3) &&
      isPriorityActive(post)
    );
  });
  return hasSidePriority ? HOT_DELAY : NORMAL_DELAY;
}

function getPostHref(post: WPPost, locale: Locale): string {
  return buildPostUrl(post.slug, locale, post.link);
}

function trimWords(value: string, limit: number): string {
  const words = stripHtml(value).trim().split(/\s+/).filter(Boolean);
  return words.length > limit ? `${words.slice(0, limit).join(' ')}…` : words.join(' ');
}

function PriorityIcon({ post }: { post: WPPost }) {
  const label = getPriorityData(post).label;
  if (!label) return null;

  if (label === 'new') {
    return (
      <span className="ml-[5px] inline-flex rounded bg-rose-600 px-1.5 py-0.5 align-middle text-[10px] font-bold leading-none tracking-wide text-white">
        NEW
      </span>
    );
  }

  const src = `${NEXT_PUBLIC_WP_BASE_URL.replace(/\/+$/, '')}/wp-content/uploads/2025/07/${label}.gif`;

  return (
    // The source follows the configured WordPress host, which can vary by environment.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Hot"
      className={miscTemplateStyles.priorityIcon}
      loading="lazy"
    />
  );
}

function CategoryName({ post }: { post: WPPost }) {
  const category = getFirstCategory(post);
  if (!category) return null;
  return <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#007cba]">{stripHtml(category.name)}</span>;
}

function FeaturedPost({ post, locale, mobile = false }: { post: WPPost; locale: Locale; mobile?: boolean }) {
  const image = getFeaturedImage(post);
  const href = getPostHref(post, locale);

  return (
    <article className={mobile ? styles.mobileMainCard : styles.featuredCard}>
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className={mobile ? styles.mobileMainImage : styles.featuredImage}
      >
        {image ? (
          <Image
            src={image.source_url}
            alt={image.alt_text || ''}
            fill
            priority
            unoptimized
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes={mobile ? '100vw' : '(max-width: 1024px) 100vw, 45vw'}
          />
        ) : (
          <span className="block h-full w-full bg-gradient-to-br from-blue-50 to-slate-100" />
        )}
      </Link>
      <div className={mobile ? styles.mobileMainContent : styles.featuredContent}>
        <CategoryName post={post} />
        <h3 className={mobile ? styles.mobileMainTitle : styles.featuredTitle}>
          <Link href={href} className={mobile ? styles.mobileMainTitleLink : styles.featuredTitleLink}>
            <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
            <PriorityIcon post={post} />
          </Link>
        </h3>
        {post.excerpt.rendered && (
          <p className={mobile ? styles.mobileMainExcerpt : styles.featuredExcerpt}>
            {trimWords(post.excerpt.rendered, mobile ? 10 : 20)}
          </p>
        )}
        <time dateTime={post.date} className={mobile ? styles.mobileMainMeta : styles.featuredMeta}>
          {formatDateShort(post.date, locale)}
        </time>
      </div>
    </article>
  );
}

function SlidePost({ post, locale, mobile = false }: { post: WPPost; locale: Locale; mobile?: boolean }) {
  const image = getFeaturedImage(post);
  const href = getPostHref(post, locale);

  return (
    <article className={mobile ? styles.mobileSlidePost : styles.slidePost}>
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className={mobile ? styles.mobileSlideImage : styles.slideImage}
      >
        {image ? (
          <Image
            src={image.source_url}
            alt={image.alt_text || ''}
            fill
            unoptimized
            className="object-cover"
            sizes={mobile ? '90px' : '(max-width: 1024px) 100vw, 22vw'}
          />
        ) : (
          <span className="block h-full w-full bg-gradient-to-br from-blue-50 to-slate-100" />
        )}
      </Link>
      <div className={mobile ? `${styles.mobileSlideContent} p-2` : styles.slideContent}>
        <CategoryName post={post} />
        <h3 className={mobile ? styles.mobileSlideTitle : styles.slideTitle}>
          <Link href={href} className={mobile ? styles.mobileSlideTitleLink : styles.slideTitleLink}>
            <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
            <PriorityIcon post={post} />
          </Link>
        </h3>
        <time dateTime={post.date} className={styles.slideMeta}>
          {formatDateShort(post.date, locale)}
        </time>
      </div>
    </article>
  );
}

function Slider({ groups, locale, mobile = false }: { groups: WPPost[][]; locale: Locale; mobile?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentIndex = groups.length > 0 ? activeIndex % groups.length : 0;

  useEffect(() => {
    if (paused || groups.length <= 1) return;
    const timer = window.setTimeout(
      () => setActiveIndex((current) => (current + 1) % groups.length),
      getSlideDelay(groups[currentIndex] ?? []),
    );
    return () => window.clearTimeout(timer);
  }, [currentIndex, groups, paused]);

  if (groups.length === 0) return null;

  const show = (index: number) => setActiveIndex((index + groups.length) % groups.length);
  const wrapperClass = mobile ? styles.mobileSlidesWrapper : styles.slidesWrapper;
  const slideClass = mobile ? styles.mobileSlide : styles.slide;
  const activeClass = styles.activeSlide;

  return (
    <div
      className={mobile ? `${styles.mobileSlidesContainer} group/slider` : `${styles.slidesContainer} group/slider`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={wrapperClass} aria-live="polite">
        {groups.map((group, index) => (
          <div
            key={group.map((post) => post.id).join('-')}
            className={`${slideClass} ${
              index === currentIndex ? activeClass : 'invisible pointer-events-none'
            }`}
            aria-hidden={index !== currentIndex}
          >
            {group.map((post) => (
              <SlidePost key={post.id} post={post} locale={locale} mobile={mobile} />
            ))}
          </div>
        ))}
      </div>

      {groups.length > 1 && (
        <>
          <div className={mobile ? styles.mobileNavigation : styles.navigation}>
            <button
              type="button"
              className={mobile ? styles.mobileNavigationButton : styles.navigationButton}
              onClick={() => show(currentIndex - 1)}
              aria-label={locale === 'en' ? 'Previous news' : 'Tin trước'}
            >
              ‹
            </button>
            <button
              type="button"
              className={mobile ? styles.mobileNavigationButton : styles.navigationButton}
              onClick={() => show(currentIndex + 1)}
              aria-label={locale === 'en' ? 'Next news' : 'Tin tiếp theo'}
            >
              ›
            </button>
          </div>
          <div className={mobile ? styles.mobileDots : styles.dots}>
            {groups.map((group, index) => (
              <button
                key={group[0]?.id ?? index}
                type="button"
                className={`${mobile ? styles.mobileDot : styles.dot} ${
                  index === currentIndex ? (mobile ? styles.activeMobileDot : styles.activeDot) : ''
                }`}
                onClick={() => show(index)}
                aria-label={`${locale === 'en' ? 'Show news group' : 'Hiện nhóm tin'} ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function KhuVucTinTuc({ posts, locale }: KhuVucTinTucProps) {
  const { featured, sidePosts } = useMemo(() => selectPriorityPosts(posts), [posts]);
  const groups = useMemo(() => chunkPosts(sidePosts), [sidePosts]);
  const sectionHref = locale === 'en' ? '/en/news' : '/tin-tuc-thong-bao';
  const sectionTitle = locale === 'en' ? 'News' : 'Tin Tức';

  if (!featured) {
    return (
      <div>
        <SectionTitle title={sectionTitle} href={sectionHref} />
        <p className="py-6 text-center text-sm text-slate-400">
          {locale === 'en' ? 'No news yet.' : 'Chưa có tin tức.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title={sectionTitle} href={sectionHref} />
      <div className={styles.root}>
        <div className={styles.desktop}>
          <FeaturedPost post={featured} locale={locale} />
          {groups.length > 0 && (
            <div className={`${styles.slides} group/slider`}>
              <Slider groups={groups} locale={locale} />
            </div>
          )}
        </div>

        <div className={styles.mobile}>
          <FeaturedPost post={featured} locale={locale} mobile />
          {groups.length > 0 && (
            <div className={styles.mobileSlides}>
              <Slider groups={groups} locale={locale} mobile />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
