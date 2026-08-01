import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P35_03_EVIDENCE_DIR;

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
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

async function openAdjustment(page: Page, mobile: boolean) {
  const trigger = page.getByTestId(
    mobile ? 'public-flow-adjust-entry-mobile' : 'public-flow-adjust-entry',
  );
  await trigger.focus();
  await trigger.click();
  const panel = page.getByTestId('public-flow-personal-adjustment');
  await expect(panel).toHaveAttribute('data-p35-marker', 'P35-ATOMIC-FULL-HEIGHT-EDITOR');
  await expect(panel).toHaveAttribute('data-editor-transaction', 'atomic');
  await expect(panel.getByTestId('public-flow-adjustment-kind-name')).toBeFocused();
  await expect(page.locator('[role="dialog"]')).toHaveCount(1);
  await expect(panel.getByTestId('public-flow-adjustment-active-panel')).toHaveCount(1);
  return { panel, trigger };
}

test.describe('P35-03 one adjustment kind at a time', () => {
  test('mobile name adjustment supports cancel, apply, Escape, and focus return', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/moving-d30-basic');

    const { panel } = await openAdjustment(page, true);
    await expect(panel).toHaveAttribute('data-adjustment-kind', 'name');
    await expect(panel.getByTestId('public-flow-adjustment-kind-name')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByTestId('public-flow-adjustment-kind-anchor')).toHaveCount(1);
    await expect(panel.getByTestId('public-flow-adjustment-kind-items')).toHaveCount(1);
    await expect(panel.getByTestId('public-flow-adjustment-kind-routine')).toHaveCount(0);
    await expect(panel.getByTestId('public-flow-adjustment-name-input')).toHaveCount(1);
    await expect(panel.locator('input[type="date"]')).toHaveCount(0);
    await expect(panel.getByTestId('public-flow-adjustment-item-list')).toHaveCount(0);

    await panel.getByTestId('public-flow-adjustment-name-input').fill('우리 집 이사 준비');
    await panel.getByTestId('public-flow-adjustment-kind-items').click();
    await panel.getByTestId('public-flow-adjustment-kind-name').click();
    await expect(panel.getByTestId('public-flow-adjustment-name-input')).toHaveValue('우리 집 이사 준비');
    await expect(panel.getByTestId('public-flow-adjustment-result-before')).toContainText('이사 D-30 준비');
    await expect(panel.getByTestId('public-flow-adjustment-result-after')).toContainText('우리 집 이사 준비');
    await capture(page, 'p35-03-adjust-name-390.png');

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeFocused();
    await expect(page.locator('[data-flow-identity-slot="title"]')).toHaveText('이사 D-30 준비');

    const reopened = await openAdjustment(page, true);
    await reopened.panel.getByTestId('public-flow-adjustment-name-input').fill('우리 집 이사 준비');
    await reopened.panel.getByTestId('public-flow-adjustment-apply').click();
    await expect(reopened.panel).toHaveCount(0);
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeFocused();
    await expect(page.locator('[data-flow-identity-slot="title"]')).toHaveText('우리 집 이사 준비');
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('mobile anchor adjustment previews before and after without duplicating the base input', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
    const oldSummary = await page.getByTestId('flow-artifact-result-summary').textContent();

    const { panel } = await openAdjustment(page, true);
    const anchorKind = panel.getByTestId('public-flow-adjustment-kind-anchor');
    await anchorKind.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('data-adjustment-kind', 'anchor');
    await expect(panel.getByTestId('public-flow-adjustment-anchor-input')).toHaveValue('2030-09-01');
    await expect(panel.getByTestId('public-flow-adjustment-name-input')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);

    await panel.getByTestId('public-flow-adjustment-anchor-input').fill('2030-10-01');
    await expect(page.getByTestId('flow-artifact-result-summary')).not.toHaveText(oldSummary ?? '');
    await expect(panel.getByTestId('public-flow-adjustment-result-before')).not.toHaveText(
      await panel.getByTestId('public-flow-adjustment-result-after').textContent() ?? '',
    );
    await capture(page, 'p35-03-adjust-anchor-390.png');

    await panel.getByTestId('public-flow-adjustment-cancel').click();
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveValue('2030-09-01');
    await expect(page.getByTestId('flow-artifact-result-summary')).toHaveText(oldSummary ?? '');
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeFocused();

    const reopened = await openAdjustment(page, true);
    await reopened.panel.getByTestId('public-flow-adjustment-kind-anchor').click();
    await reopened.panel.getByTestId('public-flow-adjustment-anchor-input').fill('2030-10-01');
    await reopened.panel.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveValue('2030-10-01');
    await expect(page.getByTestId('flow-artifact-result-summary')).not.toHaveText(oldSummary ?? '');
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('mobile browser Back closes child then parent and restores focus without applying drafts', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/moving-d30-basic');

    const previewEdit = page.getByTestId('public-flow-artifact-preview-row-edit').first();
    const itemId = await previewEdit.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await previewEdit.focus();
    await previewEdit.click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    await expect(itemEditor).toBeVisible();
    await itemEditor.getByTestId('public-flow-item-editor-title-input').fill('적용하면 안 되는 이름');
    await page.goBack();

    const parent = page.getByTestId('public-flow-personal-adjustment');
    await expect(itemEditor).toHaveCount(0);
    await expect(parent).toBeVisible();
    await expect(parent.locator(
      `[data-testid="public-flow-adjustment-item-edit"][data-item-id="${itemId}"]`,
    )).toBeFocused();

    await page.goBack();
    await expect(parent).toHaveCount(0);
    await expect(previewEdit).toBeFocused();
    await expect(page.getByTestId('public-flow-artifact-preview')).not.toContainText(
      '적용하면 안 되는 이름',
    );
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('wide item inclusion changes preview, save count, and export preflight without deleting source', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');

    const { panel } = await openAdjustment(page, false);
    await panel.getByTestId('public-flow-adjustment-kind-items').click();
    await expect(panel).toHaveAttribute('data-adjustment-kind', 'items');
    const rows = panel.getByTestId('public-flow-adjustment-item-row');
    await expect(rows).toHaveCount(24);
    const firstItemId = await rows.nth(0).getAttribute('data-item-id');
    const secondItemId = await rows.nth(1).getAttribute('data-item-id');
    expect(firstItemId).toBeTruthy();
    expect(secondItemId).toBeTruthy();
    await rows.nth(1).getByTestId('public-flow-adjustment-item-move-up').click();
    await expect(rows.nth(0)).toHaveAttribute('data-item-id', secondItemId ?? '');
    await expect(rows.nth(1)).toHaveAttribute('data-item-id', firstItemId ?? '');
    await rows.nth(0).getByRole('checkbox').uncheck();
    await rows.nth(1).getByRole('checkbox').uncheck();
    await expect(panel.getByTestId('public-flow-adjustment-result-after')).toContainText('22개');
    await expect(page.getByTestId('public-flow-artifact-preview').getByRole('heading', { level: 2 }))
      .toContainText('22개');
    await capture(page, 'p35-03-adjust-items-1024.png');

    await panel.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.getByTestId('public-flow-save-primary')).toContainText('22개로 시작');
    await page.getByTestId('public-flow-export-secondary-toggle').click();
    await expect(page.getByTestId('public-flow-export-branch')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-export-panel')).toHaveAttribute(
      'data-export-included-count',
      '22',
    );
    await expect(page.getByTestId('public-flow-artifact-preview-row')).toHaveCount(22);
    const storedOrder = await page.evaluate(({ movedItemId }) => {
      const states = JSON.parse(
        window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') || '{}',
      ) as Record<string, { personalOrder?: number }>;
      return movedItemId ? states[movedItemId]?.personalOrder : undefined;
    }, { movedItemId: secondItemId });
    expect(storedOrder).toBe(0);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('desktop routine adjustment is the only advanced panel and updates the routine summary', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/curated-allblanc-morning-workout');
    await page.getByTestId('public-flow-anchor-input').fill('2030-09-02');

    const { panel } = await openAdjustment(page, false);
    await expect(panel.getByTestId('public-flow-adjustment-kind-routine')).toHaveCount(1);
    await panel.getByTestId('public-flow-adjustment-kind-routine').click();
    await expect(panel).toHaveAttribute('data-adjustment-kind', 'routine');
    await expect(panel.getByTestId('public-flow-adjustment-routine-editor')).toHaveCount(1);
    await expect(panel.getByTestId('public-flow-adjustment-name-input')).toHaveCount(0);
    await expect(panel.getByTestId('public-flow-adjustment-item-list')).toHaveCount(0);
    await expect(panel.getByTestId('public-flow-adjustment-anchor-input')).toHaveCount(0);

    await panel.getByRole('checkbox', { name: '반복 요일 화' }).check();
    await panel.getByTestId('public-flow-adjustment-routine-time-mode').selectOption('timed');
    await panel.getByTestId('public-flow-adjustment-routine-time').fill('07:30');
    await panel.getByTestId('public-flow-adjustment-routine-duration').selectOption('45');
    await panel.getByTestId('public-flow-adjustment-routine-end-mode').selectOption('count');
    await panel.getByTestId('public-flow-adjustment-routine-occurrence-count').fill('8');
    await expect(panel.getByTestId('public-flow-adjustment-result-after')).toContainText('07:30');
    await expect(panel.getByTestId('public-flow-adjustment-result-after')).toContainText('8회');
    await capture(page, 'p35-03-adjust-routine-1440.png');

    await panel.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.getByTestId('public-routine-schedule-summary')).toContainText('07:30');
    await expect(page.getByTestId('flow-artifact-result-summary')).toContainText('07:30');
    await expect(page.getByTestId('public-flow-adjust-entry')).toBeFocused();
    await page.getByTestId('public-flow-export-secondary-toggle').click();
    await expect(page.getByTestId('my-flow-export-calendar-format-notice')).toContainText(
      '항목별 제목·메모·날짜·포함 여부·순서',
    );
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('irrelevant adjustment kinds stay hidden for an undated checklist', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/f/vehicle-inspection-prep');

    const { panel } = await openAdjustment(page, true);
    await expect(panel.getByTestId('public-flow-adjustment-kind-picker').getByRole('button')).toHaveCount(2);
    await expect(panel.getByTestId('public-flow-adjustment-kind-name')).toHaveCount(1);
    await expect(panel.getByTestId('public-flow-adjustment-kind-items')).toHaveCount(1);
    await expect(panel.getByTestId('public-flow-adjustment-kind-anchor')).toHaveCount(0);
    await expect(panel.getByTestId('public-flow-adjustment-kind-routine')).toHaveCount(0);
    await expect(panel.locator('textarea')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
});
