import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
  withLegacySavedPlanLibraryRoute,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P26_10_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string, fullPage = false) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage });
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

async function saveMovingPersonalCopy(page: Page): Promise<string> {
  await gotoLegacySavedPlanLibraryRoute(page, '/flow-maps/moving-d30');
  await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL(withLegacySavedPlanLibraryRoute('/f/moving-d30-basic'));
  await page.getByLabel('이사일').fill('2026-08-15');
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
  });
  return new URL(page.url()).searchParams.get('flow') ?? '';
}

async function enterEditMode(detail: Locator) {
  const itemId = await detail.getAttribute('data-item-id');
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    await expect(readSummary).toBeVisible();
    if ((await readSummary.getAttribute('open')) === null) {
      await readSummary.locator('summary').click();
    }
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  const selector = itemId
    ? `[data-testid="my-flow-item-detail"][data-item-id=${JSON.stringify(itemId)}][data-detail-mode="edit"]:visible`
    : '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible';
  const editor = detail.page().locator(selector);
  await expect(editor).toHaveCount(1);
  return editor;
}

async function openMobileFirstRow(page: Page, flowSlug = 'moving-d30-basic') {
  const flow = await openMyFlowLibraryFlow(page, flowSlug, 'plan');
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
  await expect(firstRow).toBeVisible();
  const openButton = firstRow.locator('button').first();
  let detail = getOpenMyFlowItemDetail(page);
  if (!(await detail.isVisible().catch(() => false))) {
    await openButton.click();
    detail = getOpenMyFlowItemDetail(page);
  }
  await expect(detail).toBeVisible();
  return { flow, firstRow, openButton, detail };
}

async function openSharedSavedItemEditor(page: Page, flowSlug: string) {
  const opened = await openMobileFirstRow(page, flowSlug);
  await opened.detail.getByTestId('my-flow-quick-item-edit').click();
  const editor = page.getByTestId('saved-flow-editor-item');
  await expect(editor).toBeVisible();
  return { ...opened, editor };
}

test.describe('P26-10 quick and advanced editor separation', () => {
  test('mobile canonical personal copy stages Saved Item changes in the parent Plan before the final Save', async ({ page }) => {
    test.setTimeout(180_000);
    await installLegacySavedPlanLibraryNavigation(page);
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const personalCopyKey = await saveMovingPersonalCopy(page);

    const opened = await openSharedSavedItemEditor(page, personalCopyKey);
    const editor = opened.editor;
    await expect(editor).toHaveAttribute('data-editor-frame', 'shared');
    await expect(editor).toHaveAttribute('data-editor-context', 'saved-overlay');
    await expect(editor).toHaveAttribute('data-editor-level', 'item');
    await expect(editor).toHaveAttribute('data-editor-layout', 'responsive');
    await expect(editor).toHaveAttribute('data-editor-semantic-role', 'pending-saved-plan-save');
    await expect(editor).toHaveAttribute('data-editor-commit-role', 'apply-item-to-parent-personal-draft');
    await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic-child');
    await expect(editor).toHaveAttribute('aria-modal', 'true');
    await expect(editor.getByTestId('saved-flow-editor-item-title-input')).toBeVisible();
    await expect(editor.getByTestId('saved-flow-editor-item-date-input')).toBeVisible();
    await expect(editor.getByTestId('saved-flow-editor-item-detail-input')).toBeVisible();
    await expect(editor.locator('input[type="time"]')).toHaveCount(0);
    await expect(editor.locator('input[placeholder="장소 없음"]')).toHaveCount(0);
    await expect(editor.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.dataset.testid ?? active?.tagName ?? '';
    })).toBe('saved-flow-editor-item-title-input');

    const editorBox = await editor.boundingBox();
    expect(editorBox).not.toBeNull();
    expect(editorBox!.x).toBeLessThanOrEqual(1);
    expect(editorBox!.y).toBeLessThanOrEqual(1);
    expect(editorBox!.width).toBeGreaterThanOrEqual(389);
    expect(editorBox!.height).toBeGreaterThanOrEqual(843);
    await capture(page, '01-mobile-quick-editor.png');

    const cancel = editor.getByTestId('saved-flow-editor-item-cancel');
    await cancel.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await editor.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    await editor.getByTestId('saved-flow-editor-item-title-input').fill('이사 견적 후보 확인');
    await page.keyboard.press('Escape');
    const discardPrompt = editor.getByTestId('flow-editor-discard-prompt');
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole('button', { name: '계속 수정' }).click();
    await expect(editor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue('이사 견적 후보 확인');
    await cancel.click();
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByTestId('saved-flow-editor-item-discard-changes').click();
    await expect(page.getByTestId('saved-flow-editor-item')).toHaveCount(0);

    const parentPlan = page.getByTestId('saved-flow-editor-plan');
    await expect(parentPlan).toBeVisible();
    await expect(parentPlan.getByTestId('saved-flow-editor-item-open').first()).toBeFocused();
    await expect(parentPlan).toHaveAttribute('data-editor-frame', 'shared');
    await expect(parentPlan).toHaveAttribute('data-editor-level', 'plan');
    await expect(parentPlan).toHaveAttribute('data-editor-semantic-role', 'saved-personal-copy');
    await expect(parentPlan).toHaveAttribute('data-editor-commit-role', 'save-personal-overlay');
    await expect(parentPlan).toHaveAttribute('data-editor-transaction', 'atomic');

    await parentPlan.getByTestId('saved-flow-editor-item-open').first().click();
    const saveEditor = page.getByTestId('saved-flow-editor-item');
    await expect(saveEditor).toBeVisible();
    await saveEditor.getByTestId('saved-flow-editor-item-title-input').fill('이사 견적 후보 확인');
    await saveEditor.getByTestId('saved-flow-editor-item-detail-input').fill('세 업체 견적과 가능 날짜를 비교');
    await saveEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(page.getByTestId('saved-flow-editor-item')).toHaveCount(0);
    await expect(parentPlan).toBeVisible();
    await expect(parentPlan.getByTestId('saved-flow-editor-item-row').first()).toContainText('이사 견적 후보 확인');
    expect(await page.evaluate(() => (
      window.localStorage.getItem('flow:my-flow:item-drafts') ?? ''
    ))).not.toContain('이사 견적 후보 확인');
    await capture(page, '02-mobile-parent-plan-staged-change.png');

    await parentPlan.getByTestId('saved-flow-editor-save').click();
    await expect(page.getByTestId('saved-flow-editor-plan')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (
      window.localStorage.getItem('flow:my-flow:item-drafts') ?? ''
    ))).toContain('이사 견적 후보 확인');

    await closeOpenMyFlowItemDetail(page);
    await page.reload();
    const persisted = await openSharedSavedItemEditor(page, personalCopyKey);
    await expect(persisted.editor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue('이사 견적 후보 확인');
    await expect(persisted.editor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue('세 업체 견적과 가능 날짜를 비교');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('wide keeps the same editor in a stable detail pane with sticky actions', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedMovingFlow(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');

    const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
    await firstRow.locator('button').first().click();
    const pane = flow.getByTestId('my-flow-workspace-detail-pane');
    const detail = pane.getByTestId('my-flow-item-detail');
    const editor = await enterEditMode(detail);
    await expect(editor).toHaveAttribute('data-editor-layout', 'wide-detail-pane');
    await expect(editor).not.toHaveAttribute('aria-modal', 'true');
    await expect(editor.getByTestId('my-flow-detail-edit-actions')).toHaveAttribute('data-editor-actions-sticky', 'true');
    const paneBox = await pane.boundingBox();
    expect(paneBox).not.toBeNull();
    expect(paneBox!.width).toBeGreaterThanOrEqual(270);
    expect(paneBox!.width).toBeLessThanOrEqual(330);

    await editor.getByTestId('my-flow-editor-advanced-toggle').click();
    await expect(editor).toHaveAttribute('data-editor-advanced-expanded', 'true');
    await capture(page, '03-wide-advanced-detail-pane.png', true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('Calendar agenda delegates to the contained My Flow quick editor', async ({ page }) => {
    await installLegacySavedPlanLibraryNavigation(page);
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux12');
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
    const task = selectedDay.locator(
      '[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="task"]',
    ).first();
    await expect(task).toBeVisible();
    await task.getByRole('button', { name: /계획에서 열기/ }).click();
    await expect(page).toHaveURL(/\/my\?view=flows&flow=/);

    const detailSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(detailSheet).toBeVisible();
    const detail = detailSheet.getByTestId('my-flow-item-detail');
    const editor = await enterEditMode(detail);
    await expect(editor).toHaveAttribute('data-editor-layout', 'mobile-full-screen');
    await expect(editor.getByTestId('my-flow-detail-title-input')).toBeVisible();
    await expect(editor.getByTestId('my-flow-detail-date-input')).toBeVisible();
    await expect(editor.getByTestId('my-flow-detail-memo')).toBeVisible();
    await expect(editor.getByTestId('my-flow-editor-advanced-toggle')).toHaveAttribute('aria-expanded', 'false');
    await capture(page, '04-mobile-calendar-quick-editor.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });
});
