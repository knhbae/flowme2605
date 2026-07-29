import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P35_04_EVIDENCE_DIR;

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
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test.describe('P35-04 My Flow safe split and dead-view removal', () => {
  test('mobile My Flow preserves its library route without mounting the Calendar surface', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/my?demo=ux12&view=flows');

    const main = page.locator('main').first();
    await expect(main).toHaveAttribute('data-p35-dead-view-marker', 'P35-DEAD-VIEW-REMOVAL');
    await expect(main).toHaveAttribute('data-p35-my-flow-marker', 'P35-MY-LIBRARY-ONLY');
    await expect(page.getByTestId('my-flow-calendar-workspace')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(16);
    const localViewTabs = page.getByRole('tablist', { name: 'My Flow 보기 방식' });
    await expect(localViewTabs).toHaveCount(1);
    await expect(localViewTabs.getByRole('tab', { name: 'Flow' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-view-completed')).toHaveCount(0);

    await capture(page, 'p35-04-my-390.png');
    await page.getByTestId('my-flow-mobile-structure-open').first().click();
    await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '저장한 Flow 목록으로 돌아가기' })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:'))))
      .toEqual([]);

    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('wide Calendar renders the extracted surface and preserves completion identity', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/calendar?demo=ux12');

    const calendar = page.getByTestId('my-flow-calendar-workspace');
    await expect(calendar).toHaveAttribute('data-p35-marker', 'P35-MYFLOW-SAFE-SPLIT');
    await expect(page.getByTestId('my-flow-library-workspace')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-month-picker')).toBeVisible();
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    await expect(page.locator('.fc')).toBeVisible();
    await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();

    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    const row = selectedDay.getByTestId('my-flow-execution-row-shell').first();
    const executionRow = row.locator('article[data-row-key]').first();
    const rowIdentity = await executionRow.getAttribute('data-row-key');
    expect(rowIdentity).toBeTruthy();
    const completion = row.getByTestId('my-flow-task-complete-control');
    const initialLabel = await completion.getAttribute('aria-label');
    expect(initialLabel).toBeTruthy();
    await completion.click();
    await expect(row.getByTestId('my-flow-task-complete-control')).not.toHaveAttribute(
      'aria-label',
      initialLabel ?? '',
    );
    await row.getByTestId('my-flow-task-complete-control').click();
    await expect(row.getByTestId('my-flow-task-complete-control')).toHaveAttribute(
      'aria-label',
      initialLabel ?? '',
    );
    await expect(executionRow).toHaveAttribute('data-row-key', rowIdentity ?? '');
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:'))))
      .toEqual([]);

    await capture(page, 'p35-04-calendar-1024.png');
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
});
