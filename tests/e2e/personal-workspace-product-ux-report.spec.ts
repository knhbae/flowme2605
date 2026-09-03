import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-product-ux-validation-report-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-product-ux-validation-report-assets',
);
const VIEWPORTS = [
  { label: '320x700', width: 320, height: 700 },
  { label: '375x812', width: 375, height: 812 },
  { label: '390x844', width: 390, height: 844 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('product UX report reconciles all three sources and final evidence without storage writes', async ({ page }) => {
  const browserErrors: string[] = [];
  await page.addInitScript(() => {
    type ReportWindow = Window & typeof globalThis & { __productUxReportStorageCalls: string[] };
    const reportWindow = window as ReportWindow;
    reportWindow.__productUxReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() { reportWindow.__productUxReportStorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { reportWindow.__productUxReportStorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { reportWindow.__productUxReportStorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /세 결과물을 하나의/u })).toBeVisible();
  await expect(page.locator('.source')).toHaveCount(3);
  await expect(page.locator('.scenario')).toHaveCount(8);
  await expect(page.locator('#final-verdict')).toHaveText('P0 제품형 통합 흐름 통과');
  await expect(page.locator('#metric-writes')).toHaveText('0건');
  await expect(page.locator('#boundary-writes')).toHaveText('0건');
  await expect(page.locator('#boundary-clear')).toHaveText('0건');
  await expect(page.locator('#boundary-bytes')).toHaveText('동일');
  await expect(page.locator('#viewport-results .tag.done')).toHaveCount(6);
  await expect(page.locator('body')).not.toContainText(/집계 중|검증 중|비교 중|대기/u);
  await expect(page.locator('#remaining')).toContainText('Android Chrome');
  await expect(page.locator('#remaining')).toContainText('iOS Safari');
  await expect(page.locator('#remaining')).toContainText('0명');

  const expectedVisible = [
    { label: '전체 48', count: 5, note: '48개 표시' },
    { label: '이번 UX 17', count: 1, note: '17개 표시' },
    { label: '실기 7', count: 1, note: '7개 표시' },
    { label: '결정 8', count: 1, note: '8개 표시' },
    { label: '후속 12', count: 1, note: '12개 표시' },
    { label: '회귀 4', count: 1, note: '4개 표시' },
  ] as const;
  for (const expected of expectedVisible) {
    await page.getByRole('button', { name: expected.label, exact: true }).click();
    await expect(page.locator('.trace-row:visible')).toHaveCount(expected.count);
    await expect(page.locator('#filter-note')).toHaveText(expected.note);
  }

  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __productUxReportStorageCalls: string[] }
  ).__productUxReportStorageCalls)).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('product UX report is readable at all six target viewports', async ({ page }) => {
  test.setTimeout(90_000);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /세 결과물을 하나의/u })).toBeVisible();

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label}: horizontal overflow`).toBeLessThanOrEqual(1);
    const brokenImages = await page.locator('img').evaluateAll((images) => images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')));
    expect(brokenImages, `${viewport.label}: broken images`).toEqual([]);

    const primary = page.getByRole('link', { name: '조작형 HTML 열기', exact: true });
    await primary.scrollIntoViewIfNeeded();
    expect(await primary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height >= 48 && Boolean(hit && (hit === element || element.contains(hit)));
    }), `${viewport.label}: report primary action`).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `report-${viewport.label}.png`),
      fullPage: false,
    });
  }
  expect(browserErrors).toEqual([]);
});
