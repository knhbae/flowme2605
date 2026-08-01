import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { openPublicDetailWorkspaceForDeepInspection } from './helpers/open-public-detail-workspace';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

test.beforeEach(async ({ page }) => {
  await openPublicDetailWorkspaceForDeepInspection(page);
});

const evidenceRoot = process.env.FLOWME_P24_JOURNEY_FRAME_EVIDENCE_DIR;

async function captureEvidence(page: import('@playwright/test').Page, filename: string) {
  if (!evidenceRoot) {
    return;
  }

  const screenshotsDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
}

test.describe('P24 save-personalize-execute journey frame', () => {
  test('source-backed save shows the artifact, supports light adjustment, and lands on the whole Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-artifact-preview-expand').click();
    await expect(page.getByTestId('public-flow-artifact-preview-row')).toHaveCount(24);
    await expect(page.getByTestId('public-flow-hero')).toContainText('이사 D-30 준비');
    await expect(page.getByTestId('public-flow-hero')).toContainText('캘린더 · 24개');
    await expect(page.locator('body')).not.toContainText('이사일 1개를 넣으면 원문 체크리스트');
    await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveAccessibleName(
      '이사일 정하고 캘린더로 시작',
    );
    await captureEvidence(page, '01-moving-artifact-first-mobile.png');

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustPanel = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustPanel).toBeVisible();
    await captureEvidence(page, '02-moving-light-adjustment-mobile.png');
    await adjustPanel.getByTestId('public-flow-adjustment-name-input').fill('내 이사 준비');
    await adjustPanel.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await adjustPanel.getByTestId('public-flow-adjustment-kind-items').click();
    const adjustmentRows = adjustPanel.getByTestId('public-flow-adjustment-item-row');
    await expect(adjustmentRows).toHaveCount(24);
    const excludedRow = adjustmentRows.nth(1);
    const excludedItemId = await excludedRow.getAttribute('data-item-id');
    await excludedRow.getByRole('checkbox').uncheck();
    await adjustPanel.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-save-primary-mobile').click();

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toContainText('내 이사 준비');
    await expect(receipt).toContainText('23');
    await openSavedPublicFlow(page, receipt);
    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(workspace).toContainText('내 이사 준비');
    await expect(workspace.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute(
      'data-effective-row-count',
      '23',
    );
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await captureEvidence(page, '03-moving-post-save-whole-flow-mobile.png');

    const stored = await page.evaluate(() => ({
      saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') ?? 'null'),
      itemStates: JSON.parse(
        window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') ?? '{}',
      ),
    }));
    expect(stored.saved.personalTitle).toBe('내 이사 준비');
    expect(excludedItemId).toBeTruthy();
    expect(stored.itemStates[excludedItemId as string]).toMatchObject({
      personalExcluded: true,
    });
    expect(stored.itemStates[excludedItemId as string].note).toBeUndefined();

    await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
    await captureEvidence(page, '04-moving-returning-workspace-mobile.png');
  });

  test('source-backed adjustment never exposes an active zero-item save action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();

    const adjustPanel = page.getByTestId('public-flow-personal-adjustment');
    await adjustPanel.getByTestId('public-flow-adjustment-kind-items').click();
    const checkboxes = adjustPanel.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBe(24);
    for (let index = 0; index < checkboxCount; index += 1) {
      await checkboxes.nth(index).uncheck();
    }

    const applyButton = adjustPanel.getByTestId('public-flow-adjustment-apply');
    await expect(applyButton).toBeDisabled();
    await expect(adjustPanel.getByTestId('public-flow-adjustment-result-after')).toContainText('0개');
    await adjustPanel.getByTestId('public-flow-adjustment-cancel').click();
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await page.getByTestId('public-flow-personal-adjustment')
      .getByTestId('public-flow-adjustment-kind-items')
      .click();
    await expect(page.getByTestId('public-flow-adjustment-result-after')).toContainText('24개');
    await expect(page.getByTestId('public-flow-adjustment-apply')).toBeEnabled();
  });

  test('public save preview stays compact and opens the saved whole Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByTestId('public-flow-artifact-preview-row')).toHaveCount(10);
    await expect(page.getByTestId('public-flow-artifact-preview')).toBeVisible();
    await expect(page.getByTestId('public-flow-artifact-preview').getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-description')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText(
      '체크리스트 10개로 시작',
    );
    await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
    await captureEvidence(page, '05-vehicle-public-compact-mobile.png');

    const receipt = await savePublicFlow(
      page,
      page.getByTestId('public-flow-save-primary-mobile'),
    );
    await expect(receipt.getByTestId('public-flow-saved-receipt-primary')).toHaveAttribute(
      'href',
      '/my?view=flows&flow=vehicle-inspection-prep',
    );
    await openSavedPublicFlow(page, receipt);

    await expect(page).toHaveURL('/my?view=flows&flow=vehicle-inspection-prep');
    const workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    await expect(
      workspace.getByRole('heading', { level: 2, name: '자동차검사 D-14 준비' }),
    ).toBeVisible();
    await expect(workspace.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute(
      'data-effective-row-count',
      '10',
    );
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await captureEvidence(page, '06-vehicle-post-save-whole-flow-mobile.png');
  });

  test('Calendar excludes undated work while ordinary My Flow hides held records', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
      'data-selected-shape',
      'checklist',
    );
    await page.getByTestId('public-flow-save-primary-mobile').click();

    await page.goto('/flow-maps/middle-school-math-1');
    await page.getByTestId('flow-map-save-all-mobile').click();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await captureEvidence(page, '07-calendar-dated-execution-lens-mobile.png');

    await page.evaluate(() => {
      window.localStorage.setItem(
        'flow:saved:alt-phone-sk7-self-activation',
        JSON.stringify({
          slug: 'alt-phone-sk7-self-activation',
          savedAt: '2030-07-01T00:00:00.000Z',
          selectedArtifactMode: 'checklist',
        }),
      );
    });
    await page.goto('/my?view=flows');
    await expect(page.locator('body')).not.toContainText('알뜰폰 SK7 셀프개통 체크');
    await expect(page.getByTestId('my-flow-review-section')).toHaveCount(0);
    await captureEvidence(page, '09-held-content-hidden-my-flow-mobile.png');
  });

  test('legacy held savedFlow confirmation never offers an action into an empty workspace', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem(
        'flow:saved:alt-phone-sk7-self-activation',
        JSON.stringify({
          slug: 'alt-phone-sk7-self-activation',
          savedAt: '2030-07-01T00:00:00.000Z',
          selectedArtifactMode: 'checklist',
        }),
      );
    });

    await page.goto('/my?savedFlow=alt-phone-sk7-self-activation');
    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave.getByTestId('my-flow-post-save-confirmation')).toHaveText('저장 기록 보관됨');
    await expect(postSave.getByTestId('my-flow-post-save-held-note')).toBeVisible();
    await expect(postSave.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
    await expect(postSave.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
    await captureEvidence(page, '09a-held-post-save-preserved-mobile.png');
  });

  test('wide My Flow names saved Flow navigation as management, not a viewing range', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary').click();
    await page.getByTestId('public-flow-saved-receipt-primary').click();

    await page.goto('/f/vehicle-inspection-prep');
    await page.getByTestId('public-flow-save-primary').click();
    await page.goto('/my?view=flows');

    const library = page.getByTestId('my-flow-library-workspace');
    const flowRail = library.getByTestId('my-flow-library-rail');
    await expect(flowRail).toBeVisible();
    await expect(flowRail).toContainText('라이브러리');
    await expect(flowRail).toContainText('저장한 Flow');
    await expect(flowRail.getByTestId('my-flow-library-row')).toHaveCount(2);
    await expect(flowRail.getByTestId('my-flow-library-rail-filter')).toHaveCount(0);
    await expect(page.getByLabel('저장한 Flow')).toBeHidden();
    await expect(page.locator('body')).not.toContainText('보기 범위');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    await captureEvidence(page, '10-my-flow-saved-flow-selector-wide.png');

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await captureEvidence(page, '11-calendar-wide.png');
  });
});
