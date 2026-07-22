import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

const evidenceDir = process.env.FLOW_EVIDENCE_DIR;
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function capture(page: Page, filename: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function savedFlowRecords(page: Page) {
  return page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith('flow:saved:'))
      .sort()
      .map((key) => [key, localStorage.getItem(key)]),
  ));
}

test('mobile public save exposes whole-Flow receipt, four next paths, and direct Flow export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const savedReceipt = await savePublicFlow(
    page,
    page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }),
  );
  await openSavedPublicFlow(page, savedReceipt);

  const hub = page.getByTestId('my-flow-post-save-panel');
  await expect(hub.getByTestId('my-flow-post-save-action-hub')).toBeVisible();
  await expect(hub.getByTestId('my-flow-post-save-open-first')).toHaveText('첫 할 일 시작');
  await expect(hub.getByTestId('my-flow-post-save-view-flow')).toHaveText('전체 Flow 보기');
  await expect(hub.getByTestId('my-flow-post-save-open-calendar')).toHaveAttribute('href', '/calendar');
  await expect(hub.getByTestId('my-flow-post-save-open-export')).toHaveText('가져가기');
  await expect(hub.getByTestId('my-flow-post-save-metrics').locator('[data-metric="items"]')).toContainText('10개');
  await expect(hub.getByTestId('my-flow-post-save-metrics').locator('[data-metric="undated"]')).toContainText('10개');

  await hub.getByTestId('my-flow-post-save-open-export').click();
  const exportPanel = hub.getByTestId('my-flow-export-panel');
  await expect(exportPanel).toBeVisible();
  await expect(exportPanel).toHaveAttribute('data-export-scope', 'flow');
  await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toContainText('Flow 전체 · 10개');
  await capture(page, '01-public-undated-decision-hub-mobile.png');

  const recordsBeforeReload = await savedFlowRecords(page);
  await page.reload();
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  expect(await savedFlowRecords(page)).toEqual(recordsBeforeReload);
});

test('wide dated Flow receipt separates schedule summary, whole outline, and actions', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  await page.getByTestId('flow-map-save-all').click();

  const hub = page.getByTestId('my-flow-post-save-panel');
  await expect(hub.getByTestId('my-flow-post-save-metrics').locator('[data-metric="items"]')).toContainText('5개');
  await expect(hub.getByTestId('my-flow-post-save-metrics').locator('[data-metric="date-range"]')).toContainText('7월 16일 - 8월 15일');
  await expect(hub.getByTestId('my-flow-post-save-artifact').getByTestId('my-flow-post-save-step')).toHaveCount(5);
  await capture(page, '02-moving-decision-hub-wide.png');

  await hub.getByTestId('my-flow-post-save-open-first').click();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByTestId('my-flow-row-detail').or(page.getByTestId('my-flow-inline-detail')).first()).toBeVisible();
});

test('multi-Flow receipt chooses an honest Flow scope before opening export', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/curated-opic-mock-course');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2030-09-01');
  await page.getByTestId('flow-map-save-all').click();

  const hub = page.getByTestId('my-flow-post-save-panel');
  await expect(hub).toHaveAttribute('data-receipt-flow-count', '2');
  await expect(hub.getByTestId('my-flow-post-save-open-export')).toHaveText('Flow별 가져가기');
  await hub.getByTestId('my-flow-post-save-open-export').click();
  const picker = hub.getByTestId('my-flow-post-save-export-picker');
  await expect(picker.getByTestId('my-flow-post-save-export-flow')).toHaveCount(2);
  await expect(picker.getByTestId('my-flow-export-panel')).toHaveCount(0);
  await picker.getByTestId('my-flow-post-save-export-flow').first().click();
  await expect(picker.getByTestId('my-flow-export-panel')).toBeVisible();
  await capture(page, '03-multi-flow-export-scope-wide.png');
});

test('review-held receipt preserves the artifact without exposing execution actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=baby-health-schedule');
  const hub = page.getByTestId('my-flow-post-save-panel');
  await expect(hub.getByTestId('my-flow-post-save-confirmation')).toHaveText('저장 기록 보관됨');
  await expect(hub.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(hub.getByTestId('my-flow-post-save-action-hub')).toHaveCount(0);
  await expect(hub.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
  await expect(hub.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
  await expect(hub.getByTestId('my-flow-post-save-open-calendar')).toHaveCount(0);
  await expect(hub.getByTestId('my-flow-post-save-open-export')).toHaveCount(0);
  await capture(page, '04-held-receipt-mobile.png');
});
