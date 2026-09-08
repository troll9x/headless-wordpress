import { performance } from 'node:perf_hooks';

const target = process.argv[2];
const total = Number.parseInt(process.argv[3] || '50', 10);
const concurrency = Number.parseInt(process.argv[4] || '10', 10);

if (!target || !Number.isInteger(total) || !Number.isInteger(concurrency)) {
  console.error('Usage: node scripts/http-load-test.mjs <url> [total=50] [concurrency=10]');
  process.exit(2);
}

const results = [];
let cursor = 0;

async function worker() {
  while (cursor < total) {
    const index = cursor++;
    const started = performance.now();
    try {
      const response = await fetch(target, {
        headers: { Accept: 'application/json,text/html;q=0.9' },
        signal: AbortSignal.timeout(30_000),
      });
      await response.arrayBuffer();
      results[index] = {
        status: response.status,
        cache: response.headers.get('x-headless-cache') || '',
        duration: performance.now() - started,
      };
    } catch (error) {
      results[index] = {
        status: 0,
        cache: '',
        duration: performance.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: Math.min(total, concurrency) }, worker));
const elapsed = performance.now() - started;
const durations = results.map((item) => item.duration).sort((a, b) => a - b);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.floor(durations.length * value))];
const countBy = (field) => Object.fromEntries(
  Array.from(new Set(results.map((item) => item[field])))
    .sort()
    .map((value) => [value || '(none)', results.filter((item) => item[field] === value).length]),
);

console.log(JSON.stringify({
  target,
  total,
  concurrency,
  elapsedMs: Math.round(elapsed),
  requestsPerSecond: Number((total / (elapsed / 1_000)).toFixed(2)),
  latencyMs: {
    min: Math.round(durations[0]),
    p50: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    max: Math.round(durations.at(-1)),
  },
  statuses: countBy('status'),
  cache: countBy('cache'),
  errors: results.filter((item) => item.error).map((item) => item.error),
}, null, 2));

if (results.some((item) => item.status < 200 || item.status >= 400)) process.exit(1);
