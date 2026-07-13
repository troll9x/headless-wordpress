export interface WordPressRestErrorPayload {
  code?: unknown;
  message?: unknown;
  data?: {
    status?: unknown;
  };
}

export class WordPressApiError extends Error {
  readonly endpoint: string;
  readonly status: number;
  readonly code?: string;

  constructor({
    endpoint,
    status,
    message,
    code,
    cause,
  }: {
    endpoint: string;
    status: number;
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'WordPressApiError';
    this.endpoint = endpoint;
    this.status = status;
    this.code = code;
  }
}

export class WordPressResponseError extends Error {
  readonly endpoint: string;

  constructor(endpoint: string, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'WordPressResponseError';
    this.endpoint = endpoint;
  }
}

export function parseWordPressRestError(
  payload: unknown,
): Pick<WordPressApiError, 'code'> & { message?: string } {
  if (!isWordPressRestErrorPayload(payload)) {
    return {};
  }

  return {
    code: typeof payload.code === 'string' ? payload.code : undefined,
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
}

function isWordPressRestErrorPayload(
  value: unknown,
): value is WordPressRestErrorPayload {
  return typeof value === 'object' && value !== null;
}