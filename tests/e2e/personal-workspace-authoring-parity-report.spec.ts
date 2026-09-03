import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-authoring-workspace-parity-report-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-authoring-workspace-parity-report-assets',
);
const VIEWPORTS = [
  { label: '320x700', width: 320, height: 700 },
  { label: '375x812', width: 375, height: 812 },
  { label: '390x844', width: 390, height: 844 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('authoring parity report presents final evidence honestly and writes no storage', async ({ page }) => {
  const browserErrors: string[] = [];
  await page.addInitScript(() => {
    type ReportWindow = Window & typeof globalThis & { __authoringReportStorageCalls: string[] };
    const reportWindow = window as ReportWindow;
    reportWindow.__authoringReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() { reportWindow.__authoringReportStorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { reportWindow.__authoringReportStorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { reportWindow.__authoringReportStorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /작성에서 개인공간까지/u })).toBeVisible();
  await expect(page.locator('#metric-react')).toHaveText('256 / 256');
  await expect(page.locator('#metric-standalone-node')).toHaveText('39 / 39');
  await expect(page.locator('#metric-standalone-browser')).toHaveText('21 / 21');
  await expect(page.locator('#metric-root-browser')).toHaveText('37 / 37');
  await expect(page.locator('#metric-full-tests')).toHaveText('1,520 / 1,521');
  await expect(page.locator('#final-verdict')).toHaveText('통합 PoC 시나리오 통과');
  await expect(page.locator('#open-standalone')).toHaveAttribute(
    'href',
    '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
  );

  await expect(page.locator('.scenario')).toHaveCount(8);
  const filterCases = [
    { name: '통과 7', count: 7 },
    { name: '부분 1', count: 1 },
    { name: '전체 8', count: 8 },
  ] as const;
  for (const filterCase of filterCases) {
    await page.getByRole('button', { name: filterCase.name, exact: true }).click();
    await expect(page.locator('.scenario:visible')).toHaveCount(filterCase.count);
  }

  await expect(page.getByRole('heading', { name: '기존 운영 데이터 불변 증거' })).toBeVisible();
  await expect(page.locator('#boundary')).toContainText('localStorage.clear()');
  await expect(page.locator('#boundary')).toContainText('0건');
  await expect(page.locator('#remaining')).toContainText('Android Chrome');
  await expect(page.locator('#remaining')).toContainText('관찰 사용자 수');
  await expect(page.locator('#remaining')).toContainText('0명');

  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __authoringReportStorageCalls: string[] }
  ).__authoringReportStorageCalls)).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('authoring parity report has no broken images, horizontal overflow, or covered primary action', async ({ page }) => {
  test.setTimeout(90_000);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /작성에서 개인공간까지/u })).toBeVisible();

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

    const brokenImages = await page.locator('img').evaluateAll((images) => images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')));
    expect(brokenImages, `${viewport.label} broken images`).toEqual([]);

    const primary = page.locator('#open-standalone');
    await primary.scrollIntoViewIfNeeded();
    expect(await primary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height >= 48 && Boolean(hit && (hit === element || element.contains(hit)));
    }), `${viewport.label} primary action is visible and clickable`).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `report-${viewport.label}.png`),
      fullPage: false,
    });
  }

  expect(browserErrors).toEqual([]);
});
