import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

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
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function captureViewport(page: Page, filename: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
}

async function seedCalendarFlows(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('flowme:p26-15-seeded') === 'true') return;
    localStorage.clear();
    const savedAt = '2026-07-20T00:00:00.000Z';
    const saved = [
      { slug: 'moving-d30-basic', anchor: '2026-08-28' },
      { slug: 'vehicle-inspection-prep' },
    ];
    saved.forEach(({ slug, anchor }) => {
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) {
        localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({
          mode: 'custom',
          anchor,
        }));
      }
    });
    sessionStorage.setItem('flowme:p26-15-seeded', 'true');
  });
}

async function openUndatedTray(page: Page) {
  const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  const toggle = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  return tray;
}

async function selectMoveItem(panel: ReturnType<Page['getByTestId']>, text: string) {
  const item = panel.getByTestId('my-flow-calendar-date-move-item').filter({ hasText: text }).first();
  await expect(item).toBeVisible();
  await item.getByRole('checkbox').check();
}

test('Calendar keeps Flow scope, grid, agenda, and reversible cross-Flow date movement aligned', async ({ page }) => {
  test.setTimeout(150_000);
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T10:00:00+09:00') });
  await seedCalendarFlows(page);
  await page.goto('/calendar');

  const tray = await openUndatedTray(page);
  await expect(tray.getByTestId('my-flow-calendar-unscheduled-count')).toHaveText('10');
  for (let index = 0; index < 2; index += 1) {
    await tray.getByTestId('my-flow-calendar-unscheduled-item').nth(index).getByRole('checkbox').check();
  }
  await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-07-29');
  await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('h3')).toContainText('7월 29일');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(2);
  await expect(selectedDay.locator('[data-flow-slug="vehicle-inspection-prep"]')).not.toHaveCount(0);
  await expect(selectedDay.locator('[data-flow-slug="moving-d30-basic"]')).not.toHaveCount(0);
  await selectedDay.scrollIntoViewIfNeeded();
  await captureViewport(page, '01-mobile-all-flows-same-date.png');

  const vehicleScope = page.getByTestId('my-flow-calendar-scope-flow-vehicle-inspection-prep');
  const movingScope = page.getByTestId('my-flow-calendar-scope-flow-moving-d30-basic');
  await expect(vehicleScope).toBeVisible();
  await expect(movingScope).toBeVisible();

  await vehicleScope.click();
  await expect(vehicleScope).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedDay.locator('h3')).toContainText('7월 29일');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(1);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveAttribute(
    'data-flow-slug',
    'vehicle-inspection-prep',
  );
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-29"] [data-testid="my-flow-calendar-schedule-content"]')).toHaveCount(2);
  await captureViewport(page, '02-mobile-vehicle-flow-filter.png');

  await movingScope.click();
  await expect(movingScope).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(1);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveAttribute(
    'data-flow-slug',
    'moving-d30-basic',
  );

  await page.getByTestId('my-flow-calendar-scope-all').click();
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(2);
  const vehicleRows = selectedDay.locator('[data-testid="my-flow-execution-row-shell"][data-flow-slug="vehicle-inspection-prep"]');
  const movingRows = selectedDay.locator('[data-testid="my-flow-execution-row-shell"][data-flow-slug="moving-d30-basic"]');
  await expect(vehicleRows).toHaveCount(2);
  await expect(movingRows).not.toHaveCount(0);
  await vehicleRows.first().getByRole('checkbox').check();
  const completedVehicleTitle = (await vehicleRows.first().getByTestId('my-flow-row-title').innerText()).trim();
  const dateMoveEntry = page.getByTestId('my-flow-calendar-date-move-entry');
  await dateMoveEntry.focus();
  await page.clock.fastForward(9_000);
  await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);

  await dateMoveEntry.click();
  const movePanel = page.getByTestId('my-flow-calendar-date-move-panel');
  await selectMoveItem(movePanel, completedVehicleTitle);
  await selectMoveItem(movePanel, '이사');
  await movePanel.getByTestId('my-flow-calendar-date-move-target').fill('2026-07-30');
  await expect(movePanel.getByTestId('my-flow-calendar-date-move-preview')).toContainText('2개 · Flow 2개');
  await expect(movePanel.getByTestId('my-flow-calendar-date-move-preview')).toContainText('7월 29일 → 7월 30일');
  await movePanel.scrollIntoViewIfNeeded();
  await captureViewport(page, '03-mobile-cross-flow-date-move-preview.png');
  await movePanel.getByTestId('my-flow-calendar-date-move-apply').click();

  await expect(selectedDay.locator('h3')).toContainText('7월 30일');
  await expect(selectedDay.locator('[data-testid="my-flow-execution-row-shell"][data-flow-slug="vehicle-inspection-prep"]')).toHaveCount(1);
  await expect(selectedDay.locator('[data-testid="my-flow-execution-row-shell"][data-flow-slug="moving-d30-basic"]')).toHaveCount(1);
  await expect(
    selectedDay.locator('[data-testid="my-flow-execution-row-shell"][data-flow-slug="vehicle-inspection-prep"]').getByRole('checkbox'),
  ).toBeChecked();

  await page.getByTestId('my-flow-calendar-date-move-undo-action').click();
  await expect(selectedDay.locator('h3')).toContainText('7월 29일');
  await expect(vehicleRows).toHaveCount(2);
  await expect(vehicleRows.first().getByRole('checkbox')).toBeChecked();

  await page.getByTestId('my-flow-calendar-date-move-entry').click();
  await selectMoveItem(page.getByTestId('my-flow-calendar-date-move-panel'), completedVehicleTitle);
  await selectMoveItem(page.getByTestId('my-flow-calendar-date-move-panel'), '이사');
  await page.getByTestId('my-flow-calendar-date-move-target').fill('2026-07-30');
  await page.getByTestId('my-flow-calendar-date-move-apply').click();
  await page.reload();
  await page.locator('.fc-daygrid-day[data-date="2026-07-30"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(selectedDay.locator('[data-flow-slug="vehicle-inspection-prep"]')).not.toHaveCount(0);
  await expect(selectedDay.locator('[data-flow-slug="moving-d30-basic"]')).not.toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 768 });
  await vehicleScope.click();
  await expect(vehicleScope).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(1);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveAttribute(
    'data-flow-slug',
    'vehicle-inspection-prep',
  );
  await capture(page, '04-wide-flow-filter-and-agenda.png');
  expect(browserErrors).toEqual([]);
});

test('Calendar distinguishes routine occurrences from ordinary tasks in filters and movement preview', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.getByTestId('my-flow-calendar-scope-routine').click();

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('[data-calendar-item-kind="task"]')).toHaveCount(0);
  await expect(selectedDay.locator('[data-calendar-item-kind="occurrence"]')).not.toHaveCount(0);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toHaveAttribute('data-group-kind', 'routine');

  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await routineIcon.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));
  const movePanel = page.getByTestId('my-flow-calendar-date-move-panel');
  await expect(movePanel.getByTestId('my-flow-calendar-date-move-item').filter({ hasText: '반복 회차' }).first()).toBeVisible();
  await expect(movePanel.getByTestId('my-flow-calendar-date-move-preview')).toContainText('반복 1회');
  await movePanel.scrollIntoViewIfNeeded();
  await movePanel.getByTestId('my-flow-calendar-date-move-apply').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('my-flow-calendar-date-move-undo')).toBeVisible();
  await captureViewport(page, '05-mobile-routine-occurrence-filter.png');
  expect(browserErrors).toEqual([]);
});
