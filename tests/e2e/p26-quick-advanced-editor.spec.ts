import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function saveMovingPersonalCopy(page: Page) {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByLabel('이사일').fill('2026-08-15');
  await page.getByRole('button', { name: '그대로 시작' }).click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
  await page.getByTestId('my-flow-view-flow').click();
}

async function enterEditMode(detail: Locator) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) {
    await readSummary.locator('summary').click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function openMobileFirstRow(page: Page) {
  const flow = page.locator(
    ':is([data-testid="my-flow-overview-card"], [data-testid="my-flow-mobile-structure-row"])',
  ).first();
  await expect(flow).toBeVisible();
  const flowOpen = flow.getByTestId('my-flow-mobile-structure-open');
  if ((await flowOpen.count()) > 0 && (await flowOpen.getAttribute('aria-expanded')) !== 'true') await flowOpen.click();
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
  await expect(firstRow).toBeVisible();
  const openButton = firstRow.locator('button').first();
  await openButton.click();
  const detail = firstRow.getByTestId('my-flow-inline-detail').getByTestId('my-flow-item-detail');
  await expect(detail).toBeVisible();
  return { flow, firstRow, openButton, detail };
}

test.describe('P26-10 quick and advanced editor separation', () => {
  test('mobile uses a contained quick editor with guarded discard and atomic persistence', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingPersonalCopy(page);

    const opened = await openMobileFirstRow(page);
    const cardBeforeEdit = await opened.flow.boundingBox();
    await enterEditMode(opened.detail);

    const editor = page.getByRole('dialog', { name: '할 일 수정' });
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute('data-editor-layout', 'mobile-full-screen');
    await expect(editor).toHaveAttribute('aria-modal', 'true');
    await expect(editor.getByTestId('my-flow-detail-title-input')).toBeVisible();
    await expect(editor.getByTestId('my-flow-detail-date-input')).toBeVisible();
    await expect(editor.getByTestId('my-flow-detail-memo')).toBeVisible();
    await expect(editor.locator('input[type="time"]')).toHaveCount(0);
    await expect(editor.locator('input[placeholder="장소 없음"]')).toHaveCount(0);
    await expect(editor.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.dataset.testid ?? active?.tagName ?? '';
    })).toBe('my-flow-detail-title-input');

    const editorBox = await editor.boundingBox();
    expect(editorBox).not.toBeNull();
    expect(editorBox!.x).toBeLessThanOrEqual(1);
    expect(editorBox!.y).toBeLessThanOrEqual(1);
    expect(editorBox!.width).toBeGreaterThanOrEqual(389);
    expect(editorBox!.height).toBeGreaterThanOrEqual(843);
    const cardDuringEdit = await opened.flow.boundingBox();
    expect(cardBeforeEdit).not.toBeNull();
    expect(cardDuringEdit).not.toBeNull();
    expect(cardDuringEdit!.height - cardBeforeEdit!.height).toBeLessThan(80);
    await capture(page, '01-mobile-quick-editor.png');

    const cancel = editor.getByTestId('my-flow-editor-cancel');
    await cancel.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await editor.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    await editor.getByTestId('my-flow-editor-advanced-toggle').click();
    await expect(editor).toHaveAttribute('data-editor-advanced-expanded', 'true');
    await expect(editor.locator('input[type="time"]')).toBeVisible();
    await expect(editor.locator('input[placeholder="장소 없음"]')).toBeVisible();
    await expect(editor.getByTestId('my-flow-detail-repeat-input')).toBeVisible();
    await editor.evaluate((element) => element.scrollTo({ top: 0, behavior: 'instant' }));
    await capture(page, '02-mobile-advanced-editor.png');

    await editor.getByTestId('my-flow-detail-title-input').fill('이사 견적 후보 확인');
    await page.keyboard.press('Escape');
    const discardPrompt = editor.getByTestId('my-flow-editor-discard-prompt');
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole('button', { name: '계속 수정' }).click();
    await expect(editor.getByTestId('my-flow-detail-title-input')).toHaveValue('이사 견적 후보 확인');
    await cancel.click();
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByTestId('my-flow-editor-confirm-discard').click();
    await expect(page.getByRole('dialog', { name: '할 일 수정' })).toHaveCount(0);
    await expect(opened.openButton).toBeFocused();

    const reopened = await openMobileFirstRow(page);
    await enterEditMode(reopened.detail);
    const saveEditor = page.getByRole('dialog', { name: '할 일 수정' });
    await saveEditor.getByTestId('my-flow-detail-title-input').fill('이사 견적 후보 확인');
    await saveEditor.getByTestId('my-flow-detail-memo').fill('세 업체 견적과 가능 날짜를 비교');
    await saveEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(page.getByRole('dialog', { name: '할 일 수정' })).toHaveCount(0);

    await page.reload();
    const persisted = await openMobileFirstRow(page);
    await enterEditMode(persisted.detail);
    const persistedEditor = page.getByRole('dialog', { name: '할 일 수정' });
    await expect(persistedEditor.getByTestId('my-flow-detail-title-input')).toHaveValue('이사 견적 후보 확인');
    await expect(persistedEditor.getByTestId('my-flow-detail-memo')).toHaveValue('세 업체 견적과 가능 날짜를 비교');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('wide keeps the same editor in a stable detail pane with sticky actions', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedMovingFlow(page);
    await page.goto('/my?view=flows');

    const flow = page.getByTestId('my-flow-overview-card').first();
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
    await firstRow.locator('button').first().click();
    const pane = flow.getByTestId('my-flow-workspace-detail-pane');
    const detail = pane.getByTestId('my-flow-item-detail');
    await enterEditMode(detail);

    const editor = pane.getByRole('dialog', { name: '할 일 수정' });
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

  test('Calendar agenda reuses the contained quick editor', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux12');
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    const event = page.locator('.fc-event[aria-label*="상세 열기"]').first();
    await expect(event).toBeVisible();
    await event.click();

    const detail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
    await enterEditMode(detail);
    const editor = page.getByRole('dialog', { name: '할 일 수정' });
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
