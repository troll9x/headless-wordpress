import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getClientIp } from '../university-next/src/lib/security/rate-limit.ts';
import { signedSearchHeaders } from '../university-next/src/lib/security/search-proxy.ts';

test('client IP ignores spoofable headers unless the trusted proxy header is configured', () => {
  const request = { headers: new Headers({
    'cf-connecting-ip': '198.51.100.1',
    'x-forwarded-for': '198.51.100.2, 192.0.2.1',
    'x-real-ip': '192.0.2.10',
  }) };
  assert.equal(getClientIp(request, ''), 'unknown');
  assert.equal(getClientIp(request, 'x-forwarded-for'), 'unknown');
  assert.equal(getClientIp(request, 'x-real-ip'), '192.0.2.10');
  assert.equal(getClientIp({ headers: new Headers({ 'x-real-ip': '192.0.2.10, 198.51.100.1' }) }, 'x-real-ip'), 'unknown');
  assert.equal(getClientIp({ headers: new Headers({ 'x-real-ip': 'not-an-ip' }) }, 'x-real-ip'), 'unknown');
});

test('search identity is pseudonymous and signed only with a configured secret', () => {
  const secret = 'test-only-32-character-long-search-key';
  assert.deepEqual(signedSearchHeaders('192.0.2.10', ''), {});
  const first = signedSearchHeaders('192.0.2.10', secret, 1_700_000_000);
  const second = signedSearchHeaders('192.0.2.11', secret, 1_700_000_000);
  assert.match(first['X-Headless-Search-Client'], /^[a-f0-9]{64}$/);
  assert.notEqual(first['X-Headless-Search-Client'], second['X-Headless-Search-Client']);
  assert.ok(!JSON.stringify(first).includes('192.0.2.10'));
});
