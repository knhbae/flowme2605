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
    const movingCapability = page.getByTestId('public-flow-capability-result');
    const publicFormats = movingCapability.locator('[data-public-format-tab="true"]');
    await expect(publicFormats).toHaveCount(3);
    await expect(page.getByTestId('public-flow-hero')).toContainText('이사 D-30 준비');
    await expect(movingCapability).toHaveAttribute('data-capability-selected-destination', 'memo');
    await movingCapability.locator(
      '[data-public-format-tab="true"][data-capability-destination="calendar"]',
    ).click();
    await expect(movingCapability.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
      'data-capability-destination',
      'calendar',
    );
    await expect(page.locator('body')).not.toContainText('이사일 1개를 넣으면 원문 체크리스트');
    await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveAccessibleName(
      '이사일 설정 후 저장',
    );
    await captureEvidence(page, '01-moving-artifact-first-mobile.png');

    await page.getByTestId('public-flow-calendar-set-anchor').click();
    const adjustPanel = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustPanel).toBeVisible();
    await adjustPanel.getByTestId('public-flow-adjustment-anchor-input').fill('2030-08-15');
    await adjustPanel.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
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
    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('23');
    await openSavedPublicFlow(page, saveBanner);
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(workspace).toContainText('내 이사 준비');
    const approvedPlan = workspace.getByTestId('approved-my-plan-workspace');
    await expect(approvedPlan.getByTestId('my-plan-date-grouped-todos')).toHaveAttribute(
      'data-todo-row-count',
      '23',
    );
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await captureEvidence(page, '03-moving-post-save-whole-flow-mobile.png');

    const stored = await page.evaluate((copyKey) => ({
      saved: JSON.parse(window.localStorage.getItem(`flow:saved:${copyKey}`) ?? 'null'),
      itemStates: JSON.parse(
        window.localStorage.getItem(`flow_builder_mvp_item_state_${copyKey}`) ?? '{}',
      ),
      legacySourceRecord: window.localStorage.getItem('flow:saved:moving-d30-basic'),
    }), personalCopyKey);
    expect(stored.saved.personalTitle).toBe('내 이사 준비');
    expect(excludedItemId).toBeTruthy();
    expect(stored.itemStates[excludedItemId as string]).toMatchObject({
      personalExcluded: true,
    });
    expect(stored.itemStates[excludedItemId as string].note).toBeUndefined();
    expect(stored.legacySourceRecord).toBeNull();

    await expect(approvedPlan).toBeVisible();
    await captureEvidence(page, '04-moving-returning-workspace-mobile.png');
  });

  test('source-backed adjustment never exposes an active zero-item save action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();

    const adjustPanel = page.getByTestId('public-flow-personal-adjustment');
    await adjustPanel.getByTestId('public-flow-adjustment-kind-items').click();
    const checkboxes = adjustPanel.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBe(24);
    for (let index = 0; index < checkboxCount; index += 1) {
      await checkboxes.nth(index).uncheck();
    }

    await expect(adjustPanel.getByTestId('public-flow-adjustment-result-after')).toContainText('0개');
    const applyButton = adjustPanel.getByTestId('public-flow-adjustment-apply');
    await expect(applyButton).toBeEnabled();
    await adjustPanel.getByTestId('public-flow-adjustment-kind-name').click();
    await applyButton.click();
    await expect(adjustPanel).toHaveAttribute('data-editor-status', 'dirty-invalid');
    await expect(adjustPanel).toHaveAttribute('data-adjustment-kind', 'items');
    await expect(adjustPanel.getByTestId('public-flow-personal-adjustment-error-summary')).toBeVisible();
    await expect(checkboxes.first()).toBeFocused();
    await adjustPanel.getByTestId('public-flow-adjustment-cancel').click();
    await adjustPanel.getByTestId('public-flow-personal-adjustment-discard-changes').click();
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

    const vehicleCapability = page.getByTestId('public-flow-capability-result');
    await expect(vehicleCapability).toBeVisible();
    await expect(vehicleCapability.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    )).toHaveAttribute('data-capability-output-count', '10');
    await expect(vehicleCapability.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-description')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText(
      '내 계획으로 저장',
    );
    await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
    await captureEvidence(page, '05-vehicle-public-compact-mobile.png');

    const saveBanner = await savePublicFlow(
      page,
      page.getByTestId('public-flow-save-primary-mobile'),
    );
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('10');
    await openSavedPublicFlow(page, saveBanner);
    const workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    const approvedPlan = workspace.getByTestId('approved-my-plan-workspace');
    await expect(approvedPlan).toBeVisible();
    await expect(approvedPlan.getByTestId('my-plan-date-grouped-todos')).toHaveAttribute(
      'data-todo-row-count',
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
    const capability = page.getByTestId('public-flow-capability-result');
    await expect(capability).toHaveAttribute('data-capability-selected-destination', 'memo');
    await expect(capability.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
      'data-capability-output-count',
      '10',
    );
    await page.getByTestId('public-flow-save-primary-mobile').click();

    await page.goto('/flow-maps/middle-school-math-1');
    await page.getByTestId('flow-map-save-all-mobile').click();
    await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1&sort=next$/u);

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
    await savePublicFlow(page, page.getByTestId('public-flow-save-primary'));

    await page.goto('/f/vehicle-inspection-prep');
    await savePublicFlow(page, page.getByTestId('public-flow-save-primary'));
    await page.goto('/my?view=flows');

    const library = page.getByTestId('my-flow-library-workspace');
    const flowRail = library.getByTestId('my-flow-library-rail');
    await expect(flowRail).toBeVisible();
    await expect(flowRail).toContainText('저장한 계획');
    await expect(flowRail.getByTestId('my-flow-library-row')).toHaveCount(2);
    await expect(flowRail.getByTestId('my-flow-library-rail-filter')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: '저장한 계획' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('보기 범위');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    await captureEvidence(page, '10-my-flow-saved-flow-selector-wide.png');

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await captureEvidence(page, '11-calendar-wide.png');
  });
});
