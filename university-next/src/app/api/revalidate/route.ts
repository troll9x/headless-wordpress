import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  REVALIDATION_MAX_BODY_BYTES,
  REVALIDATION_SECRET,
  REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS,
} from '@/config/env/server';
import {
  parseRevalidationPayload,
  verifyRevalidationSignature,
} from '@/lib/security/revalidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const replayCache = new Map<string, number>();

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

async function readLimitedBody(request: Request): Promise<string | null> {
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > REVALIDATION_MAX_BODY_BYTES) {
    return null;
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > REVALIDATION_MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

function consumeEventId(eventId: string, now: number): boolean {
  for (const [id, expiresAt] of replayCache) {
    if (expiresAt <= now) replayCache.delete(id);
  }
  if (replayCache.has(eventId)) return false;

  replayCache.set(
    eventId,
    now + REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS * 2,
  );
  return true;
}

export async function POST(request: Request) {
  if (!REVALIDATION_SECRET) {
    return json({ error: 'Revalidation is not configured.' }, 503);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Content-Type must be application/json.' }, 415);
  }

  const eventId = request.headers.get('x-headless-event-id') ?? '';
  const timestampText = request.headers.get('x-headless-timestamp') ?? '';
  const signature = request.headers.get('x-headless-signature') ?? '';
  const timestamp = Number(timestampText);
  const now = Math.floor(Date.now() / 1_000);

  if (
    !/^[A-Za-z0-9._:-]{1,128}$/.test(eventId)
    || !/^\d{10}$/.test(timestampText)
    || !Number.isSafeInteger(timestamp)
    || Math.abs(now - timestamp) > REVALIDATION_TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return json({ error: 'Invalid or expired webhook headers.' }, 401);
  }

  const rawBody = await readLimitedBody(request);
  if (rawBody === null) return json({ error: 'Request body is too large.' }, 413);
  if (!verifyRevalidationSignature(rawBody, timestamp, eventId, signature, REVALIDATION_SECRET)) {
    return json({ error: 'Invalid webhook signature.' }, 401);
  }

  const payload = parseRevalidationPayload(rawBody, eventId, timestamp);
  if (!payload) return json({ error: 'Invalid webhook payload.' }, 400);
  if (!consumeEventId(eventId, now)) return json({ error: 'Duplicate webhook event.' }, 409);

  try {
    for (const path of new Set(payload.invalidate.paths)) revalidatePath(path);
    for (const tag of new Set(payload.invalidate.tags)) revalidateTag(tag, 'max');
  } catch {
    replayCache.delete(eventId);
    return json({ error: 'Unable to revalidate content.' }, 500);
  }

  return json({ revalidated: true, event_id: eventId }, 200);
}
