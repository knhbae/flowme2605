import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
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
  test.setTimeout(240_000);
  await installLegacySavedPlanLibraryNavigation(page);
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T10:00:00+09:00') });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(capability).toHaveAttribute('data-capability-primary-destination', 'checklist');
  await expect(capability.locator(
    '[data-testid="flow-capability-result-choice"]'
      + '[data-capability-candidate-role="primary"]',
  )).toHaveAttribute('data-capability-output-count', '10');
  await expect(capability.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
    'data-capability-destination',
    'checklist',
  );
  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await expect(page).toHaveURL(/\/my\?view=flows&flow=/u);
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).not.toBe('');

  await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
  let savedFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'plan');
  const exportBefore = savedFlow.getByTestId('my-flow-export-surface');
  await exportBefore.getByTestId('my-flow-export-entry').click();
  await expect(exportBefore.getByTestId('my-flow-export-calendar')).toHaveAttribute(
    'data-export-count',
    '0',
  );
  await expect(exportBefore.getByTestId('my-flow-export-calendar')).toBeDisabled();
  await exportBefore.getByRole('button', { name: /옮기기 닫기/ }).click();

  const storageBeforeEditor = await page.evaluate(() => ({
    dateOverrides: window.localStorage.getItem('flow:my-flow:date-overrides'),
    itemDrafts: window.localStorage.getItem('flow:my-flow:item-drafts'),
  }));
  await savedFlow.getByTestId('my-flow-batch-mode-toggle').first().click();
  let planEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(planEditor).toBeVisible();
  await expect(planEditor.getByTestId('saved-flow-editor-item-row')).toHaveCount(10);
  await planEditor.getByTestId('saved-flow-editor-item-open').first().click();
  let itemEditor = page.getByTestId('saved-flow-editor-item');
  await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-07-28');
  await itemEditor.getByTestId('my-flow-detail-save-changes').click();
  await planEditor.getByTestId('saved-flow-editor-cancel').click();
  await planEditor.getByTestId('saved-flow-editor-plan-discard-changes').click();
  await expect(page.getByTestId('saved-flow-editor-plan')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => ({
    dateOverrides: window.localStorage.getItem('flow:my-flow:date-overrides'),
    itemDrafts: window.localStorage.getItem('flow:my-flow:item-drafts'),
  }))).toEqual(storageBeforeEditor);

  savedFlow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'plan');
  await savedFlow.getByTestId('my-flow-batch-mode-toggle').first().click();
  planEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(planEditor).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    await planEditor.getByTestId('saved-flow-editor-item-open').nth(index).click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-07-29');
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(planEditor.getByTestId('saved-flow-editor-item-row').nth(index)).toContainText('2026-07-29');
  }
  await capture(page, '01-my-flow-three-item-date-preview-mobile.png');
  await planEditor.getByTestId('saved-flow-editor-save').click();
  await expect(planEditor).toHaveCount(0);

  const committedItemDates = await page.evaluate((flowSlug) => {
    const drafts = JSON.parse(
      localStorage.getItem('flow:my-flow:item-drafts') || '{}',
    ) as Record<string, { date?: string }>;
    return Object.entries(drafts)
      .filter(([key, draft]) => (
        key.startsWith(`${flowSlug}::`) && draft.date === '2026-07-29'
      ))
      .map(([key]) => key);
  }, personalCopyKey);
  expect(committedItemDates).toHaveLength(3);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
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

  await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
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
  await exportSurface.getByTestId('my-flow-export-calendar').click();
  const confirmation = page.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toHaveAttribute('data-transfer-format', 'calendar');
  const downloadPromise = page.waitForEvent('download');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
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
