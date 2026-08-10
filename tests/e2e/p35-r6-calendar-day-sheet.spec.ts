import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { gotoLegacySavedPlanLibraryRoute } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R6_EVIDENCE_DIR;
const selectedDate = '2026-05-28';

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
  });
}

async function expectNoPageOverflow(page: Page) {
  const quality = await page.evaluate(() => ({
    horizontalOverflow: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ) - window.innerWidth,
    bodyOverflow: document.body.style.overflow,
  }));
  expect(quality.horizontalOverflow).toBeLessThanOrEqual(1);
  return quality;
}

test.describe('P35-R6 Calendar selected-day composition', () => {
  test('mobile date tap opens a focused agenda sheet and returns focus to the date', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux20');
    await expect(page.getByTestId('my-flow-calendar-day-sheet')).toHaveCount(0);

    const dateButton = page
      .locator(`.fc-daygrid-day[data-date="${selectedDate}"]`)
      .getByTestId('my-flow-calendar-date-button');
    await dateButton.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await dateButton.click();

    const sheet = page.getByTestId('my-flow-calendar-day-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-p35-marker', 'P35-R6-CALENDAR-DAY-SHEET-390');
    await expect(sheet).toContainText('5월 28일');
    const firstAgendaRow = sheet.getByTestId('my-flow-execution-row-shell').first();
    await expect(firstAgendaRow).toBeVisible();
    const firstRowBox = await firstAgendaRow.boundingBox();
    expect(firstRowBox?.y ?? 900).toBeLessThan(844);
    expect((firstRowBox?.y ?? 900) + (firstRowBox?.height ?? 0)).toBeLessThan(844);
    await expect(sheet.locator(':focus')).toHaveCount(1);
    expect(await sheet.evaluate((root) => root.contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    expect((await expectNoPageOverflow(page)).bodyOverflow).toBe('hidden');
    await capture(page, 'p35-r6-calendar-day-sheet-390.png');

    const close = sheet.getByTestId('my-flow-calendar-day-sheet-close');
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(sheet.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(dateButton).toBeFocused();
    expect((await expectNoPageOverflow(page)).bodyOverflow).toBe('');
    expect(errors).toEqual([]);
  });

  test('1024 date tap keeps the selected-day agenda below the month in the compact main column', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux20');
    const dateButton = page
      .locator(`.fc-daygrid-day[data-date="${selectedDate}"]`)
      .getByTestId('my-flow-calendar-date-button');
    await dateButton.click();

    await expect(page.getByTestId('my-flow-calendar-day-sheet')).toHaveCount(0);
    const workspace = page.getByTestId('my-flow-calendar-workspace');
    await expect(workspace).toHaveAttribute('data-compact-layout', 'filter-main-two-column');
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    await expect(selectedDay).toBeVisible();
    await expect(selectedDay.getByTestId('my-flow-execution-row-shell').first()).toBeVisible();
    const selectedDayRegion = page.getByTestId('my-flow-calendar-selected-day-region');
    await expect(selectedDayRegion).toHaveAttribute('data-selected-day-layout', 'under-month');
    const [selectedDayBox, filterRailBox] = await Promise.all([
      selectedDay.boundingBox(),
      page.getByTestId('my-flow-calendar-filter-rail').boundingBox(),
    ]);
    expect(selectedDayBox).not.toBeNull();
    expect(filterRailBox).not.toBeNull();
    expect(selectedDayBox!.x).toBeGreaterThanOrEqual(filterRailBox!.x + filterRailBox!.width - 1);
    await capture(page, 'p35-r6-calendar-side-agenda-1024.png');
    await expectNoPageOverflow(page);
    expect(errors).toEqual([]);
  });
});
