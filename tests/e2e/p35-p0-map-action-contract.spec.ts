import { expect, test } from '@playwright/test';

test.describe('P35 P0 Flow Map action contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => window.localStorage.clear());
  });

  test('save-all editing is full-height and atomic while persistence stays map-compatible', async ({ page }) => {
    await page.goto('/flow-maps/middle-school-math-1');

    const map = page.getByTestId('flow-map-public');
    await expect(map).toHaveAttribute('data-map-save-mode', 'save_all');
    await expect(map).toHaveAttribute('data-map-execution-state', 'executable');
    await expect(map.getByTestId('flow-map-risk-caution')).toHaveCount(0);

    await map.getByTestId('flow-map-adjust-save-mobile').click();
    const editor = page.getByTestId('flow-map-adjust-panel');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic');
    await expect(editor.locator('input[type="checkbox"]')).toHaveCount(8);
    await editor.getByTestId('flow-map-custom-title').fill('시험 전 핵심 단원');
    await editor.locator('input[type="checkbox"]').last().uncheck();
    await editor.getByTestId('flow-map-adjust-cancel').click();
    await expect(editor).toHaveCount(0);
    await expect(map.getByTestId('flow-map-applied-adjustment-summary')).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('flow:map:')))).toEqual([]);

    await map.getByTestId('flow-map-adjust-save-mobile').click();
    await expect(page.getByTestId('flow-map-custom-title')).toHaveValue('중1 수학 목차 진도표');
    await expect(page.getByTestId('flow-map-adjust-panel').locator('input[type="checkbox"]:checked')).toHaveCount(8);
    await page.getByTestId('flow-map-custom-title').fill('버릴 임시 제목');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('flow-map-adjust-panel')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-adjust-save-mobile')).toBeFocused();
    await expect(map.getByTestId('flow-map-applied-adjustment-summary')).toHaveCount(0);

    await map.getByTestId('flow-map-adjust-save-mobile').click();
    await page.getByTestId('flow-map-custom-title').fill('시험 전 핵심 단원');
    await page.getByTestId('flow-map-adjust-panel').locator('input[type="checkbox"]').last().uncheck();
    await page.getByTestId('flow-map-adjust-apply').click();
    await expect(page.getByTestId('flow-map-adjust-panel')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-applied-adjustment-summary')).toContainText('시험 전 핵심 단원 · 할 일 7개');
    await expect(map.getByTestId('flow-map-save-all-mobile')).toHaveText('선택한 7개로 시작');
    expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('flow:map:')))).toEqual([]);

    await map.getByTestId('flow-map-save-all-mobile').click();
    await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
    const saved = await page.evaluate(() => ({
      snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
      persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
      record: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-middle-school-math-1') || 'null'),
    }));
    expect(saved.snapshot.title).toBe('시험 전 핵심 단원');
    expect(saved.snapshot.stepCountsByFlow['source-backed-middle-school-math-1']).toBe(7);
    expect(saved.persistence.map.title).toBe('시험 전 핵심 단원');
    expect(saved.persistence.childFlows[0].steps).toHaveLength(7);
    expect(saved.record.selectedArtifactMode).toBe('sheet');
  });

  test('choose-child keeps child routing and never exposes a map editor or save-all controller', async ({ page }) => {
    await page.goto('/flow-maps/curated-allblanc-workout-park');

    const map = page.getByTestId('flow-map-public');
    await expect(map).toHaveAttribute('data-map-save-mode', 'choose_child');
    await expect(map.getByTestId('flow-map-choose-child')).toHaveAttribute('data-map-action-intent', 'choose_child');
    await expect(map.getByTestId('flow-map-adjust-save-mobile')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-adjust-save')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-save-all')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-choose-child').getByRole('link')).toHaveCount(2);
  });

  test('review hold keeps direct sources and action-adjacent sensitive caution without execution actions', async ({ page }) => {
    await page.goto('/flow-maps/baby-food-map');

    const hold = page.getByTestId('flow-map-review-hold');
    await expect(hold).toHaveAttribute('data-map-execution-state', 'review_hold');
    await expect(hold).toHaveAttribute('data-map-edit-capability', 'hidden');
    await expect(hold).toHaveAttribute('data-map-save-capability', 'hidden');
    await expect(hold.getByTestId('flow-map-risk-caution')).toHaveAttribute('data-adjacent-to-action', 'open-source');
    await expect(hold.getByRole('link', { name: '공식 이유식 안내 보기' })).toBeVisible();
    const directSource = hold.getByRole('link', { name: '참고 식단표 원문' });
    await expect(directSource).toHaveAttribute('data-flow-identity-slot', 'source');
    await expect(directSource).toHaveAttribute('data-map-action-intent', 'open_source');
    await expect(page.getByTestId('flow-map-adjust-save-mobile')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);

    await page.goto('/flow-maps/curated-funmom-learning-park');
    await expect(page.getByTestId('flow-map-review-hold').getByTestId('flow-map-risk-caution')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '원문 자료 둘러보기' })).toHaveAttribute('data-flow-identity-slot', 'source');
  });
});
