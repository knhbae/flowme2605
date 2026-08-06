import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R13_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
  });
}

async function expectPageQuality(page: Page) {
  const result = await page.evaluate(() => ({
    horizontalOverflow: Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    ),
    outOfViewportFixedCount: [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.position !== 'fixed') return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      })
      .length,
  }));
  expect(result).toEqual({
    horizontalOverflow: 0,
    outOfViewportFixedCount: 0,
  });
}

async function saveMovingFlow(page: Page) {
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
  await page.getByTestId('public-flow-save-primary-mobile').click();
}

test.describe('P35-R13 final internal gate', () => {
  test('390 defaults to B with exact date rails and one low-command execution row', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux12&savedPlanLibrary=off');

    const surface = page.getByTestId('my-flow-cross-flow-todo-experiment');
    await expect(surface).toHaveAttribute('data-p35-r13-marker', 'P35-R13-B-INTERNAL-TODO');
    await expect(surface.getByTestId('my-flow-todo-experiment-view-todo')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(surface).not.toContainText('실험');

    const datedGroups = surface.locator('[data-flow-ui="date-rail-group"][data-group-id^="date:"]');
    expect(await datedGroups.count()).toBeGreaterThan(0);
    await expect(datedGroups.first().getByTestId('flow-date-rail')).toBeVisible();

    const row = surface
      .getByTestId('my-flow-cross-flow-todo-row')
      .first();
    await expect(row).toHaveAttribute(
      'data-p35-r13-item-marker',
      'P35-R13-DATE-GROUPED-LOW-COMMAND-ROW',
    );
    await expect(row.locator('button[data-flow-row-slot="open"]')).toHaveCount(1);
    await expect(row.getByRole('checkbox')).toHaveCount(0);
    await expect(row.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(row.getByTestId('my-flow-row-open-label')).toHaveCount(0);
    await expect(row.locator('[data-testid*="execution-note"]')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'p35-r13-b-date-groups-390.png');

    const crossFlowKey = await row.getAttribute('data-cross-flow-key');
    expect(crossFlowKey).toBeTruthy();
    await row.locator('button[data-flow-row-slot="open"]').click();
    let detail = getOpenMyFlowItemDetail(page);
    let completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(
      page.locator('[data-testid="my-flow-task-complete-control"]:visible'),
    ).toHaveCount(1);
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    const completedRow = surface.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-cross-flow-key="${crossFlowKey}"][data-group-id="completed"]`,
    );
    await expect(completedRow).toBeVisible();
    await expect(completedRow.getByRole('checkbox')).toHaveCount(0);
    await completedRow.locator('button[data-flow-row-slot="open"]').click();
    detail = getOpenMyFlowItemDetail(page);
    completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(completion).toBeChecked();
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    await expect(
      surface.locator(
        `[data-testid="my-flow-cross-flow-todo-row"][data-cross-flow-key="${crossFlowKey}"]:not([data-group-id="completed"])`,
      ),
    ).toBeVisible();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('390 keeps the whole plan collapsed after save, reload, and library re-entry', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toMatch(/^personal-copy:/u);
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';

    let workspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]:visible`,
    );
    await expect(workspace).toBeVisible();
    let plan = workspace.getByTestId('my-flow-workspace-plan');
    await expect(plan).toHaveAttribute('data-plan-open', 'false');
    await expect(workspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    const firstEntry = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(firstEntry).toHaveAttribute('data-execution-kind', 'nearest_date_group');
    const nextGroup = firstEntry.getByTestId('my-flow-temporal-next-group');
    await expect(nextGroup.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(nextGroup).toContainText('3개 먼저');
    await capture(page, 'p35-r13-first-entry-plan-collapsed-390.png', workspace);

    await page.reload();
    workspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]:visible`,
    );
    await expect(workspace).toBeVisible();
    plan = workspace.getByTestId('my-flow-workspace-plan');
    await expect(plan).toHaveAttribute('data-plan-open', 'false');
    await expect(workspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);

    await workspace.getByTestId('my-flow-mobile-library-back').click();
    workspace = await openMyFlowLibraryFlow(page, personalCopyKey, 'execute');
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await capture(page, 'p35-r13-return-plan-collapsed-390.png', workspace);
    await workspace.getByTestId('my-flow-workspace-plan-toggle').click();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'true',
    );
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024 and 1440 keep the date-grouped list and contextual inspector', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux12&savedPlanLibrary=off');

    const workspace = page.getByTestId('my-flow-cross-flow-todo-workspace');
    const inspector = page.getByTestId('my-flow-cross-flow-todo-inspector');
    await expect(workspace).toBeVisible();
    await expect(inspector).toBeVisible();
    const firstRow = page.getByTestId('my-flow-cross-flow-todo-row').first();
    await firstRow.locator('button[data-flow-row-slot="open"]').click();
    await expect(inspector.getByTestId('my-flow-item-detail')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'p35-r13-b-date-groups-1024.png');
    await expectPageQuality(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(workspace).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'p35-r13-b-date-groups-1440.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
