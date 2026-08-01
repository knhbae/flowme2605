import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

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
    await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ),
  ).toBeLessThanOrEqual(1);
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
}

test('undated public Flow supports reversible My Flow batch scheduling and ICS parity', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T10:00:00+09:00') });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );
  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await page.getByTestId('public-flow-save-primary-mobile').click();

  await page.goto('/my?view=flows');
  let savedFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'plan');
  const exportBefore = savedFlow.getByTestId('my-flow-export-surface');
  await exportBefore.getByTestId('my-flow-export-entry').click();
  await expect(exportBefore.getByTestId('my-flow-export-calendar')).toHaveAttribute(
    'data-export-count',
    '0',
  );
  await expect(exportBefore.getByTestId('my-flow-export-calendar')).toBeDisabled();
  await exportBefore.getByRole('button', { name: /옮기기 닫기/ }).click();

  const outline = savedFlow.getByTestId('my-flow-whole-flow-outline');
  await savedFlow.getByTestId('my-flow-batch-mode-toggle').first().click();
  const rows = outline.getByTestId('my-flow-batch-selectable-row');
  await expect(rows).toHaveCount(10);

  await rows.first().getByTestId('my-flow-batch-item-checkbox').check();
  let toolbar = savedFlow.getByTestId('my-flow-batch-toolbar');
  await toolbar.getByTestId('my-flow-batch-open-date-tool').click();
  await toolbar.getByTestId('my-flow-batch-target-date').fill('2026-07-28');
  await expect(toolbar.getByTestId('my-flow-batch-impact-preview')).toContainText('1개가 바뀝니다');
  await toolbar.getByTestId('my-flow-batch-apply-date').click();
  await expect(savedFlow.getByTestId('my-flow-batch-undo')).toContainText('1개 날짜');
  await savedFlow.getByTestId('my-flow-batch-undo-action').click();

  if ((await savedFlow.getByTestId('my-flow-batch-mode-toggle').first().getAttribute('aria-pressed')) !== 'true') {
    await savedFlow.getByTestId('my-flow-batch-mode-toggle').first().click();
  }
  for (let index = 0; index < 3; index += 1) {
    await rows.nth(index).getByTestId('my-flow-batch-item-checkbox').check();
  }
  toolbar = savedFlow.getByTestId('my-flow-batch-toolbar');
  await toolbar.getByTestId('my-flow-batch-open-date-tool').click();
  await toolbar.getByTestId('my-flow-batch-target-date').fill('2026-07-29');
  await expect(toolbar.getByTestId('my-flow-batch-impact-preview')).toContainText('3개가 바뀝니다');
  await capture(page, '01-my-flow-three-item-date-preview-mobile.png');
  await toolbar.getByTestId('my-flow-batch-apply-date').click();

  const overrideCount = await page.evaluate(() =>
    Object.values(
      JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    ).filter((value) => value === '2026-07-29').length
  );
  expect(overrideCount).toBe(3);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(
    page.locator('.fc-daygrid-day[data-date="2026-07-29"] .fc-event'),
  ).toHaveCount(3);
  const selectedDay = await openMyFlowCalendarSelectedDay(page, '2026-07-29');
  await expect(
    selectedDay.getByTestId('my-flow-execution-row-shell'),
  ).toHaveCount(3);
  await capture(page, '02-calendar-three-dated-items-mobile.png');

  await page.goto('/my?view=flows');
  savedFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'record');
  const exportSurface = savedFlow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  await expect(exportSurface.getByTestId('my-flow-export-calendar')).toHaveAttribute(
    'data-export-count',
    '3',
  );
  const moreFormats = exportSurface.getByTestId('my-flow-export-more-formats');
  if (
    (await moreFormats.isVisible().catch(() => false))
    && (await moreFormats.getAttribute('open')) === null
  ) {
    await moreFormats.locator(':scope > summary').click();
  }
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

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await capture(page, '03-my-flow-scheduled-export-wide.png');
  expect(browserErrors).toEqual([]);
});
