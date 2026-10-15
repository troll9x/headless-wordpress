import { expect, test } from '@playwright/test';

test.setTimeout(120_000);
const enArticle = '/en/lecturers-from-thuyloi-university-granted-patent-for-new-measurement-method-49957';

for (const [locale, home, query, search] of [['vi', '/', 'thủy lợi', '/tim-kiem'], ['en', '/en', 'water', '/en/search']] as const) {
  test(`${locale}: live search, Enter, results, article and pagination use real CMS data`, async ({ page, request }) => {
    const api = await request.get(`/api/search?${new URLSearchParams({ q: query, lang: locale, limit: '5' })}`);
    expect(api.status()).toBe(200);
    const { items } = await api.json();
    expect(items.length).toBeGreaterThan(0);
    await page.goto(home, { waitUntil: 'domcontentloaded' });
    const input = page.getByRole('combobox');
    await input.fill(query);
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('option').first()).toContainText(items[0].title.replace(/<[^>]+>/g, ''));
    await input.press('Enter');
    await expect(page).toHaveURL(new RegExp(search), { timeout: 45_000 });
    await expect(page.locator('main ol h2 a').first()).toBeVisible({ timeout: 45_000 });
    const firstPageUrls = await page.locator('main ol h2 a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    expect(firstPageUrls[0]).toBe(items[0].url);
    await page.locator('main ol h2 a').first().click();
    await expect(page.locator('article h1')).toBeVisible({ timeout: 45_000 });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('main ol h2 a').first()).toBeVisible({ timeout: 45_000 });
    const next = page.getByRole('link', { name: locale === 'en' ? 'Next' : 'Sau', exact: true });
    await expect(next).toBeVisible();
    await next.click();
    await expect(page).toHaveURL(/page=2/, { timeout: 45_000 });
    await expect(page.locator('main ol h2 a').first()).toBeVisible();
    const second = await page.locator('main ol h2 a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    expect(second.some(href => firstPageUrls.includes(href))).toBe(false);
  });

  test(`${locale}: empty results and rapid input recover`, async ({ page }) => {
    await page.goto(home, { waitUntil: 'domcontentloaded' });
    const input = page.getByRole('combobox');
    await input.fill(query);
    await input.fill('');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await input.fill('zzqnonexistenttlu938472');
    await expect(page.getByRole('listbox')).toContainText(locale === 'en' ? 'No results found' : 'Không tìm thấy kết quả', { timeout: 45_000 });
    await input.press('Enter');
    await expect(page.locator('main').first()).toContainText(locale === 'en' ? 'No results found' : 'Không tìm thấy kết quả', { timeout: 45_000 });
    await input.fill(query);
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 45_000 });
  });
}

test('language switch can complete VI → EN → VI without locking', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\/en\/?$/, { timeout: 45_000 });
  await expect(page.getByRole('checkbox', { name: 'Switch to Vietnamese' })).toBeEnabled();
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\.vn\/$|3219\/$/, { timeout: 45_000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
});

test('category translations use CMS slugs and search preserves query', async ({ page }) => {
  await page.goto('/tin-tuc-thong-bao', { waitUntil: 'domcontentloaded' });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\/en\/news-and-events\/?$/, { timeout: 45_000 });
  await expect(page.locator('main article').first()).toBeVisible();
  await page.goto('/tim-kiem?q=water', { waitUntil: 'domcontentloaded' });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\/en\/search\?q=water/, { timeout: 45_000 });
});

test('article without translation returns a safe locale homepage', async ({ page, request }) => {
  const api = await request.get(`/api/translation?${new URLSearchParams({ path: enArticle, lang: 'vi' })}`);
  expect(api.status()).toBe(200);
  const result = await api.json();
  expect(result.path).toMatch(/^\/(?!en(?:\/|$))/);
  await page.goto(enArticle, { waitUntil: 'domcontentloaded' });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(new URL(result.path, page.url()).href, { timeout: 45_000 });
  await expect(page.getByRole('checkbox', { name: 'Chuyển sang tiếng Anh' })).toBeEnabled();
});

test('live search reports upstream errors and invalid schema separately from empty results', async ({ page }) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.route('**/api/search?**', route => route.fulfill({ status: 502, json: { error: 'Controlled upstream failure' } }));
  await page.getByRole('combobox').fill('water');
  await expect(page.getByRole('listbox')).toContainText('temporarily unavailable');
  await page.unroute('**/api/search?**');
  await page.route('**/api/search?**', route => route.fulfill({ json: { invalid: true } }));
  await page.getByRole('combobox').fill('research');
  await expect(page.getByRole('listbox')).toContainText('temporarily unavailable');
});

test('CMS search keeps English results scoped to English', async ({ request }) => {
  const response = await request.get(`/api/search?${new URLSearchParams({ q: 'thủy lợi', lang: 'en' })}`);
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.items.length).toBeGreaterThan(0);
  expect(result.items.every((item: { url: string }) => item.url.startsWith('/en/'))).toBe(true);
});

test('stale responses cannot reopen cleared search', async ({ page }) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  let release: (() => void) | undefined;
  await page.route('**/api/search?**', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { items: [{ title: 'Controlled delayed response', url: enArticle, excerpt: '', thumb: '' }] } }).catch(() => {});
  });
  await page.getByRole('combobox').fill('water');
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('combobox').fill('');
  release?.();
  await expect(page.getByRole('listbox')).toHaveCount(0);
});

test('translation failures allow retry and expose immediate progress', async ({ page }) => {
  await page.goto('/tin-tuc-thong-bao', { waitUntil: 'domcontentloaded' });
  await page.route('**/api/translation?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ status: 503, json: { error: 'Controlled failure' } });
  });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page.locator('label.lang-ios-texttoggle')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('alert').filter({ hasText: 'Chưa chuyển được ngôn ngữ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeEnabled();
  await expect(page).toHaveURL(/\/tin-tuc-thong-bao$/);
});

test('mobile search, menu and language switch remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Mở menu' }).click();
  const input = page.getByRole('combobox').filter({ visible: true });
  await input.fill('thủy lợi');
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 45_000 });
  await input.press('Enter');
  await expect(page).toHaveURL(/\/tim-kiem\?q=/, { timeout: 45_000 });
  await page.locator('label.lang-ios-texttoggle').click();
  await expect(page).toHaveURL(/\/en\/search\?q=/, { timeout: 45_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
});
