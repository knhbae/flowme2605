import fs from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

const evidenceDir = process.env.FLOWME_P31_EVIDENCE_DIR;

async function capture(page: Page, name: string) {
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}`, fullPage: true });
}

async function expectViewportStable(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test.describe('P31 final evidence surfaces', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('captures the mobile Home, Find, My Flow, and Calendar composition', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/flows');
    await expect(page.getByTestId('flow-map-catalog-section')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId('platform-mobile-tabs'),
    ).toHaveAttribute(
      'data-p35-marker',
      'P35-ENTRY-ROUTER-3TAB',
    );
    await expect(
      page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '계획 찾기' }),
    ).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p35-entry-find-first-390.png');

    await page.goto('/flows');
    await expect(page.getByTestId('flow-map-catalog-section')).toBeVisible();
    await expect(page.getByTestId('flow-map-catalog-card').first()).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p31-find-catalog-390.png');

    await page.goto('/my?demo=ux12&view=flows&mode=flow');
    const library = page.getByTestId('my-flow-mobile-flow-hub');
    await expect(library).toBeVisible();
    await capture(page, 'p31-my-flow-library-390.png');
    const openRow = page
      .getByTestId('my-flow-mobile-structure-row')
      .filter({ hasNotText: '모든 할 일 완료' })
      .first();
    await openRow.getByTestId('my-flow-mobile-structure-open').click();
    await expect(page.getByTestId('my-flow-mobile-workspace')).toHaveAttribute(
      'data-p35-marker',
      'P35-PERSONAL-SINGLE-FOCUS',
    );
    await expectViewportStable(page);
    await capture(page, 'p31-my-flow-workspace-demo-390.png');

    await page.goto('/calendar?demo=ux12');
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p31-calendar-default-390.png');

    await page
      .locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    await expect(page.getByTestId('my-flow-selected-date-groups')).toBeVisible();
    await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
    await capture(page, 'p35-calendar-selected-day-demo-390.png');

    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem(
        'flow:saved:vehicle-inspection-prep',
        JSON.stringify({
          slug: 'vehicle-inspection-prep',
          savedAt: '2026-07-23T00:00:00.000Z',
          selectedArtifactMode: 'checklist',
          dateIntent: 'undated',
        }),
      );
    });
    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await page.goto('/my?view=flows&mode=flow');
    await expect(
      page.locator(
        '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="vehicle-inspection-prep"]',
      ),
    ).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p35-undated-my-flow-390.png');

    expect(errors).toEqual([]);
  });

  test('captures the wide Home, Find, My Flow, and Calendar composition', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto('/');
    await expect(page).toHaveURL('/flows');
    await expectViewportStable(page);
    await capture(page, 'p35-entry-find-1024.png');

    await page.goto('/flows');
    await expect(page.getByTestId('flow-map-catalog-section')).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p31-find-1024.png');

    await page.goto('/my?demo=ux20&view=flows&mode=flow');
    await expect(page.getByTestId('my-flow-library-workspace')).toHaveAttribute(
      'data-library-layout',
      'rail-canvas-inspector',
    );
    await expect(page.getByTestId('my-flow-library-workspace')).toHaveAttribute(
      'data-p35-marker',
      'P35-MY-LIBRARY-ONLY',
    );
    await expectViewportStable(page);
    await capture(page, 'p31-my-flow-1024.png');

    await page.goto('/calendar?demo=ux12');
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await expectViewportStable(page);
    await capture(page, 'p31-calendar-1024.png');

    expect(errors).toEqual([]);
  });
});
