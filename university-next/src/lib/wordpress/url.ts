export type WordPressQueryValue =
  | string
  | number
  | boolean
  | (string | number)[]
  | undefined;

export type WordPressQueryParams = Record<string, WordPressQueryValue>;

function appendQueryParams(url: URL, params?: WordPressQueryParams): URL {
  if (!params) return url;

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    url.searchParams.set(
      key,
      Array.isArray(value) ? value.join(',') : String(value),
    );
  }

  return url;
}

export function buildWordPressUrl(
  baseUrl: string,
  endpoint: string,
  params?: WordPressQueryParams,
): URL {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(baseUrl);
  const restRoute = url.searchParams.get('rest_route');

  if (restRoute !== null) {
    const normalizedRoute = restRoute.replace(/\/+$/, '');
    url.searchParams.set('rest_route', `${normalizedRoute}${normalizedEndpoint}`);
  } else {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}${normalizedEndpoint}`;
  }

  return appendQueryParams(url, params);
}

/** Build a URL for a non-core REST namespace using the configured API transport. */
export function buildWordPressRestUrl(
  coreApiUrl: string,
  route: string,
  params?: WordPressQueryParams,
): URL {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const url = new URL(coreApiUrl);

  if (url.searchParams.has('rest_route')) {
    url.searchParams.set('rest_route', normalizedRoute);
  } else {
    const wpJsonIndex = url.pathname.indexOf('/wp-json');
    const wpJsonPath = wpJsonIndex >= 0
      ? url.pathname.slice(0, wpJsonIndex + '/wp-json'.length)
      : '/wp-json';
    url.pathname = `${wpJsonPath}${normalizedRoute}`;
  }

  return appendQueryParams(url, params);
}
