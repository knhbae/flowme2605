import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-stage-1-contract-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const REQUIRED_VIEWPORTS = [
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('stage 1 packet exposes ownership, date, fidelity, and six receipt states without storage writes', async ({ page }) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    type AuditWindow = Window & typeof globalThis & { __stage1StorageCalls: string[] };
    const auditWindow = window as AuditWindow;
    auditWindow.__stage1StorageCalls = [];
    Storage.prototype.setItem = function setItem() { auditWindow.__stage1StorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { auditWindow.__stage1StorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { auditWindow.__stage1StorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /원본은 지키고/u })).toBeVisible();
  await expect(page.locator('.owner-card')).toHaveCount(4);
  await expect(page.locator('.date-step')).toHaveCount(4);
  await expect(page.locator('.rule')).toHaveCount(3);
  await expect(page.getByRole('tab')).toHaveCount(6);
  await expect(page.locator('.fidelity tbody tr')).toHaveCount(5);

  const receiptStates = [
    ['저장 중', '변경 내용을 저장하는 중…'],
    ['같은 내용', '이미 같은 내용입니다'],
    ['실패', '저장하지 못했습니다'],
    ['취소', '변경을 취소했습니다'],
    ['되돌림', '저장 전으로 되돌렸습니다'],
    ['성공', '내 계획을 저장했습니다'],
  ] as const;
  for (const [tabName, heading] of receiptStates) {
    await page.getByRole('tab', { name: tabName }).click();
    await expect(page.locator('#receipt-title')).toHaveText(heading);
  }

  const success = page.getByRole('tab', { name: '성공' });
  await success.focus();
  await success.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '저장 중' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '저장 중' }).press('End');
  await expect(page.getByRole('tab', { name: '되돌림' })).toHaveAttribute('aria-selected', 'true');

  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __stage1StorageCalls: string[] }
  ).__stage1StorageCalls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('stage 1 packet has no horizontal overflow, browser errors, or covered controls in five viewports', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-poc-stage-1-contract-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of REQUIRED_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), viewport.label + ' horizontal overflow').toBeLessThanOrEqual(1);
    await page.screenshot({
      path: path.join(screenshotDir, 'hero-' + viewport.label + '.png'),
      fullPage: false,
    });

    const failureTab = page.getByRole('tab', { name: '실패' });
    await failureTab.scrollIntoViewIfNeeded();
    expect(await failureTab.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
        Math.min(window.innerHeight - 1, rect.top + rect.height / 2),
      );
      return rect.width >= 44 && rect.height >= 44
        && Boolean(hit && (hit === element || element.contains(hit)));
    }), viewport.label + ' state control is reachable').toBe(true);
    await failureTab.click();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, 'stage-1-' + viewport.label + '.png'),
      fullPage: false,
    });
  }
  expect(errors).toEqual([]);
});
