import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  expandMyFlowWholePlan,
  getOpenMyFlowItemDetail,
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

async function seedSavedFlow(page: Page, slug: string, anchor: string) {
  await page.goto('/flows');
  await page.evaluate(({ flowSlug, flowAnchor }) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      slug: flowSlug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: flowAnchor,
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${flowSlug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: flowAnchor }),
    );
  }, { flowSlug: slug, flowAnchor: anchor });
}

test.describe('P35-R8 semantic and execution continuity', () => {
  test('overseas safety stays checklist-primary from public preview through saved execution', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/overseas-safety-register');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const publicRoot = page.locator('main[data-p35-r8-marker="P35-R8B-ARTIFACT-SEMANTIC-CONTINUITY"]');
    await expect(publicRoot).toHaveAttribute(
      'data-p35-r8-resource-marker',
      'P35-R8B-RESOURCE-NOT-EXECUTION',
    );
    const preview = page.getByTestId('public-flow-capability-result');
    await expect(preview).toHaveAttribute('data-capability-primary-destination', 'checklist');
    await preview.getByTestId('flow-capability-artifact-preview-expand').click();
    await expect(preview.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(4);
    await expect(preview.getByRole('checkbox')).toHaveCount(0);

    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    const primary = preview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="checklist"]',
    );
    await expect(primary).toHaveAttribute('data-capability-candidate-role', 'primary');
    const memo = preview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="memo"]',
    );
    await expect(memo).toHaveAttribute('data-capability-candidate-role', 'available');
    await capture(page, 'p35-r8b-safety-public-checklist-390.png', preview);

    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect(page).toHaveURL(/\/my\?view=flows&flow=personal-copy%3A/u);
    const copySlug = new URL(page.url()).searchParams.get('flow') ?? '';
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-save-banner')).toBeVisible();

    const workspace = await openMyFlowLibraryFlow(page, copySlug);
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
    await page.goto('/my?view=flows&flow=moving-d30-basic');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
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
    await expect(planToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(outline).toHaveCount(0);
    await planToggle.click();
    await expect(planToggle).toHaveAttribute('aria-expanded', 'true');
    const expandedOutline = await expandMyFlowWholePlan(workspace);
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
