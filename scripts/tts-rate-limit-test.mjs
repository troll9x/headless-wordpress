const endpoint = process.argv[2] || 'http://localhost:3100/api/tts';
const requests = Number.parseInt(process.argv[3] || '35', 10);

const responses = await Promise.all(
  Array.from({ length: requests }, () => fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '203.0.113.10',
    },
    body: '{}',
  })),
);

const statuses = responses.reduce((counts, response) => {
  counts[response.status] = (counts[response.status] || 0) + 1;
  return counts;
}, {});
const limited = responses.find((response) => response.status === 429);

console.log(JSON.stringify({
  endpoint,
  requests,
  statuses,
  retryAfter: limited?.headers.get('retry-after') || null,
  limit: limited?.headers.get('ratelimit-limit') || null,
  remaining: limited?.headers.get('ratelimit-remaining') || null,
}, null, 2));

if (!limited || statuses['429'] !== Math.max(0, requests - 30)) process.exit(1);
