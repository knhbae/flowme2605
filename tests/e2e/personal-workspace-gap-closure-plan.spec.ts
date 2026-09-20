import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-gap-closure-plan-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const REQUIRED_VIEWPORTS = [
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('gap closure report exposes the seven phases, filters them, and writes no storage', async ({ page }) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    type ReportWindow = Window & typeof globalThis & { __gapPlanStorageCalls: string[] };
    const reportWindow = window as ReportWindow;
    reportWindow.__gapPlanStorageCalls = [];
    Storage.prototype.setItem = function setItem() { reportWindow.__gapPlanStorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { reportWindow.__gapPlanStorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { reportWindow.__gapPlanStorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /세 결과물을 잃지 않고/u })).toBeVisible();
  await expect(page.locator('.phase')).toHaveCount(7);
  await expect(page.locator('.metric').filter({ hasText: '현재 열린 gap' })).toContainText('79');
  await expect(page.getByRole('link', { name: '조작형 통합 PoC 열기' })).toHaveAttribute(
    'href',
    '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
  );

  const filterCases = [
    { name: '완료', count: 1 },
    { name: '지금', count: 1 },
    { name: '다음', count: 1 },
    { name: '후속', count: 4 },
    { name: '전체', count: 7 },
  ] as const;
  for (const filterCase of filterCases) {
    await page.getByRole('button', { name: filterCase.name, exact: true }).click();
    await expect(page.locator('.phase:visible')).toHaveCount(filterCase.count);
  }

  await page.getByRole('button', { name: '다음 작업 문장 복사' }).click();
  await expect(page.locator('#copy-status')).toContainText('저장 0건');
  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __gapPlanStorageCalls: string[] }
  ).__gapPlanStorageCalls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('gap closure report has no overflow, browser errors, or covered primary action in five viewports', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-poc-gap-closure-plan-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of REQUIRED_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /세 결과물을 잃지 않고/u })).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

    const primary = page.getByRole('link', { name: '조작형 통합 PoC 열기' });
    await primary.scrollIntoViewIfNeeded();
    expect(await primary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
        Math.min(window.innerHeight - 1, rect.top + rect.height / 2),
      );
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    }), `${viewport.label} primary action is clickable`).toBe(true);

    await page.getByRole('button', { name: '지금', exact: true }).click();
    await expect(page.locator('.phase:visible')).toHaveCount(1);
    await page.locator('.phase:visible summary').click();
    await page.screenshot({
      path: path.join(screenshotDir, `plan-${viewport.label}.png`),
      fullPage: false,
    });
  }
  expect(errors).toEqual([]);
});
