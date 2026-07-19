import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P25_WHOLE_FLOW_EVIDENCE_DIR;

async function captureEvidence(page: import('@playwright/test').Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotsDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
}

async function saveMovingFlow(page: import('@playwright/test').Page) {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
}

test.describe('P25 whole Flow workspace', () => {
  test('mobile keeps the complete saved Flow visible and exposes a persistent completed view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave).toContainText('저장된 전체 Flow');
    await expect(postSave.getByTestId('my-flow-post-save-step')).toHaveCount(5);
    await expect(postSave.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-outline-mode', 'post-save');
    await captureEvidence(page, '01-post-save-whole-flow-mobile.png');

    await postSave.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-view-today')).toHaveText('지금');
    await expect(page.getByTestId('my-flow-view-flow')).toHaveText('내 Flow');
    await expect(page.getByTestId('my-flow-view-completed')).toHaveText('완료');

    const savedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    const mobileOutline = savedFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(mobileOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(mobileOutline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);
    await expect(savedFlow.getByTestId('my-flow-next-action')).toHaveCount(0);
    await captureEvidence(page, '02-returning-whole-flow-mobile.png');

    await mobileOutline.getByTestId('my-flow-task-complete-control').first().check();
    await page.getByTestId('my-flow-view-completed').click();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('1개');
    const completedControl = page.getByTestId('my-flow-completed-view').getByTestId('my-flow-task-complete-control').first();
    await expect(completedControl).toHaveAccessibleName(/완료 취소/);
    await completedControl.click();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('0개');
    await captureEvidence(page, '03-completed-reopen-mobile.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  test('wide selected Flow uses the same whole-Flow outline contract', async ({ page }) => {
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
    const workspaceOutline = selectedFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(workspaceOutline).toHaveAttribute('data-outline-mode', 'workspace');
    await expect(workspaceOutline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);
    await expect(page.getByTestId('my-flow-view-completed')).toBeVisible();
    await captureEvidence(page, '04-returning-whole-flow-wide.png');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
