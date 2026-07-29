import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import {
  closeOpenMyFlowItemDetail,
  expandMyFlowWholePlan,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P25_05A_EVIDENCE_DIR ?? process.env.FLOWME_P25_WHOLE_FLOW_EVIDENCE_DIR;

async function captureEvidence(page: import('@playwright/test').Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotsDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
}

function collectConsoleErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function saveMovingFlow(page: import('@playwright/test').Page) {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const wideSave = page.getByTestId('public-flow-save-primary');
  if (await wideSave.isVisible()) {
    await wideSave.click();
  } else {
    await page.getByTestId('public-flow-save-primary-mobile').click();
  }
  await page.getByTestId('public-flow-saved-receipt-primary').click();
  await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
}

test.describe('P25 whole Flow workspace', () => {
  test('mobile keeps the complete saved Flow visible and exposes a persistent completed view', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await expect(page.locator('main')).toHaveAttribute('data-p32-workspace-state', 'focused');
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);

    const savedFlow = await openMyFlowLibraryFlow(
      page,
      'moving-d30-basic',
      'execute',
    );
    await expect(savedFlow).toHaveAttribute(
      'data-p31-marker',
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await expect(savedFlow.getByTestId('my-flow-workspace-execute')).toBeVisible();
    const mobileOutline = savedFlow.getByTestId('my-flow-whole-flow-outline');
    await captureEvidence(page, '01-post-save-whole-flow-mobile.png');
    await expect(mobileOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(mobileOutline).toHaveAttribute('data-effective-row-count', '24');
    await expect(mobileOutline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('6단계');
    await expect(mobileOutline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('0/24 완료');
    const currentExecutionRows = savedFlow
      .getByTestId('my-flow-shape-aware-execution')
      .getByTestId('my-flow-execution-row-shell');
    await expect(currentExecutionRows).toHaveCount(4);
    const firstExecutionRow = currentExecutionRows.first();
    const [completionBox, titleBox] = await Promise.all([
      firstExecutionRow.getByTestId('my-flow-task-complete-label').boundingBox(),
      firstExecutionRow.getByTestId('my-flow-row-title').boundingBox(),
    ]);
    expect(completionBox?.width).toBeGreaterThanOrEqual(44);
    expect(completionBox?.height).toBeGreaterThanOrEqual(44);
    expect(titleBox).not.toBeNull();
    await expect(firstExecutionRow.getByRole('button', { name: /7월 16일/ })).toBeVisible();
    await expect(firstExecutionRow.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    await closeOpenMyFlowItemDetail(page);
    await captureEvidence(page, '02-returning-whole-flow-mobile.png');

    await firstExecutionRow.getByTestId('my-flow-task-complete-control').click();
    await page.reload();
    await expect(page).toHaveURL(/view=flows/);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const reopenedWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    const reopenedOutline = reopenedWorkspace.getByTestId('my-flow-whole-flow-outline');
    await expect(reopenedOutline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('1/24 완료');
    await expandMyFlowWholePlan(reopenedWorkspace);
    const completedControl = reopenedWorkspace
      .locator('[data-testid="my-flow-task-complete-control"]:checked')
      .first();
    await expect(completedControl).toHaveAccessibleName(/다시 열기/);
    await completedControl.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute('data-completion-result', 'reopened');
    await expect(reopenedOutline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('0/24 완료');
    await captureEvidence(page, '03-completed-reopen-mobile.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    expect(consoleErrors).toEqual([]);
  });

  test('wide selected Flow uses the same whole-Flow outline contract', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary').click();
    await page.getByTestId('public-flow-saved-receipt-primary').click();

    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const selectedFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const responsiveWorkspace = selectedFlow.getByTestId('my-flow-whole-flow-workspace');
    const workspaceOutline = selectedFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(responsiveWorkspace).toHaveAttribute('data-workspace-layout', 'wide-execution-inspector');
    await expect(workspaceOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(workspaceOutline).toHaveAttribute('data-effective-row-count', '24');
    await expect(workspaceOutline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('0/24 완료');
    const currentExecutionRows = selectedFlow
      .getByTestId('my-flow-shape-aware-execution')
      .getByTestId('my-flow-execution-row-shell');
    await expect(currentExecutionRows).toHaveCount(4);
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    await expect(page.getByTestId('my-flow-library-back')).toBeVisible();
    const selectedFlowBox = await selectedFlow.boundingBox();
    expect(selectedFlowBox).not.toBeNull();
    expect(selectedFlowBox!.width).toBeGreaterThan(620);

    const detailPane = selectedFlow.getByTestId('my-flow-workspace-detail-pane');
    await expect(detailPane).toBeVisible();
    await expect(detailPane.getByTestId('my-flow-workspace-flow-summary')).toBeVisible();
    await currentExecutionRows.first().getByRole('button', { name: /열기/ }).click();
    await expect(detailPane.getByTestId('my-flow-workspace-flow-summary')).toHaveCount(0);
    await expect(detailPane.getByRole('button', { name: '닫기' })).toBeVisible();
    await expect(detailPane.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(workspaceOutline.getByTestId('my-flow-inline-detail')).toHaveCount(0);
    await captureEvidence(page, '04-returning-whole-flow-wide.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    expect(consoleErrors).toEqual([]);
  });

  test('wide multi-Flow workspace exposes rail, outline, and detail without competing scope controls', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    await page.goto('/flow-maps/middle-school-math-1');
    await page.getByTestId('flow-map-save-all').click();
    await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
    await page.getByTestId('my-flow-post-save-view-flow').click();

    const library = page.getByTestId('my-flow-library-workspace');
    const rail = library.getByTestId('my-flow-library-rail');
    const libraryDetail = library.getByTestId('my-flow-library-detail');
    const selectedFlow = libraryDetail.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
    const outlinePane = selectedFlow.getByTestId('my-flow-workspace-outline-pane');
    const detailPane = selectedFlow.getByTestId('my-flow-workspace-detail-pane');
    await expect(library).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
    await expect(rail).toBeVisible();
    await expect(outlinePane).toBeVisible();
    await expect(detailPane).toBeVisible();
    await expect(page.getByTestId('my-flow-scope-select')).toBeHidden();

    const [railBox, libraryDetailBox, outlineBox, detailBox] = await Promise.all([
      rail.boundingBox(),
      libraryDetail.boundingBox(),
      outlinePane.boundingBox(),
      detailPane.boundingBox(),
    ]);
    expect(railBox).not.toBeNull();
    expect(libraryDetailBox).not.toBeNull();
    expect(outlineBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    expect(railBox!.x).toBeLessThan(libraryDetailBox!.x);
    expect(outlineBox!.x).toBeGreaterThanOrEqual(libraryDetailBox!.x);
    expect(outlineBox!.x).toBeLessThan(detailBox!.x);
    await captureEvidence(page, '05-multi-flow-three-pane-wide.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    expect(consoleErrors).toEqual([]);
  });
});
