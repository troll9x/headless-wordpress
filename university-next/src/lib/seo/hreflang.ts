/**
 * Builds the `alternates.languages` object for Next.js Metadata.
 *
 * Rules:
 * - `x-default` always points to the Vietnamese (default locale) URL.
 * - `vi` points to the Vietnamese URL.
 * - `en` points to the English URL.
 * - Omits any locale whose URL is unknown (undefined).
 */
export function buildHreflangAlternates(
  viUrl: string | undefined,
  enUrl: string | undefined,
): Record<string, string> | undefined {
  if (!viUrl && !enUrl) return undefined;

  const result: Record<string, string> = {};
  if (viUrl) {
    result['x-default'] = viUrl;
    result['vi'] = viUrl;
  }
  if (enUrl) {
    result['en'] = enUrl;
  }
  return result;
}
