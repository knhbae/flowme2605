import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openMyFlowCalendarSelectedDay } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P26_15_EVIDENCE_DIR;

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

test('Calendar keeps Flow scope, selected-day execution, and My Flow date ownership aligned', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=ux20');

  const calendar = page.getByTestId('my-flow-calendar-workspace');
  await expect(calendar).toHaveAttribute(
    'data-p35-calendar-marker',
    'P35-CALENDAR-LENS-ONE-TOGGLE',
  );
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-panel')).toHaveCount(0);

  await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  const groups = selectedDay.getByTestId('my-flow-selected-date-group');
  expect(await groups.count()).toBeGreaterThan(0);
  const selectedFlowSlug = await groups.first().getAttribute('data-flow-slug');
  expect(selectedFlowSlug).toBeTruthy();
  await page.getByTestId('my-flow-calendar-day-sheet-close').click();

  const pickerTrigger = page.getByTestId('calendar-flow-scope-picker-trigger');
  await pickerTrigger.click();
  const picker = page.getByTestId('calendar-flow-scope-picker');
  const option = picker.locator(
    `[data-testid="calendar-flow-scope-picker-option"][data-flow-slug="${selectedFlowSlug}"]`,
  );
  await expect(option).toBeVisible();
  await option.getByRole('checkbox').check();
  await picker.getByTestId('calendar-flow-scope-picker-apply').click();

  const filteredSelectedDay = await openMyFlowCalendarSelectedDay(page, '2026-05-28');
  const filteredGroups = filteredSelectedDay.getByTestId('my-flow-selected-date-group');
  expect(await filteredGroups.count()).toBeGreaterThan(0);
  const filteredSlugs = await filteredGroups.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-flow-slug'))
  );
  expect(filteredSlugs.every((slug) => slug === selectedFlowSlug)).toBe(true);

  const execution = filteredSelectedDay.getByTestId('my-flow-execution-row-shell').first();
  await expect(execution).toBeVisible();
  const completion = execution.getByTestId('my-flow-task-complete-control');
  const initiallyChecked = await completion.isChecked();
  await completion.click();
  await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
    'data-completion-result',
    initiallyChecked ? 'reopened' : 'completed',
  );
  if (!initiallyChecked) {
    await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
    await completion.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'reopened',
    );
  }
  await expect(completion).not.toBeChecked();
  await expect(
    page.getByTestId('my-flow-completion-snackbar').getByTestId('my-flow-completion-open'),
  ).toBeFocused();

  await capture(page, '01-mobile-scope-and-selected-day.png');
  await execution.getByRole('button', { name: /Flow에서 열기/ }).click();
  await expect(page).toHaveURL(/\/my\?view=flows&flow=/);
  await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar?demo=ux20');
  await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
  await capture(page, '02-wide-calendar-execution-lens.png');
  expect(browserErrors).toEqual([]);
});

test('Calendar distinguishes routine occurrences from ordinary tasks without inline movement', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.getByTestId('calendar-flow-scope-picker-trigger').click();
  const picker = page.getByTestId('calendar-flow-scope-picker');
  await picker
    .locator(
      '[data-testid="calendar-flow-scope-picker-option"]'
      + '[data-flow-slug="curated-allblanc-morning-workout"]',
    )
    .getByRole('checkbox')
    .check();
  await picker.getByTestId('calendar-flow-scope-picker-apply').click();

  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay.locator('[data-calendar-item-kind="task"]')).toHaveCount(0);
  await expect(selectedDay.locator('[data-calendar-item-kind="occurrence"]')).not.toHaveCount(0);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toHaveAttribute(
    'data-group-kind',
    'routine',
  );
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-panel')).toHaveCount(0);

  const occurrence = selectedDay
    .locator('[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="occurrence"]')
    .first();
  await expect(occurrence.getByRole('button', { name: /Flow에서 열기/ })).toBeVisible();
  await capture(page, '03-mobile-routine-occurrence-filter.png');
  await occurrence.getByRole('button', { name: /Flow에서 열기/ }).click();
  await expect(page).toHaveURL(/\/my\?view=flows&flow=curated-allblanc-morning-workout/);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toBeVisible();
  expect(browserErrors).toEqual([]);
});
