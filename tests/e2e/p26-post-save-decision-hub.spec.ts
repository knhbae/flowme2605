import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
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

test('mobile public save exposes one honest receipt action before Flow-level export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const savedReceipt = await savePublicFlow(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await expect(savedReceipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
  await expect(savedReceipt.locator('[data-action-priority="secondary"]')).toHaveCount(0);
  await expect(savedReceipt.getByTestId('public-flow-saved-receipt-status')).toContainText('10');
  await openSavedPublicFlow(page, savedReceipt);

  const flow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'record');
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  const exportPanel = exportSurface.getByTestId('my-flow-export-panel');
  await expect(exportPanel).toBeVisible();
  await expect(exportPanel).toHaveAttribute('data-export-scope', 'flow');
  await expect(exportPanel).toHaveAttribute('data-export-included-count', '10');
  await capture(page, '01-public-undated-decision-hub-mobile.png');

  const recordsBeforeReload = await savedFlowRecords(page);
  await page.reload();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'record');
  expect(await savedFlowRecords(page)).toEqual(recordsBeforeReload);
});

test('wide dated Flow receipt separates schedule summary, whole outline, and actions', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const receipt = await savePublicFlow(page, page.getByTestId('public-flow-save-primary'));
  await expect(receipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
  await expect(receipt.getByTestId('public-flow-saved-receipt-status')).toContainText('24');
  await capture(page, '02-moving-decision-hub-wide.png');

  await openSavedPublicFlow(page, receipt);
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
  await expect(flow.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');
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
  await expect(hub.locator('[data-action-priority="primary"]')).toHaveCount(1);
  await expect(hub.getByTestId('my-flow-post-save-open-export')).toHaveCount(0);
  await hub.getByTestId('my-flow-post-save-view-flow').click();
  await expect(hub).toHaveCount(0);
  const firstRow = page.getByTestId('my-flow-library-row').first();
  const firstSlug = await firstRow.getAttribute('data-flow-slug');
  expect(firstSlug).toBeTruthy();
  const flow = await openMyFlowLibraryFlow(page, firstSlug!, 'record');
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  await expect(exportSurface.getByTestId('my-flow-export-panel')).toBeVisible();
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
