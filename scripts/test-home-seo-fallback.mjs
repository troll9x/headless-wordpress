import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeHomeSeoOverride, parseHomeSeoOverride } from '../university-next/src/lib/seo/home-override.ts';

test('home SEO rejects malformed and empty CMS responses', () => {
  assert.equal(parseHomeSeoOverride(null, 'vi'), null);
  assert.equal(parseHomeSeoOverride({ vi: [] }, 'vi'), null);
  assert.equal(parseHomeSeoOverride({ vi: { title: 7, description: '' } }, 'vi'), null);
  assert.deepEqual(parseHomeSeoOverride({ vi: { title: '<b>TLU</b>', description: '  Public university ' } }, 'vi'), {
    title: 'TLU', description: 'Public university',
  });
});

test('home SEO preserves route fallback and merges provided fields', () => {
  assert.equal(mergeHomeSeoOverride(null, null), null);
  const rankMath = {
    id: 1,
    slug: 'home',
    title: 'Rank Math title',
    description: 'Rank Math description',
    open_graph: { title: 'OG title' },
  };
  assert.deepEqual(mergeHomeSeoOverride(rankMath, null), rankMath);
  const merged = mergeHomeSeoOverride(rankMath, { description: 'ACF description' });
  assert.equal(merged?.title, 'Rank Math title');
  assert.equal(merged?.description, 'ACF description');
  assert.equal(merged?.open_graph?.description, 'ACF description');
  assert.equal(merged?.twitter?.description, 'ACF description');
});
