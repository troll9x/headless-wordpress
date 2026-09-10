'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import SectionTitle from '@/components/ui/SectionTitle';
import { buildPostUrl } from '@/constants/duong-dan';
import { formatEventDate, toISODate } from '@/lib/utils/date';
import { stripHtml } from '@/lib/utils/html';
import type { Locale } from '@/types/ngon-ngu';
import type { WPCategory, WPPost, WPMedia } from '@/types/wordpress';

interface KhuVucSuKienProps {
  posts: WPPost[];
  locale: Locale;
}

interface ScheduledEvent {
  post: WPPost;
  startAt: Date;
  endAt: Date | null;
  isHot: boolean;
  isOngoing: boolean;
  isPast: boolean;
  priorityOrder: number;
}

const AUTOPLAY_DELAY = 4_500;
const SWIPE_THRESHOLD = 45;
const FALLBACK_CARD_LIMIT = 8;
const SCHEDULED_LAYOUT_LIMIT = 4;

function getFeaturedImage(post: WPPost): WPMedia | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media || 'code' in media) return null;
  return media as WPMedia;
}

function getFirstCategory(post: WPPost): WPCategory | null {
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  return terms.find(
    (term): term is WPCategory => !('code' in term) && term.taxonomy === 'category',
  ) ?? null;
}

function readPostValue(post: WPPost, ...keys: string[]): unknown {
  const root = post as WPPost & Record<string, unknown>;
  for (const key of keys) {
    const value = root[key] ?? post.acf?.[key] ?? post.meta?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function parseEventDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    );
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isHotPriorityActive(post: WPPost, today: Date): boolean {
  const label = String(
    readPostValue(post, '_priority_label', 'post_priority_label') ?? '',
  ).toLowerCase();
  if (label !== 'hot') return false;

  const expireAt = parseEventDate(
    readPostValue(post, '_priority_expire', 'post_priority_expire_date'),
  );
  return Boolean(expireAt && startOfDay(expireAt).getTime() > today.getTime());
}

function getPriorityOrder(post: WPPost): number {
  const parsed = Number(
    readPostValue(post, '_priority_order', 'post_priority_order'),
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.MAX_SAFE_INTEGER;
}

function selectScheduledEvents(posts: WPPost[], now: Date): ScheduledEvent[] {
  const today = startOfDay(now);

  return posts
    .flatMap((post): ScheduledEvent[] => {
      const startAt = parseEventDate(
        readPostValue(post, 'ngay_bat_dau_su_kien'),
      );
      if (!startAt) return [];

      const endAt = parseEventDate(
        readPostValue(post, 'thoi_gian_ket_thuc'),
      );
      const isOngoing = startAt.getTime() <= now.getTime()
        && Boolean(endAt && endAt.getTime() >= now.getTime());
      const isUpcoming = startOfDay(startAt).getTime() >= today.getTime()
        && (!endAt || endAt.getTime() >= now.getTime());

      if (!isOngoing && !isUpcoming) return [];

      return [{
        post,
        startAt,
        endAt,
        isHot: isHotPriorityActive(post, today),
        isOngoing,
        isPast: false,
        priorityOrder: getPriorityOrder(post),
      }];
    })
    .sort((left, right) => {
      if (left.isOngoing !== right.isOngoing) return left.isOngoing ? -1 : 1;
      if (left.isHot !== right.isHot) return left.isHot ? -1 : 1;
      const priorityDifference = left.priorityOrder - right.priorityOrder;
      return priorityDifference || left.startAt.getTime() - right.startAt.getTime();
    });
}

function selectPastEvents(
  posts: WPPost[],
  now: Date,
  excludedIds: Set<number>,
  limit: number,
): ScheduledEvent[] {
  if (limit <= 0) return [];
  const today = startOfDay(now);

  return posts
    .flatMap((post): ScheduledEvent[] => {
      if (excludedIds.has(post.id)) return [];

      // Ưu tiên ngày sự kiện; bài cũ chưa khai báo ACF sẽ dùng ngày đăng để bù card.
      const startAt = parseEventDate(
        readPostValue(post, 'ngay_bat_dau_su_kien'),
      ) ?? parseEventDate(post.date);
      if (!startAt) return [];

      const endAt = parseEventDate(
        readPostValue(post, 'thoi_gian_ket_thuc'),
      );
      const isPast = endAt
        ? endAt.getTime() < now.getTime()
        : startOfDay(startAt).getTime() < today.getTime();

      if (!isPast) return [];

      return [{
        post,
        startAt,
        endAt,
        isHot: false,
        isOngoing: false,
        isPast: true,
        priorityOrder: Number.MAX_SAFE_INTEGER,
      }];
    })
    .sort((left, right) =>
      (right.endAt ?? right.startAt).getTime()
      - (left.endAt ?? left.startAt).getTime())
    .slice(0, limit);
}

function getVisibleCount(): number {
  if (window.innerWidth >= 1024) return 4;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

function getMonthLabel(date: Date, locale: Locale): string {
  if (locale === 'en') {
    return date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  }
  return `THÁNG ${date.getMonth() + 1}`;
}

function EventDateBox({
  date,
  locale,
  overlay = false,
}: {
  date: Date;
  locale: Locale;
  overlay?: boolean;
}) {
  return (
    <div
      className={overlay
        ? 'absolute left-3 top-3 z-[2] min-w-[92px] overflow-hidden rounded-md text-center shadow-lg sm:left-5 sm:top-5 sm:min-w-[125px]'
        : 'min-w-[105px] overflow-hidden rounded-md text-center sm:min-w-[135px]'}
    >
      <div className="bg-[#c4c4c4] px-2 py-1 text-xs font-bold text-[#0118d8] sm:text-base">
        {getMonthLabel(date, locale)}
      </div>
      <div className="bg-[#0118d8] px-2 py-2 text-3xl font-bold leading-none text-white sm:py-3 sm:text-5xl">
        {String(date.getDate()).padStart(2, '0')}
      </div>
    </div>
  );
}

function EventStatusBadge({ event, locale }: { event: ScheduledEvent; locale: Locale }) {
  const label = event.isPast
    ? (locale === 'en' ? 'Finished' : 'Đã diễn ra')
    : event.isOngoing
      ? (locale === 'en' ? 'Ongoing' : 'Đang diễn ra')
      : (locale === 'en' ? 'Upcoming' : 'Sắp diễn ra');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
          event.isPast
            ? 'bg-slate-100 text-slate-600'
            : 'bg-blue-50 text-[#0118d8]'
        }`}
      >
        {label}
      </span>
      {event.isHot && (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
          🔥 HOT
        </span>
      )}
    </div>
  );
}

function ScheduledEventsLayout({
  events,
  locale,
}: {
  events: ScheduledEvent[];
  locale: Locale;
}) {
  const [primary, ...secondary] = events.slice(0, SCHEDULED_LAYOUT_LIMIT);
  const primaryImage = getFeaturedImage(primary.post);
  const primaryHref = buildPostUrl(primary.post.slug, locale, primary.post.link);
  const primaryCategory = getFirstCategory(primary.post);

  return (
    <div className={`mt-10 grid items-stretch gap-8 ${secondary.length > 0 ? 'lg:grid-cols-2' : 'mx-auto max-w-3xl'}`}>
      <article className="group h-full overflow-hidden rounded-[10px] bg-white shadow-[0_5px_20px_rgba(2,55,102,0.12)]">
        <Link href={primaryHref} className="relative block aspect-[16/9] overflow-hidden bg-slate-100">
          {primaryImage ? (
            <Image
              src={primaryImage.source_url}
              alt={primaryImage.alt_text || ''}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <span className="block h-full w-full bg-gradient-to-br from-blue-100 to-blue-50" />
          )}
          <EventDateBox date={primary.startAt} locale={locale} overlay />
        </Link>

        <div className="p-5 sm:p-6">
          <EventStatusBadge event={primary} locale={locale} />
          {primaryCategory && (
            <p className="mt-4 text-sm font-bold uppercase text-[#007cba]">
              {stripHtml(primaryCategory.name)}
            </p>
          )}
          <h3 className="mt-2 text-xl font-bold text-[#0118d8] transition-colors group-hover:text-[#007cba] sm:text-2xl">
            <Link href={primaryHref}>
              <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(primary.post.title.rendered) }} />
            </Link>
          </h3>
        </div>
      </article>

      {secondary.length > 0 && (
        <div
          className="grid h-full gap-4"
          style={{ gridTemplateRows: `repeat(${secondary.length}, minmax(0, 1fr))` }}
        >
          {secondary.map((event) => {
            const href = buildPostUrl(event.post.slug, locale, event.post.link);
            const category = getFirstCategory(event.post);

            return (
              <article key={event.post.id} className="h-full min-h-0">
                <Link
                  href={href}
                  className="group flex h-full items-center gap-4 rounded-[10px] bg-white p-3 shadow-[0_5px_16px_rgba(2,55,102,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(2,55,102,0.14)] sm:gap-5 sm:p-4"
                >
                  <EventDateBox date={event.startAt} locale={locale} />
                  <div className="min-w-0 flex-1">
                    <EventStatusBadge event={event} locale={locale} />
                    {category && (
                      <p className="mt-2 text-xs font-bold uppercase text-[#007cba]">
                        {stripHtml(category.name)}
                      </p>
                    )}
                    <h3 className="mt-1 line-clamp-3 text-base font-bold text-[#0118d8] transition-colors group-hover:text-[#007cba] sm:text-xl">
                      <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(event.post.title.rendered) }} />
                    </h3>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventCardSlider({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [trackIndex, setTrackIndex] = useState(
    posts.length > 1 ? posts.length * 2 : 0,
  );
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isEnglish = locale === 'en';
  const isLooping = posts.length > 1;
  const logicalIndex = posts.length > 0
    ? ((trackIndex % posts.length) + posts.length) % posts.length
    : 0;
  const loopPosts = useMemo(
    () => isLooping
      ? Array.from({ length: 5 }, () => posts).flat()
      : posts,
    [isLooping, posts],
  );

  useEffect(() => {
    const updateVisibleCount = () => setVisibleCount(getVisibleCount());
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  useEffect(() => {
    if (paused || !isLooping) return;

    const timer = window.setTimeout(() => {
      setTrackIndex((current) => current + 1);
    }, AUTOPLAY_DELAY);

    return () => window.clearTimeout(timer);
  }, [isLooping, paused, trackIndex]);

  function jumpWithoutAnimation(index: number) {
    setTransitionEnabled(false);
    setTrackIndex(index);
    window.requestAnimationFrame(() => setTransitionEnabled(true));
  }

  function handleTransitionEnd() {
    if (!isLooping) return;
    if (trackIndex >= posts.length * 3 || trackIndex <= posts.length) {
      jumpWithoutAnimation(posts.length * 2 + logicalIndex);
    }
  }

  function showLogicalSlide(index: number) {
    if (!isLooping) return;
    const normalized = ((index % posts.length) + posts.length) % posts.length;
    let difference = normalized - logicalIndex;
    if (difference > posts.length / 2) difference -= posts.length;
    if (difference < -posts.length / 2) difference += posts.length;
    setTrackIndex((current) => current + difference);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      setTrackIndex((current) => current + (distance < 0 ? 1 : -1));
    }
  }

  return (
    <div
      className="group/slider relative mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        handleTouchEnd(event);
        setPaused(false);
      }}
    >
      <div className="overflow-hidden">
        <div
          className={`flex ${
            transitionEnabled
              ? 'motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out'
              : ''
          }`}
          style={{ transform: `translate3d(-${trackIndex * (100 / visibleCount)}%, 0, 0)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {loopPosts.map((post, index) => {
            const { day, month } = formatEventDate(
              post.date,
              isEnglish ? 'en-US' : 'vi-VN',
            );
            const image = getFeaturedImage(post);
            const href = buildPostUrl(post.slug, locale, post.link);

            return (
              <div
                key={`${post.id}-${Math.floor(index / Math.max(posts.length, 1))}`}
                className="shrink-0 px-2.5"
                style={{ flexBasis: `${100 / visibleCount}%` }}
              >
                <article className="group h-full overflow-hidden rounded-[10px] bg-white shadow-[0_5px_16px_rgba(2,55,102,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(2,55,102,0.14)]">
                  <Link href={href} className="relative block aspect-video overflow-hidden bg-slate-100">
                    {image ? (
                      <Image
                        src={image.source_url}
                        alt={image.alt_text || ''}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <span className="block h-full w-full bg-gradient-to-br from-blue-100 to-blue-50" />
                    )}
                    <time
                      dateTime={toISODate(post.date)}
                      className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-[#0118d8] px-2 py-1.5 text-white"
                    >
                      <span className="text-lg font-bold leading-none">{day}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide">{month}</span>
                    </time>
                  </Link>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-base font-semibold text-[#0118d8] transition-colors group-hover:text-[#2d2d2d]">
                      <Link href={href}>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
                      </Link>
                    </h3>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {isLooping && (
        <div className="mt-5 flex justify-center gap-2" aria-label={isEnglish ? 'Event slides' : 'Các trang sự kiện'}>
          {posts.map((post, index) => (
            <button
              key={post.id}
              type="button"
              onClick={() => showLogicalSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === logicalIndex
                  ? 'w-7 bg-[#0118d8]'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`${isEnglish ? 'Show event slide' : 'Hiện trang sự kiện'} ${index + 1}`}
              aria-current={index === logicalIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KhuVucSuKien({ posts, locale }: KhuVucSuKienProps) {
  const isEnglish = locale === 'en';
  const scheduledEvents = useMemo(
    () => selectScheduledEvents(posts, new Date()),
    [posts],
  );
  const layoutEvents = useMemo(() => {
    const selectedUpcoming = scheduledEvents.slice(0, SCHEDULED_LAYOUT_LIMIT);
    if (selectedUpcoming.length === 0) return [];

    const excludedIds = new Set(selectedUpcoming.map((event) => event.post.id));
    return [
      ...selectedUpcoming,
      ...selectPastEvents(
        posts,
        new Date(),
        excludedIds,
        SCHEDULED_LAYOUT_LIMIT - selectedUpcoming.length,
      ),
    ];
  }, [posts, scheduledEvents]);
  const fallbackPosts = posts.slice(0, FALLBACK_CARD_LIMIT);
  const sectionTitle = isEnglish ? 'Events' : 'Sự Kiện';
  const sectionHref = isEnglish ? '/en/events' : '/su-kien';

  return (
    <section className="bg-white py-10 sm:py-12" aria-label={sectionTitle}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionTitle title={sectionTitle} href={sectionHref} />

        {scheduledEvents.length > 0 ? (
          <ScheduledEventsLayout events={layoutEvents} locale={locale} />
        ) : fallbackPosts.length > 0 ? (
          <EventCardSlider posts={fallbackPosts} locale={locale} />
        ) : (
          <p className="py-4 text-sm text-slate-700">
            {isEnglish ? 'There are no upcoming events.' : 'Chưa có sự kiện nào chuẩn bị diễn ra.'}
          </p>
        )}
      </div>
    </section>
  );
}
