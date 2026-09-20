import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p1-functional-gap-closure-report-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p1-functional-gap-closure-report-assets',
);
const VIEWPORTS = [
  { label: '320x700', width: 320, height: 700 },
  { label: '375x812', width: 375, height: 812 },
  { label: '390x844', width: 390, height: 844 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

test('P1 report keeps the three-result trace, final evidence, and local product links honest', async ({ page }) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    type AuditWindow = Window & typeof globalThis & { __p1ReportStorageCalls: string[] };
    const auditWindow = window as AuditWindow;
    auditWindow.__p1ReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() { auditWindow.__p1ReportStorageCalls.push('setItem'); };
    Storage.prototype.removeItem = function removeItem() { auditWindow.__p1ReportStorageCalls.push('removeItem'); };
    Storage.prototype.clear = function clear() { auditWindow.__p1ReportStorageCalls.push('clear'); };
  });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /P1에서 무엇을 닫았고/u })).toBeVisible();
  await expect(page.locator('#sources .source-lanes > article')).toHaveCount(3);
  await expect(page.locator('[data-requirement-id]')).toHaveCount(8);
  await expect(page.locator('#summary')).toContainText('8 / 8');
  await expect(page.locator('#summary')).toContainText('388 / 388');
  await expect(page.locator('#evidence')).toContainText('1,563 / 1,564');
  await expect(page.locator('#evidence')).toContainText('3F1303F89EDDE62FF9452412B223076ECE62CE50F053FC0BB97B0D667070D635');
  await expect(page.locator('body')).not.toContainText(/\{\{FINAL_/u);
  await expect(page.locator('#boundaries')).toContainText('dog-adoption-first-week');
  await expect(page.locator('#boundaries')).toContainText('제품 전체 부분');
  await expect(page.locator('#viewports')).toContainText('실제 Android Chrome');
  await expect(page.locator('#viewports')).toContainText('관찰 사용자');
  await expect(page.locator('#open-p1-standalone')).toHaveAttribute(
    'href',
    './2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
  );
  await expect(page.locator('#open-p1-android')).toHaveAttribute(
    'href',
    './2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
  );

  expect(await page.evaluate(() => (
    window as Window & typeof globalThis & { __p1ReportStorageCalls: string[] }
  ).__p1ReportStorageCalls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('P1 report has no overflow, broken local product link, or covered primary action in six viewports', async ({ page }) => {
  test.setTimeout(90_000);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /P1에서 무엇을 닫았고/u })).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label}: horizontal overflow`).toBeLessThanOrEqual(1);

    const primary = page.locator('#open-p1-standalone');
    await primary.scrollIntoViewIfNeeded();
    expect(await primary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0
        && rect.height >= 48
        && Boolean(hit && (hit === element || element.contains(hit)));
    }), `${viewport.label}: primary product link`).toBe(true);

    const href = await primary.getAttribute('href');
    expect(href).not.toBeNull();
    const linkedPath = path.resolve(path.dirname(REPORT_PATH), href ?? '');
    expect(fs.existsSync(linkedPath), `${viewport.label}: standalone file exists`).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `report-${viewport.label}.png`),
      fullPage: false,
    });
  }
  expect(errors).toEqual([]);
});
