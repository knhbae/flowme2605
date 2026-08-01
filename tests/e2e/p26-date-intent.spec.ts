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

test('an example moving schedule stays provisional until the person chooses a real date or explicit undated save', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByTestId('public-flow-provisional-schedule')).toHaveText(
    '예시 일정 · 저장되지 않음',
  );
  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'calendar',
  );

  const primary = page.getByTestId('public-flow-save-primary-mobile');
  await expect(primary).toHaveText('이사일 정하고 캘린더로 시작');
  await primary.click();
  await expect(page.getByTestId('public-flow-anchor-input')).toBeFocused();
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('flow:saved:moving-d30-basic')
  ))).toBeNull();

  const saveUndated = page.getByTestId('public-flow-save-undated-mobile');
  await expect(saveUndated).toHaveText('날짜 없이 체크리스트 24개로 시작');
  await capture(page, '00-provisional-example-mobile.png');
  const receipt = await savePublicFlow(page, saveUndated);
  await expect(receipt).toContainText('체크리스트');
  await expect(receipt).not.toContainText('일정 범위');

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:moving-d30-basic:anchorDate') || 'null'),
  }));
  expect(state.saved).toMatchObject({
    dateIntent: 'undated',
    selectedArtifactMode: 'checklist',
  });
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
  await openSavedPublicFlow(page, receipt);
  await expect(page.getByTestId('my-flow-shape-aware-execution')).toHaveAttribute(
    'data-execution-shape',
    'checklist',
  );
  await expect(page.getByTestId('my-flow-temporal-next-group')).toHaveCount(0);
});

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
  await page.getByTestId('public-flow-export-branch-close').click();

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
  await expect(focusedWorkspace).toContainText('자동차검사 D-14 준비');
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
  await page.getByTestId('public-flow-export-branch-close').click();
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
