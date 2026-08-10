import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const evidenceRoot = process.env.FLOWME_P35_R2_EVIDENCE_DIR;

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
    editorCount: document.querySelectorAll('[data-testid="public-flow-item-editor"]').length,
  }));
  expect(result.horizontalOverflow).toBe(0);
  expect(result.editorCount).toBeLessThanOrEqual(1);
}

test.describe('P35-R2 contextual public item personalization', () => {
  test('mobile edits one preview row and promotes title, detail, and date on save', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    const preview = page.getByTestId('public-flow-capability-result');
    const calendarTab = preview.locator(
      '[data-public-format-tab="true"][data-capability-destination="calendar"]',
    );
    if (await calendarTab.isVisible().catch(() => false)) await calendarTab.click();
    await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');

    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const parentEditor = page.getByTestId('public-flow-personal-adjustment');
    await parentEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const editTrigger = parentEditor.getByTestId('public-flow-adjustment-item-edit').first();
    const itemId = await editTrigger.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    const stableEditTrigger = parentEditor.locator(
      `[data-testid="public-flow-adjustment-item-edit"][data-item-id="${itemId}"]`,
    );

    await stableEditTrigger.focus();
    await stableEditTrigger.click();
    const editor = page.getByTestId('public-flow-item-editor');
    await expect(editor).toBeVisible();
    await expect(editor.locator('[data-p35-marker*="P35-R2-CONTEXTUAL-ITEM-EDIT-390"]')).toHaveCount(1);
    await expect(page.getByTestId('public-flow-item-editor')).toHaveCount(1);
    await expect(editor.getByTestId('public-flow-item-editor-title-input')).toBeFocused();
    await expect(editor.getByText('시간', { exact: true })).toHaveCount(0);
    await expect(editor.getByText('반복', { exact: true })).toHaveCount(0);
    await expect(editor.getByText('순서', { exact: true })).toHaveCount(0);
    await expect(editor.getByText('삭제', { exact: true })).toHaveCount(0);

    await editor.getByTestId('public-flow-item-editor-title-input').fill('이사 방식 최종 결정');
    await editor.getByTestId('public-flow-item-editor-detail-input').fill('가족과 견적을 확인하고 최종 업체를 적어둡니다.');
    await editor.getByTestId('public-flow-item-editor-date-input').fill('2030-08-15');
    await capture(page, 'p35-r2-item-editor-390.png');
    await editor.getByTestId('public-flow-item-editor-save').click();

    await expect(editor).toHaveCount(0);
    await expect(parentEditor).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    const parentItem = parentEditor.locator(
      `[data-testid="public-flow-adjustment-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(parentItem).toContainText('이사 방식 최종 결정');
    await expect(parentItem).toContainText('8월 15일');
    await parentEditor.getByTestId('public-flow-adjustment-apply').click();

    await expect(parentEditor).toHaveCount(0);
    const editedRow = preview.locator(
      `[data-testid="flow-capability-artifact-preview-row"][data-item-id="${itemId}"]`,
    );
    await expect(editedRow).toContainText('이사 방식 최종 결정');

    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const reopenedParentEditor = page.getByTestId('public-flow-personal-adjustment');
    await reopenedParentEditor.getByTestId('public-flow-adjustment-kind-items').click();
    await reopenedParentEditor.locator(
      `[data-testid="public-flow-adjustment-item-edit"][data-item-id="${itemId}"]`,
    ).click();
    await expect(page.getByTestId('public-flow-item-editor')).toHaveCount(1);
    await expect(page.getByTestId('public-flow-item-editor-date-input')).toHaveValue('2030-08-15');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('public-flow-item-editor')).toHaveCount(0);
    await expect(reopenedParentEditor).toBeVisible();
    await reopenedParentEditor.getByTestId('public-flow-adjustment-cancel').click();
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeFocused();

    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('24');
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    await page.reload();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);

    const stored = await page.evaluate(({ savedItemId }) => {
      const drafts = JSON.parse(
        window.localStorage.getItem('flow:my-flow:item-drafts') || '{}',
      ) as Record<string, { title?: string; memo?: string; date?: string }>;
      const entry = Object.entries(drafts).find(([key]) => (
        key.includes(`::${savedItemId}::`) && key.endsWith('::draft-overlay')
      ));
      return entry ? { key: entry[0], value: entry[1] } : null;
    }, { savedItemId: itemId });
    expect(stored?.value).toEqual({
      title: '이사 방식 최종 결정',
      memo: '가족과 견적을 확인하고 최종 업체를 적어둡니다.',
      date: '2030-08-15',
    });

    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await gotoLegacySavedPlanLibraryRoute(
      page,
      `/my?view=flows&flow=${encodeURIComponent(personalCopyKey)}`,
    );
    const savedWorkspace = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expect(savedWorkspace).toContainText('이사 방식 최종 결정');
    await expect(savedWorkspace).toContainText('8월 15일');
    await capture(page, 'p35-r2-my-flow-personalized-390.png');
    const savedRecord = await page.evaluate((copyKey) => JSON.parse(
      window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null',
    ) as { anchor?: string; dateIntent?: string } | null, personalCopyKey);
    expect(savedRecord).toMatchObject({
      anchor: '2030-09-01',
      dateIntent: 'custom',
    });

    await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
    const calendar = page.getByTestId('my-flow-calendar-workspace');
    await expect(calendar).toBeVisible();
    await page.getByTestId('my-flow-month-picker').fill('2030-08');
    const editedDateCell = page.locator('.fc-daygrid-day[data-date="2030-08-15"]');
    await expect(editedDateCell.locator('.fc-event')).toHaveCount(1);
    await editedDateCell.getByTestId('my-flow-calendar-date-button').click();
    await expect(page.getByTestId('my-flow-selected-date-group')).toContainText('이사 방식 최종 결정');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('wide uses a right inspector and keeps inclusion checkbox on the row end', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');

    await page.getByTestId('public-flow-adjust-entry').click();
    const firstPanel = page.getByTestId('public-flow-personal-adjustment');
    await firstPanel.getByTestId('public-flow-adjustment-kind-items').click();
    await firstPanel.getByTestId('public-flow-adjustment-item-edit').first().click();
    const editor = page.getByTestId('public-flow-item-editor');
    await expect(editor.locator('[data-p35-marker*="P35-R2-ITEM-INSPECTOR-1024"]')).toHaveCount(1);
    await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
    await expect(editor).toHaveAttribute('data-editor-context', 'public-draft');
    await expect(editor).toHaveAttribute('data-editor-level', 'item');
    const editorBox = await editor.boundingBox();
    expect(editorBox).not.toBeNull();
    expect(editorBox!.y).toBeGreaterThanOrEqual(-1);
    expect(editorBox!.y + editorBox!.height).toBeLessThanOrEqual(769);
    expect(editorBox!.height).toBeGreaterThanOrEqual(767);
    expect(editorBox!.x + editorBox!.width).toBeGreaterThanOrEqual(1023);
    expect(editorBox!.width).toBeLessThanOrEqual(673);
    await editor.getByTestId('public-flow-item-editor-cancel').click();
    await expect(page.getByTestId('public-flow-personal-adjustment')).toBeVisible();
    await page.getByTestId('public-flow-adjustment-cancel').click();

    await page.getByTestId('public-flow-adjust-entry').click();
    const panel = page.getByTestId('public-flow-personal-adjustment');
    await panel.getByTestId('public-flow-adjustment-kind-items').click();
    const firstRow = panel.getByTestId('public-flow-adjustment-item-row').first();
    const contentBox = await firstRow.getByTestId('public-flow-adjustment-item-edit').boundingBox();
    const checkboxBox = await firstRow.getByRole('checkbox').boundingBox();
    expect(contentBox).not.toBeNull();
    expect(checkboxBox).not.toBeNull();
    expect(checkboxBox!.x).toBeGreaterThan(contentBox!.x);
    await firstRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(page.getByTestId('public-flow-item-editor')).toHaveCount(1);
    await capture(page, 'p35-r2-item-inspector-1024.png');
    await page.keyboard.press('Escape');
    await expect(firstRow.getByTestId('public-flow-adjustment-item-edit')).toBeFocused();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
