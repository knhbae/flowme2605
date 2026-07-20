import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

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

    await expect(page.getByTestId('flow-map-artifact-preview-row')).toHaveCount(5);
    await expect(page.getByTestId('flow-map-hero')).toContainText('저장될 전체 Flow');
    await expect(page.getByTestId('flow-map-hero')).toContainText('할 일 5개');
    await expect(page.getByTestId('flow-map-hero')).toContainText('원문 · 이사 준비 체크리스트');
    await expect(page.locator('body')).not.toContainText('이사일 1개를 넣으면 원문 체크리스트');
    await expect(page.getByTestId('flow-map-execution-outline')).not.toHaveAttribute('open', '');
    await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveAccessibleName('그대로 시작');
    await captureEvidence(page, '01-moving-artifact-first-mobile.png');

    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveAccessibleName('그대로 시작');
    await page.getByTestId('flow-map-adjust-save-mobile').click();
    const adjustPanel = page.getByTestId('flow-map-adjust-panel');
    await expect(adjustPanel).toBeVisible();
    await captureEvidence(page, '02-moving-light-adjustment-mobile.png');
    await adjustPanel.getByTestId('flow-map-custom-title').fill('내 이사 준비');
    await adjustPanel.locator('input[type="checkbox"]').nth(1).uncheck();
    await page.getByTestId('flow-map-save-all-mobile').click();

    await expect(page).toHaveURL('/my?savedMap=moving-d30');
    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave).toContainText('내 이사 준비');
    await expect(postSave.getByTestId('my-flow-post-save-step')).toHaveCount(4);
    await expect(postSave).not.toContainText('입주청소와 대형폐기물 일정 확인');
    await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
    await captureEvidence(page, '03-moving-post-save-whole-flow-mobile.png');

    const snapshot = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:map:saved:moving-d30') ?? 'null'));
    expect(snapshot.personalCopy.excludedStepIdsByFlow['source-backed-moving-d30']).toEqual(['moving-cleaning-waste']);

    await postSave.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
    await captureEvidence(page, '04-moving-returning-workspace-mobile.png');
  });

  test('source-backed adjustment never exposes an active zero-item save action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-adjust-save-mobile').click();

    const checkboxes = page.getByTestId('flow-map-adjust-panel').locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    for (let index = 0; index < checkboxCount; index += 1) {
      await checkboxes.nth(index).uncheck();
    }

    const saveButton = page.getByTestId('flow-map-save-all-mobile');
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toHaveAccessibleName('선택한 0개로 시작');
    await page.getByTestId('flow-map-adjust-save-mobile').click();
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toHaveAccessibleName('그대로 시작');
  });

  test('public save preview stays compact and opens the saved whole Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByTestId('public-flow-artifact-preview-row')).toHaveCount(5);
    await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();
    await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-description')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
    await expect(page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' })).toHaveText('날짜 없이 시작');
    await expect(page.getByTestId('public-flow-reference-details')).not.toHaveAttribute('open', '');
    await captureEvidence(page, '05-vehicle-public-compact-mobile.png');

    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
    const savedLink = page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' });
    await expect(savedLink).toHaveAttribute('href', '/my?savedFlow=vehicle-inspection-prep');
    await savedLink.click();

    await expect(page).toHaveURL('/my?savedFlow=vehicle-inspection-prep');
    await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('자동차검사 D-14 준비');
    await expect(page.getByTestId('my-flow-post-save-step')).toHaveCount(10);
    await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
    await captureEvidence(page, '06-vehicle-post-save-whole-flow-mobile.png');
  });

  test('Calendar keeps undated work in a collapsed tray and ordinary My Flow hides held records', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();

    await page.goto('/flow-maps/middle-school-math-1');
    await page.getByTestId('flow-map-save-all-mobile').click();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toContainText('날짜 정하기');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-panel')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await captureEvidence(page, '07-calendar-undated-tray-collapsed-mobile.png');

    await page.getByTestId('my-flow-calendar-unscheduled-toggle').click();
    await expect(page.getByTestId('my-flow-calendar-unscheduled-panel')).toBeVisible();
    await captureEvidence(page, '08-calendar-undated-tray-expanded-mobile.png');

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
    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
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
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-save-all').click();
    await page.getByTestId('my-flow-post-save-view-flow').click();

    await page.goto('/f/vehicle-inspection-prep');
    await page.getByTestId('public-flow-save-actions').getByRole('button', { name: '날짜 없이 시작' }).click();
    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();

    const flowRail = page.getByTestId('my-flow-list');
    await expect(flowRail).toBeVisible();
    await expect(flowRail).toContainText('Flow 목록');
    await expect(flowRail.locator('button')).toHaveCount(3);
    await expect(flowRail.getByTestId('my-flow-filter-all')).toHaveAttribute('aria-pressed', 'true');
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
