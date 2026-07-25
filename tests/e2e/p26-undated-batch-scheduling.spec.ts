import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P26_14_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function openMobileTray(page: Page) {
  const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  const toggle = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-panel')).toBeVisible();
  return tray;
}

test('undated public Flow supports atomic one and many scheduling with removal undo and ICS parity', async ({ page }) => {
  test.setTimeout(150_000);
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T10:00:00+09:00') });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByTestId('public-flow-date-intent-undated').click();
  await expect(page.getByText('Calendar에는 넣지 않고 My Flow에 저장합니다.')).toBeVisible();
  await capture(page, '01-public-undated-intent-mobile.png');
  await page.getByTestId('public-flow-save-primary-mobile').click();

  await page.goto('/my?view=flows');
  const savedFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
  const prescheduleExport = savedFlow.getByTestId('my-flow-export-surface');
  await prescheduleExport.getByTestId('my-flow-export-entry').click();
  await expect(prescheduleExport.getByTestId('my-flow-export-calendar')).toHaveAttribute(
    'data-export-count',
    '0',
  );
  await expect(prescheduleExport.getByTestId('my-flow-export-calendar')).toBeDisabled();

  await page.goto('/calendar');
  const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  await expect(tray).toContainText('날짜 없는 할 일');
  await expect(tray).toContainText('아직 일정에 놓지 않은 실행 항목');
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('10');
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-toggle')).toHaveAttribute('aria-expanded', 'false');
  await capture(page, '02-undated-inbox-collapsed-mobile.png');

  await openMobileTray(page);
  const trayItems = tray.getByTestId('my-flow-calendar-unscheduled-item');
  await expect(trayItems).toHaveCount(10);
  await expect(tray.getByRole('checkbox', { name: /완료로 표시/ })).toHaveCount(0);

  const firstSelection = trayItems.first().getByRole('checkbox');
  await firstSelection.focus();
  await firstSelection.press('Space');
  await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-07-28');
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-preview')).toHaveText(
    '1개 선택 · Flow 1개 → 7월 28일',
  );
  await capture(page, '03-single-date-preview-mobile.png');
  await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('9');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-execution-row-shell')).toHaveCount(1);

  await tray.getByTestId('my-flow-calendar-unscheduled-undo-action').click();
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('10');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-execution-row-shell')).toHaveCount(0);

  await openMobileTray(page);
  const applyBeforeSelectAll = await tray.getByTestId('my-flow-calendar-unscheduled-apply').boundingBox();
  await tray.getByRole('button', { name: '모두 선택' }).click();
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-preview')).toContainText('10개 선택 · Flow 1개');
  const applyAfterSelectAll = await tray.getByTestId('my-flow-calendar-unscheduled-apply').boundingBox();
  expect(applyBeforeSelectAll).toBeTruthy();
  expect(applyAfterSelectAll).toBeTruthy();
  expect(Math.abs(applyBeforeSelectAll!.x - applyAfterSelectAll!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(applyBeforeSelectAll!.width - applyAfterSelectAll!.width)).toBeLessThanOrEqual(1);
  await tray.getByRole('button', { name: '선택 해제' }).click();

  for (let index = 0; index < 3; index += 1) {
    await tray.getByTestId('my-flow-calendar-unscheduled-item').nth(index).getByRole('checkbox').check();
  }
  await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-07-29');
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-preview')).toHaveText(
    '3개 선택 · Flow 1개 → 7월 29일',
  );
  await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('7');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
  await capture(page, '04-three-items-scheduled-mobile.png');

  await page.reload();
  await expect(page.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('7');
  await page
    .locator('.fc-daygrid-day[data-date="2026-07-29"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);

  const scheduledRow = selectedDay.getByTestId('my-flow-execution-row-shell').first();
  await scheduledRow.getByRole('button', { name: /열기/ }).click();
  const detail = page
    .getByTestId('my-flow-item-detail-sheet')
    .getByTestId('my-flow-item-detail');
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await detail.getByTestId('my-flow-undated-item-date-clear').click();
  await detail.getByTestId('my-flow-detail-save-changes').click();

  await expect(page.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('8');
  await expect(page.getByTestId('my-flow-calendar-unscheduled-undo')).toContainText(
    '1개가 날짜 없는 할 일로 돌아왔습니다.',
  );
  await capture(page, '05-date-removal-undo-mobile.png');
  if (await page.getByTestId('my-flow-calendar-unscheduled-sheet').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }
  await page.getByTestId('my-flow-calendar-unscheduled-undo-action').click();
  await expect(page.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('7');
  await expect(selectedDay.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  const wideTray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  await expect(wideTray).toHaveAttribute('data-layout', 'sidebar');
  await expect(wideTray.getByTestId('my-flow-calendar-unscheduled-panel')).toBeVisible();
  await expect(wideTray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('7');
  await capture(page, '06-undated-inbox-wide.png');

  await page.goto('/my?view=flows');
  const flow = page.locator(
    '[data-testid="my-flow-overview-card"][data-flow-slug="vehicle-inspection-prep"]',
  );
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  await expect(exportSurface.getByTestId('my-flow-export-calendar')).toHaveAttribute(
    'data-export-count',
    '3',
  );
  const downloadPromise = page.waitForEvent('download');
  await exportSurface.getByTestId('my-flow-export-calendar').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  if (evidenceRoot) {
    const downloads = path.join(evidenceRoot, 'downloads');
    fs.mkdirSync(downloads, { recursive: true });
    await download.saveAs(path.join(downloads, 'vehicle-inspection-three-items.ics'));
  }

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(browserErrors).toEqual([]);
});
