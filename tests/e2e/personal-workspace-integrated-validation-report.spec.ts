import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-flow-poc-validation-report-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const EXPECTED_POC_FILE = '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html';
const REQUIRED_VIEWPORTS = [
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
];

test('integrated validation report filters evidence, records review input, opens the canonical PoC, and writes no storage', async ({ page }) => {
  const storageCalls: Array<{ method: string; key?: string }> = [];
  const errors: string[] = [];

  await page.exposeFunction(
    '__recordValidationReportStorage',
    (entry: { method: string; key?: string }) => storageCalls.push(entry),
  );
  await page.addInitScript(() => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    type ReportWindow = Window & typeof globalThis & {
      __recordValidationReportStorage: (
        entry: { method: string; key?: string },
      ) => Promise<void>;
    };
    const reportWindow = window as ReportWindow;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      void reportWindow.__recordValidationReportStorage({ method: 'setItem', key });
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      void reportWindow.__recordValidationReportStorage({ method: 'removeItem', key });
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      void reportWindow.__recordValidationReportStorage({ method: 'clear' });
      return originalClear.call(this);
    };
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /조작 가능한 통합 흐름을 다듬었습니다/u })).toBeVisible();
  await expect(page.locator('#open-integrated-poc')).toHaveAttribute(
    'href',
    EXPECTED_POC_FILE,
  );
  await expect(page.locator('#metric-poc')).toHaveText('76 / 76');
  await expect(page.locator('#metric-standalone')).toHaveText('30 / 30');
  await expect(page.locator('#metric-full-tests')).toHaveText('1,561 / 1,561');
  await expect(page.locator('#browser-proof-status')).toHaveText('37 / 37');

  await page.getByRole('button', { name: '부분 3' }).click();
  await expect(page.locator('.scenario-card:visible')).toHaveCount(3);
  await page.getByRole('button', { name: '전체 8' }).click();
  await expect(page.locator('.scenario-card:visible')).toHaveCount(8);

  for (const input of await page.locator('[data-review-task]').all()) await input.check();
  await expect(page.locator('#review-progress-label')).toHaveText('5 / 5 직접 확인');
  await page.getByRole('button', { name: '수정 후 재검증' }).click();
  await page.locator('#review-note').fill('Calendar 연결을 먼저 확인합니다.');
  await page.locator('#copy-review').click();
  await expect(page.locator('#copy-feedback')).not.toBeEmpty();

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src')),
  );
  expect(brokenImages).toEqual([]);
  expect(storageCalls).toEqual([]);
  expect(errors).toEqual([]);

  const pocUrl = new URL(EXPECTED_POC_FILE, REPORT_URL).href;
  await page.goto(pocUrl);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
});

test('integrated validation report has no overflow, browser errors, or covered primary action in five viewports', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-flow-poc-validation-report-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of REQUIRED_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /조작 가능한 통합 흐름을 다듬었습니다/u })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

    const primaryAction = page.locator('#open-integrated-poc');
    await primaryAction.scrollIntoViewIfNeeded();
    const clickable = await primaryAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    });
    expect(clickable, `${viewport.label} primary action is clickable`).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(screenshotDir, `report-${viewport.label}.png`),
      fullPage: false,
    });
  }

  expect(errors).toEqual([]);
});
