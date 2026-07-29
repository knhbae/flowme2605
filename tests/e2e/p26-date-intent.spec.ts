import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { openPublicDetailWorkspaceForDeepInspection } from './helpers/open-public-detail-workspace';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

test.beforeEach(async ({ page }) => {
  await openPublicDetailWorkspaceForDeepInspection(page);
});

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

test('a natural undated checklist saves without a competing date mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );

  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  const calendarOption = exportEntry.getByRole('button', { name: /캘린더 파일 받기/ });
  await expect(calendarOption).toHaveCount(0);
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();

  const mobileSave = page.getByTestId('public-flow-save-primary-mobile');
  await expect(mobileSave).toHaveText('체크리스트 10개로 시작');
  await capture(page, '01-natural-undated-mobile.png');
  const receipt = await savePublicFlow(page, mobileSave);

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate') || 'null'),
  }));
  expect(state.saved.dateIntent).toBe('undated');
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
  await openSavedPublicFlow(page, receipt);
  const focusedWorkspace = page.getByTestId('my-flow-mobile-workspace');
  await expect(focusedWorkspace).toBeVisible();
  await expect(focusedWorkspace).toContainText('자동차검사 준비');
  await page.goto('/calendar');
  await expect(page.locator('.fc-event')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
});

test('a date-anchored public Flow persists its one required date and enables ICS', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/f/moving-d30-basic');

  await page.getByTestId('public-flow-anchor-input').fill('2026-07-28');
  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  const desktopSave = page.getByTestId('public-flow-save-primary');
  await expect(desktopSave).toHaveText('캘린더 24개로 시작');

  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(exportEntry.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();
  await capture(page, '02-custom-date-wide.png');
  await desktopSave.click();

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:moving-d30-basic:anchorDate') || 'null'),
  }));
  expect(state.saved.dateIntent).toBe('custom');
  expect(state.saved.anchor).toBe('2026-07-28');
  expect(state.anchor).toEqual({ mode: 'custom', anchor: '2026-07-28' });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await expect(
    page.locator('.fc-daygrid-day[data-date="2026-06-28"] .fc-event'),
  ).not.toHaveCount(0);
  await page.locator('.fc-daygrid-day[data-date="2026-06-28"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expect(
    page.getByTestId('my-flow-calendar-selected-day').getByRole('button', {
      name: /Flow에서 열기/,
    }).first(),
  ).toBeVisible();
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
});

test('a natural undated result survives reload without exposing date-mode controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );
  await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText(
    '체크리스트 10개로 시작',
  );
  await capture(page, '03-explicit-undated-mobile.png');
});

test('legacy example save migrates to undated and preserves the old preview anchor', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'flow:vehicle-inspection-prep:anchorDate',
      JSON.stringify({ mode: 'example', anchor: '' }),
    );
    window.localStorage.setItem(
      'flow:saved:vehicle-inspection-prep',
      JSON.stringify({
        slug: 'vehicle-inspection-prep',
        savedAt: '2026-07-20T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-03',
      }),
    );
  });
  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByTestId('public-flow-saved-receipt')).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null')?.dateIntent,
  )).toBe('undated');

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate') || 'null'),
  }));
  expect(state.saved).toMatchObject({
    dateIntent: 'undated',
    legacyExampleAnchor: '2026-08-03',
  });
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
});
