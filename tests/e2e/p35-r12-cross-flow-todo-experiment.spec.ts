import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowCalendarSelectedDay,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R12_EVIDENCE_DIR;

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  fs.mkdirSync(evidenceRoot, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceRoot, filename), fullPage: false });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function enterEditMode(detail: Locator) {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    return;
  }
  const summary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await summary.getAttribute('open')) === null) {
    await summary.locator('summary').click();
  }
  await summary.getByTestId('my-flow-detail-edit-toggle').click();
}

async function createUndatedPersonalDraft(page: Page) {
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(
    '여권 만료일을 확인한다.\n숙소 예약번호를 정리한다.',
  );
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(2);
  await editor.getByTestId('flow-memo-draft-save').click();
  await page.waitForURL(/\/my\?savedFlow=url-draft-/u);
  const slug = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((entry) =>
      entry.startsWith('flow:saved:url-draft-'),
    );
    return key?.slice('flow:saved:'.length) ?? '';
  });
  expect(slug).not.toBe('');
  return slug;
}

test.describe('P35-R12 cross-flow Todo experiment', () => {
  test('390 opt-in groups execution rows and rolls back without changing saved data', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux12&experiment=todo');

    const experiment = page.getByTestId('my-flow-cross-flow-todo-experiment');
    await expect(experiment).toHaveAttribute(
      'data-p35-r12-marker',
      'P35-R12-CROSS-FLOW-TODO-EXPERIMENT',
    );
    await expect(experiment).toHaveAttribute(
      'data-p35-r13-marker',
      'P35-R13-B-INTERNAL-TODO',
    );
    await expect(experiment).not.toContainText('실험');
    await expect(experiment.getByTestId('my-flow-todo-experiment-view-todo')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const rows = experiment.getByTestId('my-flow-cross-flow-todo-row');
    expect(await rows.count()).toBeGreaterThan(0);
    const keys = await rows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-cross-flow-key') ?? ''),
    );
    expect(new Set(keys).size).toBe(keys.length);
    await expect(rows.locator('[data-execution-level="series"]')).toHaveCount(0);
    await expect(
      experiment.locator('[data-flow-shape="memo"], [data-execution-level="resource"]'),
    ).toHaveCount(0);

    const routineCounts = await experiment
      .locator('[data-flow-shape="routine"]')
      .evaluateAll((elements) => elements.reduce<Record<string, number>>((counts, element) => {
        const slug = element.getAttribute('data-flow-slug') ?? '';
        counts[slug] = (counts[slug] ?? 0) + 1;
        return counts;
      }, {}));
    expect(Object.values(routineCounts).every((count) => count <= 1)).toBe(true);
    expect(
      await experiment.locator('[data-date-group-id^="date:"]').count(),
    ).toBeGreaterThan(0);
    await expect(experiment.getByTestId('my-flow-row-open-label')).toHaveCount(0);

    const regularOpenRow = experiment
      .locator('[data-execution-level="item"][data-group-id]:not([data-group-id="completed"])')
      .first();
    const stableItemId = await regularOpenRow.getAttribute('data-stable-item-id');
    const crossFlowKey = await regularOpenRow.getAttribute('data-cross-flow-key');
    expect(stableItemId).toBeTruthy();
    expect(crossFlowKey).toBeTruthy();
    const stableOpenRow = experiment.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-cross-flow-key="${crossFlowKey}"]:not([data-group-id="completed"])`,
    );
    await expect(stableOpenRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await stableOpenRow.locator('[data-flow-row-slot="open"]').click();
    let detail = getOpenMyFlowItemDetail(page);
    let completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(
      page.locator('[data-testid="my-flow-task-complete-control"]:visible'),
    ).toHaveCount(1);
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    const completedRow = experiment.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-cross-flow-key="${crossFlowKey}"][data-group-id="completed"]`,
    );
    await expect(completedRow).toBeVisible();
    await expect(completedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveCount(0);
    await completedRow.locator('[data-flow-row-slot="open"]').click();
    detail = getOpenMyFlowItemDetail(page);
    completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(completion).toBeChecked();
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    await expect(
      experiment.locator(
        `[data-testid="my-flow-cross-flow-todo-row"][data-cross-flow-key="${crossFlowKey}"]:not([data-group-id="completed"])`,
      ),
    ).toBeVisible();

    const storageBeforeClose = await page.evaluate(() =>
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('flow:'))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key)]),
    );
    await experiment.getByTestId('my-flow-todo-experiment-view-flows').click();
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await experiment.getByTestId('my-flow-todo-experiment-view-todo').click();
    await expect(page.getByTestId('my-flow-cross-flow-todo-workspace')).toBeVisible();
    await capture(page, 'p35-r12-cross-flow-todo-390.png', experiment);

    await page.goto('/my?demo=ux12&experiment=off');
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    const storageAfterClose = await page.evaluate(() =>
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('flow:'))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key)]),
    );
    expect(storageAfterClose).toEqual(storageBeforeClose);
    expect(browserErrors).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });

  test('same stable item moves Todo to Calendar and back to undated', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await createUndatedPersonalDraft(page);
    await page.goto('/my?view=flows&experiment=todo&mode=todo');

    const experiment = page.getByTestId('my-flow-cross-flow-todo-experiment');
    const undatedGroup = experiment.getByTestId('my-flow-cross-flow-todo-group-undated');
    const row = undatedGroup.getByTestId('my-flow-cross-flow-todo-row').first();
    const stableItemId = await row.getAttribute('data-stable-item-id');
    expect(stableItemId).toBeTruthy();
    await row.locator('[data-flow-row-slot="open"]').click();
    let detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await enterEditMode(detail);
    let editor = page.getByRole('dialog', { name: '할 일 수정' });
    await editor.getByTestId('my-flow-detail-date-input').fill('2030-09-05');
    await editor.getByTestId('my-flow-detail-save-changes').click();

    const datedRow = experiment.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-stable-item-id="${stableItemId}"][data-group-id="upcoming"]`,
    );
    await expect(datedRow).toBeVisible();
    await expect(
      experiment.locator(
        `[data-testid="my-flow-cross-flow-todo-row"][data-stable-item-id="${stableItemId}"]`,
      ),
    ).toHaveCount(1);

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2030-09');
    const selectedDay = await openMyFlowCalendarSelectedDay(page, '2030-09-05');
    const calendarRow = selectedDay.locator(
      `[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`,
    );
    await expect(calendarRow).toBeVisible();
    await expect(calendarRow).toHaveAttribute('data-item-id', stableItemId!);

    await page.goto('/my?view=flows&experiment=todo&mode=todo');
    const restoredExperiment = page.getByTestId('my-flow-cross-flow-todo-experiment');
    const restoredDatedRow = restoredExperiment.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-stable-item-id="${stableItemId}"][data-group-id="upcoming"]`,
    );
    await restoredDatedRow.locator('[data-flow-row-slot="open"]').click();
    detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await enterEditMode(detail);
    editor = page.getByRole('dialog', { name: '할 일 수정' });
    await editor.getByTestId('my-flow-detail-date-input').fill('');
    await editor.getByTestId('my-flow-detail-save-changes').click();

    const returnedUndatedRow = restoredExperiment.locator(
      `[data-testid="my-flow-cross-flow-todo-row"][data-stable-item-id="${stableItemId}"][data-group-id="undated"]`,
    );
    await expect(returnedUndatedRow).toBeVisible();
    await expect(restoredExperiment.getByTestId('my-flow-cross-flow-todo-group-undated')).toHaveAttribute(
      'data-p35-r12-date-marker',
      'P35-R12-DATE-REMOVE-RETURNS-UNDATED',
    );
    await capture(page, 'p35-r12-date-remove-undated-390.png', restoredExperiment);
    expect(browserErrors).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });

  test('1024 and 1440 keep a focused list and contextual inspector', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux12&experiment=todo');
    const workspace = page.getByTestId('my-flow-cross-flow-todo-workspace');
    const inspector = page.getByTestId('my-flow-cross-flow-todo-inspector');
    await expect(workspace).toBeVisible();
    await expect(inspector).toBeVisible();
    const firstRow = page.getByTestId('my-flow-cross-flow-todo-row').first();
    await firstRow.locator('[data-flow-row-slot="open"]').click();
    await expect(inspector.getByTestId('my-flow-item-detail')).toBeVisible();
    await expect(inspector.getByTestId('my-flow-cross-flow-open-flow')).toBeVisible();
    await capture(page, 'p35-r12-cross-flow-todo-1024.png', workspace);
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(workspace).toBeVisible();
    await capture(page, 'p35-r12-cross-flow-todo-1440.png', workspace);
    expect(browserErrors).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });
});
