import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHeadlessSearchResponse } from '../src/lib/wordpress/headless-search-response.ts';

const site = 'https://cms.tlu.edu.vn';
const item = (id, language, url) => ({ id, language, url, title: `Post ${id}`,
  type: 'post', excerpt: '', thumb: '' });
const response = (items, total, page = 1, per = 2) => ({ items, total,
  total_pages: Math.ceil(total / per), page, per, per_page: per });

test('Vietnamese page is full even when legacy mixed-language first page was English', () => {
  const result = parseHeadlessSearchResponse(response([
    item(7, 'vi', '/bai-viet-7'), item(9, 'vi', '/bai-viet-9'),
  ], 3), 'vi', 1, 2, site);
  assert.deepEqual(result.items.map(({ id }) => id), [7, 9]);
  assert.equal(result.totalPages, 2);
  assert.equal(result.hasMore, true);
});

test('rejects legacy response without scoped total and mixed-language result', () => {
  assert.throws(() => parseHeadlessSearchResponse({ items: [], page: 1, per: 2 }, 'vi', 1, 2, site));
  assert.throws(() => parseHeadlessSearchResponse(response([
    item(2, 'en', '/en/post-2'), item(7, 'vi', '/bai-viet-7'),
  ], 2), 'vi', 1, 2, site));
});

test('rejects wrong-language URL, false empty page and wrong totals', () => {
  assert.throws(() => parseHeadlessSearchResponse(response([item(7, 'vi', '/en/post-7')], 1), 'vi', 1, 2, site));
  assert.throws(() => parseHeadlessSearchResponse(response([], 3), 'vi', 1, 2, site));
  assert.throws(() => parseHeadlessSearchResponse({ ...response([], 0), total_pages: 3 }, 'vi', 1, 2, site));
});

test('English next page and out-of-range empty page retain correct totals', () => {
  const page2 = parseHeadlessSearchResponse(response([item(4, 'en', '/en/post-4')], 3, 2), 'en', 2, 2, site);
  assert.equal(page2.hasMore, false);
  const page3 = parseHeadlessSearchResponse(response([], 3, 3), 'en', 3, 2, site);
  assert.deepEqual(page3.items, []);
  assert.equal(page3.total, 3);
});
