import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEMO_URL = pathToFileURL(path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-01-flowme-personal-workspace-v4-1-standalone-demo-ko.html',
)).href;
const DEMO_KEY = 'flow:poc:personal-workspace:v1:standalone-demo';

async function openToday(page: import('@playwright/test').Page): Promise<void> {
  const direct = page.getByRole('button', { name: '오늘', exact: true });
  if (await direct.count() === 0) {
    await page.locator('button[data-action="nav"]:visible').click();
  }
  await page.getByRole('button', { name: '오늘', exact: true }).click();
}

test('standalone HTML is directly operable and writes only its exact PoC key', async ({ page }) => {
  test.setTimeout(60_000);
  const calls: Array<{ method: string; key?: string }> = [];
  const errors: string[] = [];
  await page.exposeFunction('__recordStandaloneStorageMutation', (entry: { method: string; key?: string }) => calls.push(entry));
  await page.addInitScript(({ demoKey }) => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    originalSet.call(window.localStorage, 'flow:standalone:sentinel', '  keep exact bytes  ');
    type DemoWindow = Window & typeof globalThis & {
      __recordStandaloneStorageMutation: (entry: { method: string; key?: string }) => Promise<void>;
    };
    const demoWindow = window as DemoWindow;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (this === window.localStorage) void demoWindow.__recordStandaloneStorageMutation({ method: 'setItem', key });
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      if (this === window.localStorage) void demoWindow.__recordStandaloneStorageMutation({ method: 'removeItem', key });
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      if (this === window.localStorage) void demoWindow.__recordStandaloneStorageMutation({ method: 'clear' });
      return originalClear.call(this);
    };
    void demoKey;
  }, { demoKey: DEMO_KEY });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEMO_URL);
  await expect(page.locator('.flow-row')).toHaveCount(4);
  await page.locator('#quick-title').fill('브라우저 빠른 할 일');
  await page.locator('#quick-form button[type="submit"]').click();
  let quickRow = page.locator('.row').filter({ hasText: '브라우저 빠른 할 일' });
  await expect(quickRow).toBeVisible();
  await quickRow.locator('button[data-action="move"]:visible').last().click();
  await page.getByRole('button', { name: '오늘', exact: true }).click();
  await openToday(page);
  await expect(page.locator('.task-title', { hasText: '브라우저 빠른 할 일' })).toBeVisible();

  await page.locator('button[data-action="nav"]:visible').click();
  await page.getByRole('button', { name: '폴더 만들기' }).click();
  await page.locator('#folder-title').fill('브라우저 폴더');
  await page.locator('#add-folder-form button.primary').click();

  quickRow = page.locator('.row').filter({ hasText: '브라우저 빠른 할 일' });
  await quickRow.locator('button[data-action="move"]:visible').last().click();
  await page.locator('#move-folder').selectOption({ label: '브라우저 폴더' });
  await page.locator('#folder-move-form button.primary').click();

  await quickRow.locator('button[data-action="move"]:visible').last().click();
  const tomorrow = await page.evaluate(() => {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return [
      String(value.getFullYear()).padStart(4, '0'),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  });
  await page.locator('#move-date').fill(tomorrow);
  await page.locator('#schedule-form button.primary').click();
  await expect(page.locator('.task-title', { hasText: '브라우저 빠른 할 일' })).toHaveCount(0);
  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect(page.locator('.task-title', { hasText: '브라우저 빠른 할 일' })).toBeVisible();

  const stateBeforeReload = await page.evaluate((key) => window.localStorage.getItem(key), DEMO_KEY);
  await page.reload();
  await openToday(page);
  await expect(page.locator('.task-title', { hasText: '브라우저 빠른 할 일' })).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DEMO_KEY)).toBe(stateBeforeReload);
  expect(await page.evaluate(() => window.localStorage.getItem('flow:standalone:sentinel'))).toBe('  keep exact bytes  ');
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && entry.key !== DEMO_KEY)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);

  const screenshotDir = path.join(process.cwd(), 'docs', 'content-audit', '2026-09-01-flowme-personal-workspace-v4-1-poc-local-validation-assets');
  await page.screenshot({ path: path.join(screenshotDir, 'standalone-390x844.png'), fullPage: false });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await openToday(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(screenshotDir, 'standalone-844x390.png'), fullPage: false });
  expect(errors).toEqual([]);
});
