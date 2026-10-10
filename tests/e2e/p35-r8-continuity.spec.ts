import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R8_EVIDENCE_DIR;

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

async function expectNoOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    horizontal: Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    ),
    fixedOverlap: [...document.querySelectorAll<HTMLElement>('[data-layer-priority]')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > window.innerWidth + 1 || rect.left < -1 || rect.right > window.innerWidth + 1;
      })
      .length,
  }));
  expect(result).toEqual({ horizontal: 0, fixedOverlap: 0 });
}

async function seedSavedFlow(
  page: Page,
  slug: string,
  anchor?: string,
  selectedArtifactMode: 'calendar' | 'checklist' = 'calendar',
) {
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(({ flowSlug, flowAnchor, artifactMode }) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      slug: flowSlug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: artifactMode,
      ...(flowAnchor ? { anchor: flowAnchor, dateIntent: 'custom' } : {}),
    }));
    if (flowAnchor) {
      window.localStorage.setItem(
        `flow:${flowSlug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: flowAnchor }),
      );
    }
  }, { flowSlug: slug, flowAnchor: anchor, artifactMode: selectedArtifactMode });
}

test.describe('P35-R8 semantic and execution continuity', () => {
  test('held overseas safety has no NEW public start or storage mutation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flows');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    const before = await page.evaluate(() => ({
      local: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      session: JSON.stringify(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
    }));
    await page.addInitScript(() => {
      const audit = window as Window & { __p35R8HeldWriteCalls: number };
      audit.__p35R8HeldWriteCalls = 0;
      const originalSet = Storage.prototype.setItem;
      const originalRemove = Storage.prototype.removeItem;
      const originalClear = Storage.prototype.clear;
      Storage.prototype.setItem = function (key: string, value: string) {
        audit.__p35R8HeldWriteCalls += 1;
        return originalSet.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key: string) {
        audit.__p35R8HeldWriteCalls += 1;
        return originalRemove.call(this, key);
      };
      Storage.prototype.clear = function () {
        audit.__p35R8HeldWriteCalls += 1;
        return originalClear.call(this);
      };
    });
    const response = await gotoLegacySavedPlanLibraryRoute(page, '/f/overseas-safety-register');
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary')).toHaveCount(0);
    const after = await page.evaluate(() => ({
      local: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      session: JSON.stringify(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
    }));
    expect(after).toEqual(before);
    expect(await page.evaluate(() => (
      window as Window & { __p35R8HeldWriteCalls?: number }
    ).__p35R8HeldWriteCalls)).toBe(0);
  });

  test('pre-review saved overseas safety preserves its checklist execution continuity', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    // Synthetic existing legacy record, not source approval or a NEW public save.
    await seedSavedFlow(page, 'overseas-safety-register', undefined, 'checklist');
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows&flow=overseas-safety-register');
    const savedRaw = await page.evaluate(() => localStorage.getItem('flow:saved:overseas-safety-register'));
    expect(savedRaw).toBe(JSON.stringify({
      slug: 'overseas-safety-register',
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }));
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    const copySlug = 'overseas-safety-register';
    const workspace = await openMyFlowLibraryFlow(page, copySlug);
    await expect(workspace.getByTestId('my-flow-whole-flow-outline'))
      .toHaveAttribute('data-effective-row-count', '4');
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute(
      'data-p35-r8-marker',
      'P35-R8B-ARTIFACT-SEMANTIC-CONTINUITY',
    );
    await expect(execution).toHaveAttribute('data-execution-kind', 'next_items');
    await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    const firstSavedRow = execution.getByTestId('my-flow-execution-row-shell').first();
    await firstSavedRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await closeOpenMyFlowItemDetail(page);
    await capture(page, 'p35-r8b-safety-saved-checklist-390.png', execution);
    await expectNoOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    const wideWorkspace = await openMyFlowLibraryFlow(page, copySlug);
    await capture(page, 'p35-r8b-safety-saved-checklist-1024.png', wideWorkspace);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test('focused execution owns completion while the whole plan keeps one current-position summary', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, 'moving-d30-basic', '2030-09-01');
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows&flow=moving-d30-basic');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    const outline = workspace.getByTestId('my-flow-whole-flow-outline');
    const currentPosition = outline.getByTestId('my-flow-whole-flow-current-position');
    await expect(currentPosition).toHaveAttribute(
      'data-p35-r8-marker',
      'P35-R8C-SINGLE-COMPLETION-OWNER',
    );
    await expect(currentPosition).toHaveAttribute('data-current-position-count', '4');
    await expect(currentPosition.getByRole('checkbox')).toHaveCount(0);
    await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-task-complete-control')).toHaveCount(0);

    const firstExecutionShell = execution.getByTestId('my-flow-execution-row-shell').first();
    const firstExecutionRow = firstExecutionShell.locator('article[data-row-key]');
    const rowKey = await firstExecutionRow.getAttribute('data-row-key');
    expect(rowKey).toBeTruthy();
    await firstExecutionShell.getByRole('button', { name: /열기/ }).click();
    let detail = getOpenMyFlowItemDetail(page);
    let completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    await expect(execution.locator(`article[data-row-key="${rowKey}"]`)).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 1/24 완료',
    );
    await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
    const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
    await expect(planToggle).toHaveAttribute('aria-expanded', 'true');
    const expandedOutline = outline;
    await expect(expandedOutline.getByTestId('my-flow-whole-flow-reading-summary'))
      .toContainText('1/24 완료');
    const completedContextRow = expandedOutline.locator(`article[data-row-key="${rowKey}"]`);
    await expect(completedContextRow).toBeVisible();
    await expect(completedContextRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await completedContextRow.getByRole('button', { name: /열기/ }).click();
    detail = getOpenMyFlowItemDetail(page);
    completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(completion).toBeChecked();
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    await expect(execution.locator(`article[data-row-key="${rowKey}"]`)).toBeVisible();
    await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );
    await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
    await capture(page, 'p35-r8c-single-completion-owner-390.png', workspace);
    await expectNoOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    const wideWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await capture(page, 'p35-r8c-single-completion-owner-1024.png', wideWorkspace);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
});
