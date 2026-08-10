import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { gotoLegacySavedPlanLibraryRoute } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_06_EVIDENCE_DIR;

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

async function inspectPageQuality(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      unnamedInteractiveCount: Array.from(
        document.querySelectorAll('button, a[href], input, select, textarea, summary'),
      ).filter((element) => {
        if (!visible(element)) return false;
        const control = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
        const labelText = Array.from(control.labels ?? [])
          .map((label) => label.textContent?.trim() ?? '')
          .join(' ');
        return [
          element.getAttribute('aria-label'),
          element.getAttribute('aria-labelledby'),
          element.getAttribute('title'),
          labelText,
          element.textContent?.trim(),
        ].filter(Boolean).join(' ').trim().length === 0;
      }).length,
    };
  });
}

test.describe('P35-06 Calendar lens and shared completion primitive', () => {
  test('mobile Calendar keeps month and selected-day execution without editing ownership', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux20');

    const calendar = page.getByTestId('my-flow-calendar-workspace');
    await expect(calendar).toHaveAttribute(
      'data-p35-calendar-marker',
      'P35-CALENDAR-LENS-ONE-TOGGLE',
    );
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeVisible();
    await expect(page.locator('[data-testid^="my-flow-calendar-scope-flow-"]')).toHaveCount(0);

    await capture(page, 'p35-06-calendar-month-390.png');
    await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();

    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    await expect(selectedDay).toBeVisible();
    await expect(selectedDay.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await expect(selectedDay.getByTestId('my-flow-calendar-open-flow').first()).toBeVisible();
    await expect(
      selectedDay.getByRole('button', { name: /계획에서 열기/ }).first(),
    ).toBeVisible();
    await capture(page, 'p35-06-calendar-agenda-390.png');

    const taskShell = selectedDay.locator(
      '[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="task"]',
    ).first();
    await expect(taskShell).toBeVisible();
    const row = taskShell.locator('article[data-row-key]');
    const rowKey = await row.getAttribute('data-row-key');
    const flowSlug = await taskShell.getAttribute('data-flow-slug');
    expect(rowKey).toBeTruthy();
    expect(flowSlug).toBeTruthy();

    await expect(taskShell.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await taskShell.getByRole('button', { name: /계획에서 열기/ }).click();
    await expect(page).toHaveURL(new RegExp(
      `/my\\?view=flows&flow=${flowSlug}&item=.*&demo=ux20`,
    ));
    await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
    const detailSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(detailSheet).toBeVisible();
    const detail = detailSheet.getByTestId('my-flow-item-detail');
    const completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    const initiallyChecked = await completion.isChecked();
    if (initiallyChecked) {
      await completion.click();
      await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
        'data-completion-result',
        'reopened',
      );
      await expect(completion).not.toBeChecked();
      await completion.click();
      await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveCount(0);
      await expect(completion).toBeChecked();
    } else {
      await completion.click();
      await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveCount(0);
      await expect(completion).toBeChecked();
      await completion.click();
      await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
        'data-completion-result',
        'reopened',
      );
      await expect(completion).not.toBeChecked();
    }

    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('wide twenty-Flow Calendar uses one compact picker and grouped agenda', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/calendar?demo=ux20');

    const scope = page.getByTestId('my-flow-calendar-scope-filter');
    await expect(scope).toHaveAttribute('data-scope-presentation', 'picker');
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeVisible();
    await expect(page.locator('[data-testid^="my-flow-calendar-scope-flow-"]')).toHaveCount(0);
    await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    await expect(page.getByTestId('my-flow-selected-date-groups')).toBeVisible();
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);

    await capture(page, 'p35-06-calendar-multi-flow-1024.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('desktop sixty-Flow Calendar keeps scope in a searchable dialog instead of a chip rail', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar?demo=ux60');

    const scope = page.getByTestId('my-flow-calendar-scope-filter');
    await expect(scope).toHaveAttribute('data-scope-presentation', 'picker');
    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    await expect(trigger).toContainText('전체 계획');
    await expect(page.locator('[data-testid^="my-flow-calendar-scope-flow-"]')).toHaveCount(0);

    await trigger.click();
    const picker = page.getByTestId('calendar-flow-scope-picker');
    await expect(picker).toBeVisible();
    await expect(picker.getByTestId('calendar-flow-scope-picker-search')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await capture(page, 'p35-06-calendar-60-flow-1440.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });
});
