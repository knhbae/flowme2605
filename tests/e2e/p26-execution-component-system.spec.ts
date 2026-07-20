import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P26_17_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function capture(page: Page, filename: string, fullPage = true) {
  await expectNoHorizontalOverflow(page);
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage });
}

async function seedMovingFlow(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-07-20T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-08-15',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-08-15',
    }));
  });
}

test('mobile save journey uses one summary, receipt, outline, and export grammar', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const hero = page.getByTestId('public-flow-hero');
  await expect(hero.locator('[data-flow-ui="artifact-summary"]')).toHaveCount(1);
  await expect(hero.locator('[data-flow-ui="schedule-intent"]')).toHaveCount(1);
  await expect(hero.locator('[data-flow-ui="schedule-intent"]')).toContainText('저장 결과');
  await expect(hero.locator('[data-flow-ui="schedule-intent"]')).toContainText('할 일 10개');
  await expect(page.locator('[data-action-priority="primary"]:visible')).toHaveCount(1);
  await capture(page, '01-public-save-before-mobile.png');

  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' }).click();

  const hub = page.getByTestId('my-flow-post-save-panel');
  await expect(hub.locator('[data-flow-ui="receipt"]')).toHaveCount(1);
  expect(await hub.locator('[data-flow-ui="outline-row"]').count()).toBeGreaterThan(0);
  await expect(hub.locator('[data-action-priority="primary"]:visible')).toHaveCount(1);
  await capture(page, '02-post-save-receipt-outline-mobile.png');

  await hub.getByTestId('my-flow-post-save-open-export').click();
  const exportPlan = hub.locator('[data-flow-ui="export-plan"]');
  await expect(exportPlan).toBeVisible();
  await exportPlan.getByTestId('my-flow-export-checklist').click();
  await expect(exportPlan.locator('[data-flow-ui="receipt"]')).toBeVisible();
  await capture(page, '03-export-plan-receipt-mobile.png');
  expect(browserErrors).toEqual([]);
});

test('wide whole Flow and editor reuse open rows and a stable editor shell', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedMovingFlow(page);
  await page.goto('/my?view=flows');

  const flow = page.getByTestId('my-flow-overview-card').first();
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  expect(await outline.locator('[data-flow-ui="outline-row"]').count()).toBeGreaterThan(0);
  expect(await outline.locator('[data-flow-ui="execution-row"]').count()).toBeGreaterThan(0);
  const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
  await firstRow.locator('button').first().click();

  const pane = flow.getByTestId('my-flow-workspace-detail-pane');
  const detail = pane.getByTestId('my-flow-item-detail');
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();

  const editor = pane.getByRole('dialog', { name: '할 일 수정' });
  await expect(editor).toHaveAttribute('data-flow-ui', 'editor-shell');
  await expect(editor.getByTestId('my-flow-detail-save-changes')).toHaveAttribute('data-action-priority', 'primary');
  await editor.getByTestId('my-flow-detail-title-input').focus();
  await expect(editor.getByTestId('my-flow-detail-title-input')).toBeFocused();
  await capture(page, '04-whole-flow-editor-wide.png');
  expect(browserErrors).toEqual([]);
});

test('held content uses the warning receipt without an execution primary', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=baby-health-schedule');
  const hub = page.getByTestId('my-flow-post-save-panel');
  const receipt = hub.locator('[data-flow-ui="receipt"]');
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText('저장 기록 보관됨');
  await expect(hub.locator('[data-action-priority="primary"]')).toHaveCount(0);
  await capture(page, '05-held-warning-receipt-mobile.png');
  expect(browserErrors).toEqual([]);
});
