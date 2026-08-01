import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R3_EVIDENCE_DIR;

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
    receiptCount: document.querySelectorAll(
      '[data-testid="public-flow-saved-receipt"], [data-testid="my-flow-post-save-panel"]',
    ).length,
  }));
  expect(result.horizontalOverflow).toBe(0);
  expect(result.receiptCount).toBeLessThanOrEqual(1);
}

async function saveMovingFlow(page: Page) {
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
  const save = page.viewportSize()!.width < 640
    ? page.getByTestId('public-flow-save-primary-mobile')
    : page.getByTestId('public-flow-save-primary');
  await save.click();
}

test.describe('P35-R3 receipt to focused workspace continuity', () => {
  test('mobile receipt has one primary action and opens the saved Flow directly', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute('data-p35-marker', 'P35-R3-SINGLE-SAVED-RECEIPT');
    await expect(receipt).toContainText('캘린더 24개를 저장했어요');
    await expect(receipt).toContainText('내 Flow에서 이어하기');
    await expect(receipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(receipt.getByRole('link', { name: '캘린더에서 보기' })).toHaveCount(0);
    await expect(receipt.getByRole('button')).toHaveCount(0);
    await capture(page, 'p35-r3-saved-receipt-390.png');

    const primary = receipt.getByTestId('public-flow-saved-receipt-primary');
    await expect(primary).toHaveAttribute('href', '/my?view=flows&flow=moving-d30-basic');
    await primary.click();

    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    await expect(workspace).toContainText('이사');
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(workspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    const firstEntry = workspace.getByTestId('my-flow-shape-aware-execution');
    const firstEntryRows = firstEntry.getByTestId('my-flow-execution-row-shell');
    expect(await firstEntryRows.count()).toBeGreaterThan(0);
    expect(await firstEntryRows.count()).toBeLessThanOrEqual(3);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );
    await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);
    await capture(page, 'p35-r3-focused-workspace-390.png');

    await page.reload();
    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const reloadedWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    await expect(reloadedWorkspace).toBeVisible();
    await expect(reloadedWorkspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(reloadedWorkspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('wide receipt and workspace keep the same single handoff', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(receipt.locator('[data-action-priority="secondary"]')).toHaveCount(0);
    await expect(receipt.getByRole('link', { name: '캘린더에서 보기' })).toHaveCount(0);
    await capture(page, 'p35-r3-saved-receipt-1024.png');
    await receipt.getByTestId('public-flow-saved-receipt-primary').click();

    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expect(workspace).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-commands')).toBeVisible();
    await capture(page, 'p35-r3-focused-workspace-1024.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('legacy savedFlow handoff is reduced to one primary action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2030-08-01T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2030-09-01',
      }));
    });
    await page.goto('/my?savedFlow=moving-d30-basic');

    const legacyReceipt = page.getByTestId('my-flow-post-save-panel');
    await expect(legacyReceipt).toBeVisible();
    await expect(legacyReceipt.locator('[data-p35-marker="P35-R3-LEGACY-HANDOFF-SINGLE-ACTION"]')).toHaveCount(1);
    await expect(legacyReceipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-calendar')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-export')).toHaveCount(0);
    await legacyReceipt.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  });
});
