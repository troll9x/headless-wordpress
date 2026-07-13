export type WordPressQueryValue =
  | string
  | number
  | boolean
  | (string | number)[]
  | undefined;

export type WordPressQueryParams = Record<string, WordPressQueryValue>;

export function buildWordPressUrl(
  baseUrl: string,
  endpoint: string,
  params?: WordPressQueryParams,
): URL {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${normalizedBase}${normalizedEndpoint}`);

  if (!params) {
    return url;
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    url.searchParams.set(
      key,
      Array.isArray(value) ? value.join(',') : String(value),
    );
  }

  return url;
}