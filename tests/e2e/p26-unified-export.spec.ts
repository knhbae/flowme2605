import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { openPublicDetailWorkspaceForDeepInspection } from './helpers/open-public-detail-workspace';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

test.beforeEach(async ({ page }) => {
  await openPublicDetailWorkspaceForDeepInspection(page);
});

const evidenceDir = process.env.FLOWME_P26_16_EVIDENCE_DIR;

async function capture(page: Page, locator: Locator, filename: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  const platformChrome = page.locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]');
  await platformChrome.evaluateAll((nodes) => nodes.forEach((node) => {
    const element = node as HTMLElement;
    element.dataset.captureVisibility = element.style.visibility;
    element.style.visibility = 'hidden';
  }));
  await locator.screenshot({ path: path.join(screenshots, filename) });
  await platformChrome.evaluateAll((nodes) => nodes.forEach((node) => {
    const element = node as HTMLElement;
    element.style.visibility = element.dataset.captureVisibility ?? '';
    delete element.dataset.captureVisibility;
  }));
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('public whole Flow export predicts dates, output count, and result receipt', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('이사일').fill('2026-08-30');

  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  const panel = exportEntry.getByTestId('my-flow-export-panel');
  await expect(panel.getByTestId('my-flow-export-scope-control')).toContainText('Flow 전체');
  await expect(panel.getByTestId('my-flow-export-scope-summary')).toContainText('Flow 전체');
  const calendar = panel.getByRole('button', { name: /캘린더 파일 받기/ });
  const previewCount = Number(await calendar.getAttribute('data-export-count'));
  expect(previewCount).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent('download');
  await calendar.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(previewCount);
  const receipt = panel.getByTestId('flow-export-result-receipt');
  await expect(receipt).toHaveAttribute('data-export-output-count', String(previewCount));
  await expect(receipt).toHaveAttribute('data-export-scope', 'flow');
  await expect(receipt.getByTestId('flow-export-result-filename')).toHaveText(download.suggestedFilename());
  await capture(page, panel, '01-public-whole-flow-mobile.png');

  await page.goto('/f/vehicle-inspection-prep');
  const undatedEntry = page.getByTestId('public-flow-export-secondary-entry');
  await undatedEntry.getByTestId('public-flow-export-secondary-toggle').click();
  const undatedCalendar = undatedEntry.getByTestId('my-flow-export-calendar');
  await expect(undatedCalendar).toHaveCount(0);
  await expect(
    undatedEntry.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
  ).toHaveCount(0);
  await undatedEntry.getByTestId('public-flow-export-secondary-toggle').click();

  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await page.goto('/my?view=flows');
  let vehicleFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'plan');
  const firstVehicleRow = vehicleFlow.getByTestId('my-flow-execution-row-shell').first();
  await firstVehicleRow.getByRole('button', { name: /열기/ }).click();
  const vehicleDetail = getOpenMyFlowItemDetail(page);
  const quickEdit = vehicleDetail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const readSummary = vehicleDetail.getByTestId('my-flow-detail-read-summary');
    if ((await readSummary.getAttribute('open')) === null) {
      await readSummary.locator(':scope > summary').click();
    }
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  await vehicleDetail.getByTestId('my-flow-detail-date-input').fill('2026-07-28');
  await vehicleDetail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);

  vehicleFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'record');
  const vehicleExport = vehicleFlow.getByTestId('my-flow-export-surface');
  await vehicleExport.getByTestId('my-flow-export-entry').click();
  const scheduledCalendar = vehicleExport.getByTestId('my-flow-export-calendar');
  await expect(scheduledCalendar).toHaveAttribute('data-export-count', '1');
  const moreFormats = vehicleExport.getByTestId('my-flow-export-more-formats');
  if (
    (await moreFormats.isVisible().catch(() => false)) &&
    (await moreFormats.getAttribute('open')) === null
  ) {
    await moreFormats.locator('summary').click();
  }
  await expect(scheduledCalendar).toBeVisible();
  const scheduledDownloadPromise = page.waitForEvent('download');
  await scheduledCalendar.click();
  const scheduledDownload = await scheduledDownloadPromise;
  const scheduledDownloadPath = await scheduledDownload.path();
  expect(scheduledDownloadPath).toBeTruthy();
  const scheduledIcs = fs.readFileSync(scheduledDownloadPath!, 'utf8');
  expect((scheduledIcs.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  await expect(vehicleExport.getByTestId('flow-export-result-receipt')).toHaveAttribute(
    'data-export-output-count',
    '1',
  );
  expect(errors).toEqual([]);
});

test('whole, selected, and current item exports share scope language and actual row counts', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&view=flows');

  let flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'record');
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  const panel = exportSurface.getByTestId('my-flow-export-panel');
  await expect(panel.getByTestId('my-flow-export-scope-flow')).toContainText('Flow 전체');
  await panel.getByTestId('my-flow-export-scope-selected').click();
  const choices = panel.getByTestId('my-flow-export-selectable-item');
  await choices.nth(0).getByRole('checkbox').check();
  await choices.nth(1).getByRole('checkbox').check();
  await expect(panel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
  await panel.getByTestId('my-flow-export-memo').click();
  await expect(panel.getByTestId('flow-export-result-receipt')).toHaveAttribute(
    'data-export-output-count',
    '2',
  );
  await expect(panel.getByTestId('flow-export-result-receipt')).toContainText('선택 항목');
  const copiedMemo = await page.evaluate(() => navigator.clipboard.readText());
  expect((copiedMemo.match(/^\d+\. /gmu) ?? []).length).toBe(2);
  await capture(page, panel, '02-selected-items-mobile.png');

  flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'plan');
  const firstRow = flow.getByTestId('my-flow-execution-row-shell').first();
  await firstRow.getByRole('button', { name: /열기/ }).click();
  const detail = getOpenMyFlowItemDetail(page);
  const currentExport = detail.getByTestId('my-flow-detail-portable-export');
  if (await currentExport.locator(':scope > summary').count()) {
    await currentExport.locator(':scope > summary').click();
  }
  await currentExport.getByTestId('my-flow-detail-copy-portable-text').click();
  const currentReceipt = currentExport.getByTestId('flow-export-result-receipt');
  await expect(currentReceipt).toHaveAttribute('data-export-scope', 'item');
  await expect(currentReceipt).toHaveAttribute('data-export-output-count', '1');
  await expect(currentReceipt).toContainText('현재 항목');

  await closeOpenMyFlowItemDetail(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library).toBeVisible();
  const wideFlow = library
    .getByTestId('my-flow-library-detail')
    .getByTestId('my-flow-overview-card');
  await expect(wideFlow).toBeVisible();
  let widePanel = wideFlow.locator('[data-testid="my-flow-export-panel"]:visible');
  if ((await widePanel.count()) === 0) {
    await wideFlow.locator('[data-testid="my-flow-export-entry"]:visible').click();
    widePanel = wideFlow.locator('[data-testid="my-flow-export-panel"]:visible');
  }
  await expect(widePanel).toBeVisible();
  await capture(page, widePanel, '04-whole-flow-wide.png');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('routine export reports one series event and keeps the canonical RRULE', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/washer-tub-clean-monthly');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-20');

  const receipt = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
  await openSavedPublicFlow(page, receipt);
  const flow = await openMyFlowLibraryFlow(page, 'washer-tub-clean-monthly', 'record');
  const entry = flow.getByTestId('my-flow-export-surface');
  await entry.getByTestId('my-flow-export-entry').click();
  const panel = entry.getByTestId('my-flow-export-panel');
  const moreFormats = panel.getByTestId('my-flow-export-more-formats');
  if (
    (await moreFormats.isVisible().catch(() => false))
    && (await moreFormats.getAttribute('open')) === null
  ) {
    await moreFormats.locator(':scope > summary').click();
  }
  await expect(panel.getByTestId('my-flow-export-calendar-summary')).toContainText('반복 계획 1개');
  const calendar = panel.getByTestId('my-flow-export-calendar');
  await expect(calendar).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await calendar.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=20');
  await expect(panel.getByTestId('flow-export-result-receipt')).toHaveAttribute(
    'data-export-output-count',
    '1',
  );
  await capture(page, panel, '03-routine-series-mobile.png');
  expect(errors).toEqual([]);
});
