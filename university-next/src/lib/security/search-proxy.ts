import { createHmac } from 'node:crypto';

/** Authenticate a pseudonymous client identity to WordPress without forwarding its IP. */
export function signedSearchHeaders(clientIp: string, secret: string, now = Math.floor(Date.now() / 1_000)): Record<string, string> {
  if (secret.length < 32) return {};
  const client = createHmac('sha256', secret).update(`search-ip:${clientIp}`).digest('hex');
  const signature = createHmac('sha256', secret)
    .update(`search-client:${now}:${client}`)
    .digest('hex');
  return {
    'X-Headless-Search-Client': client,
    'X-Headless-Search-Timestamp': String(now),
    'X-Headless-Search-Signature': signature,
  };
}
