import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

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

async function openSavedTransferConfirmation(panel: Locator, destination: Locator) {
  await destination.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  return confirmation;
}

async function confirmSavedClipboardTransfer(panel: Locator, destination: Locator) {
  const confirmation = await openSavedTransferConfirmation(panel, destination);
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const receipt = panel.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute('data-outcome', 'success');
  return receipt;
}

async function acknowledgeSavedTransfer(receipt: Locator) {
  const acknowledge = receipt.getByTestId('flow-transfer-success-close');
  if (await acknowledge.isVisible().catch(() => false)) await acknowledge.click();
}

async function savePublicFlowAndGetFocusedSlug(page: Page, button: Locator) {
  await button.click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
  });
  return new URL(page.url()).searchParams.get('flow') ?? '';
}

test('capabilityResult=off public export keeps legacy parity and saved export confirms transfer', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(
    page,
    '/f/moving-d30-basic?capabilityResult=off&quickLocalResult=off',
  );
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('이사일').fill('2026-08-30');

  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await expect(exportEntry.getByTestId('public-flow-export-secondary-toggle')).toContainText('옮기기');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  const exportBranch = page.getByTestId('public-flow-export-branch');
  await expect(exportBranch).toBeVisible();
  const panel = exportBranch.getByTestId('my-flow-export-panel');
  await expect(panel.getByTestId('my-flow-export-scope-control')).toContainText('계획 전체');
  await expect(panel.getByTestId('my-flow-export-scope-summary')).toContainText('계획 전체');
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

  await gotoLegacySavedPlanLibraryRoute(
    page,
    '/f/vehicle-inspection-prep?capabilityResult=off&quickLocalResult=off',
  );
  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  const undatedEntry = page.getByTestId('public-flow-export-secondary-entry');
  await expect(undatedEntry.getByTestId('public-flow-export-secondary-toggle')).toContainText('옮기기');
  await undatedEntry.getByTestId('public-flow-export-secondary-toggle').click();
  const undatedBranch = page.getByTestId('public-flow-export-branch');
  await expect(undatedBranch).toBeVisible();
  const undatedCalendar = undatedBranch.getByTestId('my-flow-export-calendar');
  await expect(undatedCalendar).toHaveCount(0);
  await expect(
    undatedBranch.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
  ).toHaveCount(0);
  await undatedBranch.getByTestId('public-flow-export-branch-close').click();
  await expect(undatedBranch).toHaveCount(0);

  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );
  const vehicleFlowSlug = await savePublicFlowAndGetFocusedSlug(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  let vehicleFlow = await openMyFlowLibraryFlow(page, vehicleFlowSlug, 'plan');
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
  const vehicleItemEditor = page.getByTestId('saved-flow-editor-item');
  await expect(vehicleItemEditor).toBeVisible();
  await vehicleItemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-07-28');
  await vehicleItemEditor.getByTestId('my-flow-detail-save-changes').click();
  await expect(vehicleItemEditor).toHaveCount(0);
  const vehiclePlanEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(vehiclePlanEditor).toBeVisible();
  await expect(vehiclePlanEditor).toHaveAttribute('data-editor-status', 'dirty-valid');
  const vehicleDiscardPrompt = vehiclePlanEditor.getByTestId('flow-editor-discard-prompt');
  await expect(vehicleDiscardPrompt).toHaveCount(0);
  const vehiclePlanSave = vehiclePlanEditor.getByTestId('saved-flow-editor-save');
  await expect(vehiclePlanSave).toBeEnabled();
  await vehiclePlanSave.click();
  await expect(vehiclePlanEditor).toHaveCount(0);
  await closeOpenMyFlowItemDetail(page);

  vehicleFlow = await openMyFlowLibraryFlow(page, vehicleFlowSlug, 'record');
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
  const scheduledConfirmation = await openSavedTransferConfirmation(vehicleExport, scheduledCalendar);
  const scheduledDownloadPromise = page.waitForEvent('download');
  await scheduledConfirmation.getByTestId('my-flow-transfer-confirm').click();
  const scheduledDownload = await scheduledDownloadPromise;
  const scheduledDownloadPath = await scheduledDownload.path();
  expect(scheduledDownloadPath).toBeTruthy();
  const scheduledIcs = fs.readFileSync(scheduledDownloadPath!, 'utf8');
  expect((scheduledIcs.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  await expect(vehicleExport.getByTestId('my-flow-transfer-receipt')).toHaveAttribute(
    'data-output-count',
    '1',
  );
  expect(errors).toEqual([]);
});

test('whole, selected, and current item exports share scope language and actual row counts', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=source-backed&view=flows');

  let flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'record');
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  const panel = exportSurface.getByTestId('my-flow-export-panel');
  await expect(panel.getByTestId('my-flow-export-scope-flow')).toContainText('계획 전체');
  await panel.getByTestId('my-flow-export-scope-selected').click();
  const choices = panel.getByTestId('my-flow-export-selectable-item');
  await choices.nth(0).getByRole('checkbox').check();
  await choices.nth(1).getByRole('checkbox').check();
  await expect(panel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
  let transferReceipt = await confirmSavedClipboardTransfer(
    panel,
    panel.getByTestId('my-flow-export-memo'),
  );
  await expect(transferReceipt).toHaveAttribute('data-output-count', '2');
  await expect(transferReceipt).toContainText('선택한 항목');
  const copiedMemo = await page.evaluate(() => navigator.clipboard.readText());
  expect((copiedMemo.match(/^\d+\. /gmu) ?? []).length).toBe(2);
  await capture(page, panel, '02-selected-items-mobile.png');
  await acknowledgeSavedTransfer(transferReceipt);

  flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'plan');
  const firstRow = flow.getByTestId('my-flow-execution-row-shell').first();
  await firstRow.getByRole('button', { name: /열기/ }).click();
  const detail = getOpenMyFlowItemDetail(page);
  const currentExport = detail.getByTestId('my-flow-detail-portable-export');
  if (await currentExport.locator(':scope > summary').count()) {
    await currentExport.locator(':scope > summary').click();
  }
  transferReceipt = await confirmSavedClipboardTransfer(
    currentExport,
    currentExport.getByTestId('my-flow-detail-copy-portable-text'),
  );
  const currentReceipt = transferReceipt;
  await expect(currentReceipt).toHaveAttribute('data-scope', 'item');
  await expect(currentReceipt).toHaveAttribute('data-output-count', '1');
  await expect(currentReceipt).toContainText('현재 항목');
  await acknowledgeSavedTransfer(currentReceipt);

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
  await installLegacySavedPlanLibraryNavigation(page);
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/washer-tub-clean-monthly');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-20');

  const savedFlowSlug = await savePublicFlowAndGetFocusedSlug(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  const flow = await openMyFlowLibraryFlow(page, savedFlowSlug, 'record');
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
  const confirmation = await openSavedTransferConfirmation(panel, calendar);
  const downloadPromise = page.waitForEvent('download');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=20');
  await expect(panel.getByTestId('my-flow-transfer-receipt')).toHaveAttribute(
    'data-output-count',
    '1',
  );
  await capture(page, panel, '03-routine-series-mobile.png');
  expect(errors).toEqual([]);
});
