import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-a0-decision-packet-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const REQUIRED_VIEWPORTS = [
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('A0 packet exposes six routed decisions, filters them, and writes no storage', async ({ page }) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    type AuditWindow = Window & typeof globalThis & { __a0StorageCalls: string[] };
    const auditWindow = window as AuditWindow;
    auditWindow.__a0StorageCalls = [];
    Storage.prototype.setItem = function setItem() { auditWindow.__a0StorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { auditWindow.__a0StorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { auditWindow.__a0StorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /여섯 질문을 닫고/u })).toBeVisible();
  await expect(page.locator('.decision')).toHaveCount(6);
  await expect(page.locator('.metric').filter({ hasText: 'Primary 결정 필요' })).toContainText('0');
  await expect(page.locator('.metric').filter({ hasText: '현재 열린 gap' })).toContainText('79');
  await expect(page.getByRole('link', { name: '전체 단계 계획' })).toHaveAttribute(
    'href',
    '2026-09-02-flowme-integrated-poc-gap-closure-plan-ko.html',
  );

  const filters = [
    { name: '기존 결정 계승 3', count: 3 },
    { name: 'PoC 선택 2', count: 2 },
    { name: '범위 보류 1', count: 1 },
    { name: '전체 6', count: 6 },
  ] as const;
  for (const filter of filters) {
    await page.getByRole('button', { name: filter.name }).click();
    await expect(page.locator('.decision:visible')).toHaveCount(filter.count);
  }

  await page.getByRole('button', { name: '완료 기준 복사' }).click();
  await expect(page.locator('#copy-status')).not.toHaveText('저장 또는 전송하지 않음');
  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __a0StorageCalls: string[] }
  ).__a0StorageCalls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('A0 packet has no horizontal overflow, browser errors, or covered primary action in five viewports', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-poc-a0-decision-packet-assets',
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

    const primary = page.getByRole('link', { name: '결정 하나씩 보기' });
    await primary.scrollIntoViewIfNeeded();
    expect(await primary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
        Math.min(window.innerHeight - 1, rect.top + rect.height / 2),
      );
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    }), viewport.label + ' primary action is clickable').toBe(true);

    await page.getByRole('button', { name: 'PoC 선택 2' }).click();
    await expect(page.locator('.decision:visible')).toHaveCount(2);
    await page.screenshot({
      path: path.join(screenshotDir, 'a0-' + viewport.label + '.png'),
      fullPage: false,
    });
  }
  expect(errors).toEqual([]);
});
