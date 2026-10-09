import { expect, test } from '@playwright/test';
import legacyRedirects from '../../src/data/legacy-permalink-redirects.json';

const articleEn = '/en/lecturers-from-thuyloi-university-granted-patent-for-new-measurement-method-49957';

test('homepages render content and server language for VI/EN', async ({ page, request }) => {
  for (const [path, lang] of [['/', 'vi'], ['/en', 'en']] as const) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(new RegExp(`<html[^>]+lang="${lang}"`));
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
  }
});

test('raw locale HTML follows the URL during interleaved requests with conflicting language headers', async ({ request }) => {
  const cases = [
    { path: '/', acceptLanguage: 'en-US,en;q=0.9', expected: 'vi' },
    { path: '/en', acceptLanguage: 'vi-VN,vi;q=0.9', expected: 'en' },
    { path: '/en/', acceptLanguage: 'vi', expected: 'en' },
    { path: '/', acceptLanguage: 'en', expected: 'vi' },
    { path: '/en', acceptLanguage: 'vi', expected: 'en' },
    { path: '/', acceptLanguage: 'en-GB', expected: 'vi' },
  ] as const;

  const responses = await Promise.all(cases.map(({ path, acceptLanguage }) =>
    request.get(path, { headers: { 'Accept-Language': acceptLanguage } }),
  ));

  for (const [index, response] of responses.entries()) {
    expect(response.status(), cases[index].path).toBe(200);
    expect(await response.text(), `${cases[index].path} with ${cases[index].acceptLanguage}`)
      .toMatch(new RegExp(`<html[^>]+lang="${cases[index].expected}"`));
  }
});

test('VI and EN category pages retain an article listing or introduction', async ({ page }) => {
  for (const path of ['/dao-tao', '/en/education']) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('main').first()).not.toBeEmpty();
  }
});

test('English article and Vietnamese article link open as articles', async ({ page }) => {
  const enResponse = await page.goto(articleEn, { waitUntil: 'domcontentloaded' });
  expect(enResponse?.status()).toBe(200);
  await expect(page.locator('article h1')).toBeVisible();
  await expect(page.locator('#article-readable-content')).not.toBeEmpty();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const viPath = await page.locator('main a[href]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') || '')
      .find((href) => /^\/(?!en\/)[^?#]+-\d+\/?$/.test(href)) || '',
  );
  expect(viPath, 'Homepage must expose a Vietnamese article URL').not.toBe('');
  const viResponse = await page.goto(viPath, { waitUntil: 'domcontentloaded' });
  expect(viResponse?.status()).toBe(200);
  await expect(page.locator('article h1')).toBeVisible();

  const recentlyReportedViPath = '/truong-dai-hoc-thuy-loi-khang-dinh-vi-the-quoc-te-tai-hoi-thao-lan-thuong-me-kong-2026-56787';
  const reportedArticleResponse = await page.goto(recentlyReportedViPath, { waitUntil: 'domcontentloaded' });
  expect(reportedArticleResponse?.status()).toBe(200);
  await expect(page.locator('article h1')).toBeVisible();
});

test('static mission pages and header navigation work', async ({ page }) => {
  for (const path of ['/su-mang-muc-tieu-chien-luoc', '/en/mission-goals-strategy']) {
    expect((await page.goto(path, { waitUntil: 'domcontentloaded' }))?.status()).toBe(200);
    await expect(page.locator('main').first()).not.toBeEmpty();
  }
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('language switch on homepage reaches English and preserves correct document language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('homepage hero and gallery images render', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main img').first()).toBeVisible();
  await expect(page.locator('main img').first()).toHaveJSProperty('complete', true);
  const moments = page.locator('section[aria-label="Khoảnh khắc TLU"]');
  await expect(moments).toBeVisible();
  await expect(moments.locator('button:has(img)')).toHaveCount(15);
});

test('partner carousel keeps offscreen partner logos virtualized', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const partnerLogos = page.locator('section[aria-label="Mạng Lưới Đối Tác"] .swiper-slide img');
  await expect(partnerLogos.first()).toBeAttached();
  await expect.poll(() => partnerLogos.count()).toBeLessThanOrEqual(20);
});

test('English article images are lazy and the optional footer map is handled correctly', async ({ page, request }) => {
  const response = await page.goto(articleEn, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);

  const bodyImages = page.locator('#article-readable-content img');
  expect(await bodyImages.count()).toBeGreaterThan(0);
  for (const image of await bodyImages.all()) {
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
  }

  const footer = page.locator('footer').last();
  await expect(footer.locator('iframe')).toHaveCount(0);
  const footerOptions = await request.get('https://cms.tlu.edu.vn/wp-json/headless/v1/options?key=tlu_site_footer');
  expect(footerOptions.status()).toBe(200);
  const footerPayload = await footerOptions.json();
  const mapUrl = footerPayload?.data?.fields?.url_map;
  const mapButton = footer.getByRole('button', { name: 'Load interactive map' });

  if (typeof mapUrl !== 'string' || mapUrl.trim() === '') {
    // The current CMS has no public map URL, so the optional section must stay absent.
    await expect(mapButton).toHaveCount(0);
    return;
  }

  await mapButton.click();
  await expect(footer.locator('iframe')).toHaveAttribute('src', mapUrl);
});

test('search API and search page respond', async ({ request, page }) => {
  const response = await request.get('/api/search?q=water&lang=en&limit=1');
  expect(response.status()).toBe(200);
  expect((await response.json()).items).toEqual(expect.any(Array));
  expect((await page.goto('/en/search?q=water', { waitUntil: 'domcontentloaded' }))?.status()).toBe(200);
  await expect(page.locator('main').first()).toBeVisible();
});

test('SEO metadata, robots and sitemap are coherent', async ({ page, request }) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /\S/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/?$/);
  await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
  await expect(page.locator('link[hreflang="en"]')).toHaveCount(1);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<urlset');
});

test('unknown path returns 404', async ({ request }) => {
  expect((await request.get('/audit-missing-route-zz-999999999')).status()).toBe(404);
});

test('a known legacy permalink redirects to its canonical path', async ({ request }) => {
  const [source, destination] = Object.entries(legacyRedirects)[0] ?? [];
  expect(source).toBeTruthy();
  expect(destination).toBeTruthy();
  const response = await request.get(source, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, response.url()).pathname).toBe(destination);
});

test('desktop, tablet and mobile viewports have no document overflow', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow, `Horizontal overflow at ${width}px`).toBe(false);
  }
});

test('staging revalidation rejects unsigned requests', async ({ request }) => {
  test.skip(!process.env.E2E_BASE_URL?.includes('dev.nguyenhongson.vn'), 'Only run this POST check on staging');
  const response = await request.post('/api/revalidate', {
    data: { invalidate: { paths: ['/'], tags: [] } },
    headers: { 'Content-Type': 'application/json' },
  });
  expect([401, 503]).toContain(response.status());
});
