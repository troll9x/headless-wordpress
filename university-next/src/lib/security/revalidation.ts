import { createHmac, timingSafeEqual } from 'node:crypto';

export interface RevalidationPayload {
  version: number;
  event_id: string;
  event: string;
  occurred_at: number;
  invalidate: {
    paths: string[];
    tags: string[];
  };
}

const EVENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const EVENT_PATTERN = /^(?:content\.(?:created|updated|published|unpublished|trashed|restored|deleted)|term\.(?:created|updated|deleted|relationships_updated)|menu\.(?:updated|deleted)|options\.updated|revalidation\.test)$/;
const TAG_PATTERN = /^[A-Za-z0-9:_-]{1,200}$/;

export function verifyRevalidationSignature(
  rawBody: string,
  timestamp: number,
  eventId: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!secret || !signatureHeader.startsWith('sha256=')) return false;

  const supplied = signatureHeader.slice('sha256='.length);
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${eventId}.${rawBody}`)
    .digest('base64');
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function isSafePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > 2_048) {
    return false;
  }
  if (!path.startsWith('/') || path.includes('\\') || /[?#\0]/.test(path) || path.includes('//')) {
    return false;
  }

  try {
    return !decodeURIComponent(path).split('/').some((segment) => segment === '..');
  } catch {
    return false;
  }
}

export function parseRevalidationPayload(
  rawBody: string,
  headerEventId: string,
  headerTimestamp: number,
): RevalidationPayload | null {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object') return null;
  const payload = value as Partial<RevalidationPayload>;
  if (
    payload.version !== 1
    || typeof payload.event_id !== 'string'
    || !EVENT_ID_PATTERN.test(payload.event_id)
    || payload.event_id !== headerEventId
    || typeof payload.event !== 'string'
    || !EVENT_PATTERN.test(payload.event)
    || !Number.isSafeInteger(payload.occurred_at)
    || payload.occurred_at !== headerTimestamp
    || !payload.invalidate
    || !Array.isArray(payload.invalidate.paths)
    || !Array.isArray(payload.invalidate.tags)
    || payload.invalidate.paths.length > 100
    || payload.invalidate.tags.length > 100
    || !payload.invalidate.paths.every(isSafePath)
    || !payload.invalidate.tags.every(
      (tag) => typeof tag === 'string' && TAG_PATTERN.test(tag),
    )
  ) {
    return null;
  }

  return payload as RevalidationPayload;
}
