import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_05_EVIDENCE_DIR;

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
    const unnamedInteractiveCount = Array.from(
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
    }).length;
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });
}

async function expectSingleLibraryCommand(row: Locator) {
  expect(await row.evaluate((element) => (
    Number(element.matches('button, a[href], input, select, textarea, summary'))
    + element.querySelectorAll('button, a[href], input, select, textarea, summary').length
  ))).toBe(1);
}

test.describe('P35-05 My Flow library and focused workspace', () => {
  test('mobile one-Flow library uses one compact row and no competing local views', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux1&view=flows');

    const main = page.locator('main').first();
    await expect(main).toHaveAttribute('data-p35-my-flow-marker', 'P35-MY-LIBRARY-ONLY');
    const localViewTabs = page.getByRole('tablist', { name: 'My Flow 보기 방식' });
    await expect(localViewTabs).toHaveCount(1);
    await expect(localViewTabs.getByRole('tab', { name: 'Flow' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-view-completed')).toHaveCount(0);

    const row = page.getByTestId('my-flow-mobile-structure-row');
    await expect(row).toHaveCount(1);
    await expectSingleLibraryCommand(row);
    await expect(row.getByTestId('my-flow-mobile-structure-open')).toHaveAccessibleName(/열기$/);
    await expect(page.getByTestId('my-flow-search')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-list-filter-all')).toHaveCount(0);

    await capture(page, 'p35-05-my-library-1-390.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('mobile twenty-Flow library progressively reveals controls and drills into one Flow', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');

    await expect(page.getByTestId('my-flow-saved-count')).toHaveText('20개');
    await expect(page.getByTestId('my-flow-search')).toBeVisible();
    await expect(page.getByTestId('my-flow-list-filter-all')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(8);
    await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText('12개 더 보기');
    await expectSingleLibraryCommand(page.getByTestId('my-flow-mobile-structure-row').first());
    await capture(page, 'p35-05-my-library-20-390.png');

    const firstRow = page
      .getByTestId('my-flow-mobile-structure-row')
      .filter({ hasNotText: '모든 할 일 완료' })
      .first();
    const flowSlug = await firstRow.getAttribute('data-flow-slug');
    expect(flowSlug).toBeTruthy();
    await firstRow.getByTestId('my-flow-mobile-structure-open').click();

    const workspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${flowSlug}"]`,
    );
    await expect(workspace).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
    await expect(workspace.getByTestId('my-flow-workspace-execute')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await workspace.getByTestId('my-flow-workspace-plan-toggle').click();
    await expect(workspace.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
    await capture(page, 'p35-05-personal-flow-390.png');
    await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);

    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('mobile focused workspace keeps quick edit and reversible completion in the object context', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-05-28T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-06-26',
      }));
      window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
        mode: 'custom',
        anchor: '2026-06-26',
      }));
    });
    await page.goto('/my?view=flows');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    const executionShell = workspace
      .getByTestId('my-flow-temporal-next-group')
      .getByTestId('my-flow-execution-row-shell')
      .first();
    const executionRow = executionShell.locator('article[data-row-key]');
    const rowKey = await executionRow.getAttribute('data-row-key');
    expect(rowKey).toBeTruthy();

    await executionShell.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
    if (await quickEdit.isVisible().catch(() => false)) {
      await quickEdit.click();
    } else {
      const summary = detail.getByTestId('my-flow-detail-read-summary');
      if ((await summary.getAttribute('open')) === null) await summary.locator('summary').click();
      await summary.getByTestId('my-flow-detail-edit-toggle').click();
    }
    await expect(detail.getByTestId('my-flow-detail-title-input')).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-date-input')).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-memo')).toBeVisible();
    await detail.getByTestId('my-flow-editor-cancel').click();
    await closeOpenMyFlowItemDetail(page);

    await expect(executionShell.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await executionShell.getByRole('button', { name: /열기/ }).click();
    const completionDetail = getOpenMyFlowItemDetail(page);
    await expect(completionDetail).toBeVisible();
    const completion = completionDetail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'completed',
    );
    await expect(page.getByTestId('my-flow-completion-undo')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 1/24 완료',
    );
    await closeOpenMyFlowItemDetail(page);
    await workspace.getByTestId('my-flow-workspace-plan-toggle').click();
    const wholeFlowOutline = workspace.getByTestId('my-flow-whole-flow-outline');
    await expect(wholeFlowOutline).toBeVisible();
    let completedRow = wholeFlowOutline.locator(`article[data-row-key="${rowKey}"]`);
    if ((await completedRow.count()) === 0) {
      await wholeFlowOutline.getByTestId('my-flow-whole-flow-toggle-all-groups').click();
      completedRow = wholeFlowOutline.locator(`article[data-row-key="${rowKey}"]`);
    }
    await expect(completedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await completedRow.getByRole('button', { name: /열기/ }).click();
    const completedDetail = getOpenMyFlowItemDetail(page);
    const reopen = completedDetail.getByTestId('my-flow-task-complete-control');
    await expect(reopen).toHaveCount(1);
    await expect(reopen).toBeChecked();
    await expect(reopen).toHaveAccessibleName(/다시 열기$/);
    await reopen.click();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );
    await closeOpenMyFlowItemDetail(page);
    const reopenedRow = workspace
      .getByTestId('my-flow-shape-aware-execution')
      .locator(`article[data-row-key="${rowKey}"]`);
    await expect(reopenedRow).toBeVisible();
    await expect(reopenedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'reopened',
    );

    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('wide workspace separates the library rail from one selected Flow canvas', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20&view=flows');

    const workspace = page.getByTestId('my-flow-library-workspace');
    await expect(workspace).toHaveAttribute('data-p35-marker', 'P35-MY-LIBRARY-ONLY');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const detail = workspace.getByTestId('my-flow-library-detail');
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(20);
    await expect(detail.getByTestId('my-flow-overview-card')).toHaveCount(0);
    await rail.getByTestId('my-flow-library-row').first().click();
    await expect(detail.getByTestId('my-flow-overview-card')).toHaveCount(1);
    await expect(detail.getByTestId('my-flow-overview-card')).toHaveAttribute(
      'data-p35-marker',
      'P35-PERSONAL-SINGLE-FOCUS',
    );

    const [railBox, detailBox] = await Promise.all([rail.boundingBox(), detail.boundingBox()]);
    expect(railBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    expect((railBox?.x ?? 0) + (railBox?.width ?? 0)).toBeLessThanOrEqual((detailBox?.x ?? 0) + 1);

    await capture(page, 'p35-05-my-library-workspace-1024.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('wide sixty-Flow library remains searchable without changing row grammar', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my?demo=ux60&view=flows');

    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    await expect(page.getByTestId('my-flow-saved-count')).toHaveText('60개');
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(60);
    await expect(rail.getByTestId('my-flow-library-rail-search')).toBeVisible();
    await expectSingleLibraryCommand(rail.getByTestId('my-flow-library-row').first());
    await expectSingleLibraryCommand(rail.getByTestId('my-flow-library-row').last());

    await capture(page, 'p35-05-my-library-60-1440.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });
});
