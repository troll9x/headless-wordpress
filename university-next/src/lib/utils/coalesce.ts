const inFlight = new Map<string, Promise<unknown>>();

/**
 * Share one in-flight operation between concurrent server renders.
 *
 * Next's Data Cache stores completed fetches, but it cannot always prevent a
 * thundering herd when many dynamic requests arrive before the first fetch has
 * completed. This small process-local layer only deduplicates active work; it
 * does not retain payloads or replace ISR/revalidation.
 */
export function coalesce<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const operation = factory();
  inFlight.set(key, operation);

  const cleanup = () => {
    if (inFlight.get(key) === operation) inFlight.delete(key);
  };
  void operation.then(cleanup, cleanup);

  return operation;
}
