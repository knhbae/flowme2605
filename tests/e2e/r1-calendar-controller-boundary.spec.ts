import { expect, test, type Page } from '@playwright/test';

import {
  getOpenMyFlowItemDetail,
  openMyFlowCalendarSelectedDay,
} from './helpers/my-flow-library';

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function currentPath(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}${url.hash}`;
}

test.describe('R1 Calendar controller boundary characterization', () => {
  test('Calendar keeps its demo route while opening and closing the exact Item inspector', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/calendar?demo=ux12');

    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    const selectedDay = await openMyFlowCalendarSelectedDay(page, '2026-05-28');
    const scheduleGroup = selectedDay.locator(
      '[data-testid="my-flow-selected-date-group"][data-group-kind="schedule"]',
    ).first();
    await expect(scheduleGroup).toBeVisible();

    const flowSlug = await scheduleGroup.getAttribute('data-flow-slug');
    const executionRow = scheduleGroup.locator('article[data-row-key]').first();
    const itemId = await executionRow.getAttribute('data-item-id');
    const occurrenceId = await executionRow.getAttribute('data-occurrence-id');
    expect(flowSlug).toBeTruthy();
    expect(itemId).toBeTruthy();

    const origin = currentPath(page);
    const opener = scheduleGroup.locator('button[data-flow-row-slot="open"]').first();
    await opener.click();
    expect(currentPath(page)).toBe(origin);
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await expect(detail).toHaveAttribute('data-item-id', itemId ?? '');
    if (occurrenceId) {
      await expect(detail).toContainText('5월 28일');
    }
    await detail.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(detail).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(page).toHaveURL('/calendar?demo=ux12');
    expect(currentPath(page)).toBe('/calendar?demo=ux12');
    await expect(page.getByTestId('my-flow-calendar-workspace')).toBeVisible();
    await expect(
      page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
        .getByTestId('my-flow-calendar-date-button'),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(browserErrors).toEqual([]);
  });

  test('Calendar keyboard navigation keeps the exact selected date, month, and roving focus aligned', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/calendar?demo=ux20');

    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    const may28 = page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button');
    await may28.click();
    await may28.focus();
    await expect(may28).toBeFocused();
    await expect(may28).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('ArrowRight');
    const may29 = page.locator('.fc-daygrid-day[data-date="2026-05-29"]')
      .getByTestId('my-flow-calendar-date-button');
    await expect(may29).toBeFocused();
    await expect(may29).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('PageDown');
    const june29 = page.locator('.fc-daygrid-day[data-date="2026-06-29"]')
      .getByTestId('my-flow-calendar-date-button');
    await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-06');
    await expect(june29).toBeFocused();
    await expect(june29).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('[data-testid="my-flow-calendar-date-button"][tabindex="0"]'),
    ).toHaveCount(1);
    expect(browserErrors).toEqual([]);
  });
});
