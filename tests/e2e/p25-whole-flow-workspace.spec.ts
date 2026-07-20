import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

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
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  const wideSave = page.getByTestId('flow-map-save-all');
  if (await wideSave.isVisible()) {
    await wideSave.click();
  } else {
    await page.getByTestId('flow-map-save-all-mobile').click();
  }
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
}

test.describe('P25 whole Flow workspace', () => {
  test('mobile keeps the complete saved Flow visible and exposes a persistent completed view', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave).toContainText('저장된 전체 Flow');
    await expect(postSave.getByTestId('my-flow-post-save-step')).toHaveCount(5);
    await expect(postSave.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-outline-mode', 'post-save');
    await captureEvidence(page, '01-post-save-whole-flow-mobile.png');

    await postSave.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-view-today')).toHaveText('지금');
    await expect(page.getByTestId('my-flow-view-flow')).toHaveText('Flow 목록');
    await expect(page.getByTestId('my-flow-view-completed')).toHaveText('완료');

    const savedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    const mobileOutline = savedFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(mobileOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(mobileOutline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);
    await expect(savedFlow.getByTestId('my-flow-next-action')).toHaveCount(0);
    const firstExecutionRow = mobileOutline.getByTestId('my-flow-execution-row-shell').first();
    const [completionBox, noteBox, titleBox, metaBox] = await Promise.all([
      firstExecutionRow.getByTestId('my-flow-task-complete-label').boundingBox(),
      firstExecutionRow.getByRole('button', { name: /실행 메모/ }).boundingBox(),
      firstExecutionRow.getByTestId('my-flow-row-title').boundingBox(),
      firstExecutionRow.getByTestId('my-flow-row-date-meta').boundingBox(),
    ]);
    expect(completionBox?.width).toBeGreaterThanOrEqual(44);
    expect(completionBox?.height).toBeGreaterThanOrEqual(44);
    expect(noteBox?.width).toBeGreaterThanOrEqual(44);
    expect(noteBox?.height).toBeGreaterThanOrEqual(44);
    expect(titleBox?.y).toBeLessThanOrEqual(metaBox?.y ?? Number.MAX_SAFE_INTEGER);
    await expect(firstExecutionRow.getByTestId('my-flow-row-open-label')).toHaveText('열기');
    await captureEvidence(page, '02-returning-whole-flow-mobile.png');

    await mobileOutline.getByTestId('my-flow-task-complete-control').first().check();
    await page.reload();
    await expect(page).toHaveURL(/view=flows/);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await page.getByTestId('my-flow-view-completed').click();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('1개');
    await expect(page.getByTestId('my-flow-completed-view')).toContainText('체크를 풀면 다시 진행으로 돌아갑니다.');
    const completedControl = page.getByTestId('my-flow-completed-view').getByTestId('my-flow-task-complete-control').first();
    await expect(completedControl).toHaveAccessibleName(/완료 취소/);
    await completedControl.click();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('0개');
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
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-save-all').click();

    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-outline-mode', 'post-save');
    await postSave.getByTestId('my-flow-post-save-view-flow').click();

    const selectedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    const responsiveWorkspace = selectedFlow.getByTestId('my-flow-whole-flow-workspace');
    const workspaceOutline = selectedFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(responsiveWorkspace).toHaveAttribute('data-workspace-layout', 'wide-outline-detail');
    await expect(workspaceOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(workspaceOutline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);
    await expect(page.getByTestId('my-flow-view-completed')).toBeVisible();
    const selectedFlowBox = await selectedFlow.boundingBox();
    expect(selectedFlowBox).not.toBeNull();
    expect(selectedFlowBox!.width).toBeGreaterThan(700);

    const detailPane = selectedFlow.getByTestId('my-flow-workspace-detail-pane');
    await expect(detailPane).toBeVisible();
    await expect(detailPane.getByTestId('my-flow-workspace-flow-summary')).toBeVisible();
    await workspaceOutline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
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

    const rail = page.getByTestId('my-flow-list');
    const selectedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
    const outlinePane = selectedFlow.getByTestId('my-flow-workspace-outline-pane');
    const detailPane = selectedFlow.getByTestId('my-flow-workspace-detail-pane');
    await expect(rail).toBeVisible();
    await expect(outlinePane).toBeVisible();
    await expect(detailPane).toBeVisible();
    await expect(page.getByTestId('my-flow-scope-select')).toBeHidden();

    const [railBox, outlineBox, detailBox] = await Promise.all([
      rail.boundingBox(),
      outlinePane.boundingBox(),
      detailPane.boundingBox(),
    ]);
    expect(railBox).not.toBeNull();
    expect(outlineBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    expect(railBox!.x).toBeLessThan(outlineBox!.x);
    expect(outlineBox!.x).toBeLessThan(detailBox!.x);
    await captureEvidence(page, '05-multi-flow-three-pane-wide.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    expect(consoleErrors).toEqual([]);
  });
});
