import { NextResponse } from 'next/server';
import {
  VIETTEL_TTS_API_URL,
  VIETTEL_TTS_SPEED,
  VIETTEL_TTS_TOKEN,
  VIETTEL_TTS_VOICE,
  VIETTEL_TTS_WITHOUT_FILTER,
  TTS_RATE_LIMIT_MAX,
  TTS_RATE_LIMIT_WINDOW_SECONDS,
} from '@/config/env/server';
import { consumeRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { stripHtml } from '@/lib/utils/html';
import { getPostById } from '@/lib/wordpress/posts';
import { wpFetch } from '@/lib/wordpress/client';
import type { Locale } from '@/types/ngon-ngu';

export const runtime = 'nodejs';

const MAX_CHUNK_LENGTH = 4_500;
const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

interface CachedAudio {
  audio: ArrayBuffer;
  contentType: string;
  requestId: string | null;
  expiresAt: number;
}

const audioCache = new Map<string, CachedAudio>();

function splitText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > MAX_CHUNK_LENGTH) {
    const candidate = remaining.slice(0, MAX_CHUNK_LENGTH + 1);
    const sentenceBreak = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('; '),
    );
    const wordBreak = candidate.lastIndexOf(' ');
    const splitAt = sentenceBreak >= MAX_CHUNK_LENGTH * 0.6
      ? sentenceBreak + 1
      : wordBreak > 0
        ? wordBreak
        : MAX_CHUNK_LENGTH;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getCachedAudio(key: string): CachedAudio | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    audioCache.delete(key);
    return null;
  }
  return entry;
}

function cacheAudio(key: string, entry: CachedAudio) {
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, entry);
}

function audioResponse(entry: CachedAudio, chunkIndex: number, chunkCount: number) {
  const headers = new Headers({
    'Content-Type': entry.contentType,
    'Cache-Control': 'private, max-age=21600',
    'X-TTS-Chunk-Index': String(chunkIndex),
    'X-TTS-Chunk-Count': String(chunkCount),
  });
  if (entry.requestId) headers.set('X-TTS-Request-Id', entry.requestId);
  return new Response(entry.audio.slice(0), { status: 200, headers });
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(
    'tts',
    getClientIp(request),
    TTS_RATE_LIMIT_MAX,
    TTS_RATE_LIMIT_WINDOW_SECONDS * 1_000,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Bạn đã gửi quá nhiều yêu cầu đọc bài. Vui lòng thử lại sau.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'RateLimit-Limit': String(rateLimit.limit),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1_000)),
        },
      },
    );
  }

  if (!VIETTEL_TTS_TOKEN) {
    return jsonError(
      'Viettel TTS chưa được cấu hình. Hãy thêm VIETTEL_TTS_TOKEN vào .env.local.',
      503,
    );
  }

  let body: { postId?: unknown; postType?: unknown; locale?: unknown; chunkIndex?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError('Dữ liệu gửi lên không phải JSON hợp lệ.', 400);
  }

  const postId = typeof body.postId === 'number' ? body.postId : Number(body.postId);
  const chunkIndex = typeof body.chunkIndex === 'number'
    ? body.chunkIndex
    : Number(body.chunkIndex ?? 0);
  const locale: Locale = body.locale === 'en' ? 'en' : 'vi';
  const postType = body.postType === 'to-chuc' ? 'to-chuc' : 'post';

  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return jsonError('postId không hợp lệ.', 400);
  }
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) {
    return jsonError('chunkIndex không hợp lệ.', 400);
  }
  if (locale !== 'vi') {
    return jsonError('Viettel TTS hiện chỉ được dùng cho nội dung tiếng Việt.', 400);
  }

  let content = '';
  let modified = '';
  if (postType === 'to-chuc') {
    const member = await wpFetch<{
      status: string;
      content: { rendered: string };
      modified_gmt: string;
    }>(`/to-chuc/${postId}`, {
      params: { context: 'view', lang: locale },
      revalidate: 300,
      tags: [`organization-member-${postId}`],
    }).catch(() => null);
    if (!member || member.status !== 'publish') {
      return jsonError('Không tìm thấy hồ sơ tổ chức công khai.', 404);
    }
    content = member.content.rendered;
    modified = member.modified_gmt;
  } else {
    const post = await getPostById(postId, locale);
    if (!post || post.status !== 'publish' || post.type !== 'post') {
      return jsonError('Không tìm thấy bài viết công khai.', 404);
    }
    content = post.content.rendered;
    modified = post.modified_gmt;
  }

  const chunks = splitText(stripHtml(content));
  if (chunks.length === 0) return jsonError('Bài viết không có nội dung để đọc.', 422);
  if (chunkIndex >= chunks.length) return jsonError('Đoạn văn bản không tồn tại.', 404);

  const cacheKey = [
    postId,
    postType,
    modified,
    chunkIndex,
    VIETTEL_TTS_VOICE,
    VIETTEL_TTS_SPEED,
    VIETTEL_TTS_WITHOUT_FILTER,
  ].join(':');
  const cached = getCachedAudio(cacheKey);
  if (cached) return audioResponse(cached, chunkIndex, chunks.length);

  let upstream: Response;
  try {
    upstream = await fetch(VIETTEL_TTS_API_URL, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: chunks[chunkIndex],
        voice: VIETTEL_TTS_VOICE,
        speed: VIETTEL_TTS_SPEED,
        tts_return_option: 3,
        token: VIETTEL_TTS_TOKEN,
        without_filter: VIETTEL_TTS_WITHOUT_FILTER,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return jsonError('Không thể kết nối tới Viettel AI.', 502);
  }

  if (!upstream.ok) {
    let message = `Viettel AI trả về lỗi HTTP ${upstream.status}.`;
    try {
      const error = await upstream.json() as { vi_message?: string; en_message?: string };
      message = error.vi_message || error.en_message || message;
    } catch {
      // Keep the status-only message when the upstream body is not JSON.
    }
    return jsonError(message, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
  }

  const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
  if (contentType.includes('application/json')) {
    return jsonError('Viettel AI không trả về dữ liệu âm thanh.', 502);
  }

  const entry: CachedAudio = {
    audio: await upstream.arrayBuffer(),
    contentType,
    requestId: upstream.headers.get('request_id'),
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  cacheAudio(cacheKey, entry);
  return audioResponse(entry, chunkIndex, chunks.length);
}
