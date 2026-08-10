import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

const MAP_ID = 'middle-school-math-1';
const FLOW_SLUG = 'source-backed-middle-school-math-1';
const MAP_URL = `/flow-maps/${MAP_ID}`;
const MAP_STORAGE_KEYS = [
  `flow:saved:${FLOW_SLUG}`,
  `flow_builder_mvp_item_state_${FLOW_SLUG}`,
  'flow:canonical:origin:v1',
  'flow:meta:last-visit',
  `flow:map:saved:${MAP_ID}`,
  `flow:map:persistence:${MAP_ID}`,
] as const;

async function captureEvidence(page: Page, filename: string) {
  const evidenceDir = process.env.FLOWME_P35_P0_02_EVIDENCE_DIR;
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidenceDir, filename) });
}

async function getItemIds(locator: Locator, attribute = 'data-flow-item-id'): Promise<string[]> {
  return locator.evaluateAll((elements, attributeName) => elements.map((element) => {
    const value = element.getAttribute(attributeName);
    if (!value) throw new Error(`missing ${attributeName}`);
    return value;
  }), attribute);
}

function adjustmentTrigger(page: Page, mobile: boolean) {
  return page.getByTestId(mobile ? 'flow-map-adjust-save-mobile' : 'flow-map-adjust-save');
}

function saveTrigger(page: Page, mobile: boolean) {
  return page.getByTestId(mobile ? 'flow-map-save-all-mobile' : 'flow-map-save-all');
}

async function openEditor(page: Page, mobile: boolean) {
  await adjustmentTrigger(page, mobile).click();
  const editor = page.getByTestId('flow-map-adjust-panel');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic');
  return editor;
}

async function applySevenItemSnapshot(page: Page, mobile: boolean) {
  const editor = await openEditor(page, mobile);
  const checkboxes = editor.locator('input[type="checkbox"]');
  await expect(checkboxes).toHaveCount(8);
  const canonicalIds = await getItemIds(checkboxes, 'data-map-item-id');
  await editor.getByTestId('flow-map-custom-title').fill('시험 전 핵심 단원');
  await checkboxes.last().uncheck();
  await editor.getByTestId('flow-map-adjust-apply').click();
  await expect(editor).toHaveCount(0);
  return canonicalIds.slice(0, 7);
}

async function assertAppliedParity(
  page: Page,
  expectedIds: string[],
  mobile: boolean,
  expectedSaveLabel = '내 계획에 저장',
) {
  const map = page.getByTestId('flow-map-public');
  const effective = map.getByTestId('flow-map-effective-snapshot');
  await expect(effective).toHaveAttribute('data-flow-map-title', '시험 전 핵심 단원');
  await expect(effective).toHaveAttribute('data-flow-map-item-count', String(expectedIds.length));
  expect(JSON.parse(await effective.getAttribute('data-flow-map-item-ids') || '[]')).toEqual(expectedIds);
  await expect(map.getByTestId('flow-map-hero').getByRole('heading', { level: 1 })).toHaveText('시험 전 핵심 단원');
  await expect(map.getByTestId('flow-map-applied-adjustment-summary')).toContainText('저장 제목 · 시험 전 핵심 단원');
  await expect(map.locator('[data-testid="flow-map-selection-summary"]:visible')).toHaveText('선택 7 / 전체 8');
  await expect(saveTrigger(page, mobile)).toHaveText(expectedSaveLabel);

  const previewRows = map.getByTestId('flow-map-hero').locator('[data-flow-outline-row="true"]');
  const outlineRows = map.getByTestId('flow-map-execution-outline').getByTestId('flow-map-execution-step-row');
  await expect(previewRows).toHaveCount(7);
  await expect(outlineRows).toHaveCount(7);
  expect(await getItemIds(previewRows)).toEqual(expectedIds);
  expect(await getItemIds(outlineRows)).toEqual(expectedIds);
}

async function readRelevantRawStorage(page: Page) {
  return page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)])), [...MAP_STORAGE_KEYS]);
}

async function assertStoredParity(page: Page, expectedIds: string[]) {
  const saved = await page.evaluate(({ mapId, flowSlug }) => ({
    snapshot: JSON.parse(window.localStorage.getItem(`flow:map:saved:${mapId}`) || 'null'),
    persistence: JSON.parse(window.localStorage.getItem(`flow:map:persistence:${mapId}`) || 'null'),
    record: JSON.parse(window.localStorage.getItem(`flow:saved:${flowSlug}`) || 'null'),
  }), { mapId: MAP_ID, flowSlug: FLOW_SLUG });
  const snapshotIds = saved.snapshot.personalCopy.includedStepIdsByFlow[FLOW_SLUG]
    .map((stepId: string) => `${FLOW_SLUG}::${stepId}`);
  const persistenceIds = saved.persistence.childFlows.flatMap((flow: { slug: string; steps: { stepId: string }[] }) => (
    flow.steps.map((step) => `${flow.slug}::${step.stepId}`)
  ));
  expect(saved.snapshot.title).toBe('시험 전 핵심 단원');
  expect(saved.snapshot.stepCountsByFlow[FLOW_SLUG]).toBe(7);
  expect(saved.persistence.map.title).toBe('시험 전 핵심 단원');
  expect(snapshotIds).toEqual(expectedIds);
  expect(persistenceIds).toEqual(expectedIds);
  expect(saved.record.selectedArtifactMode).toBe('sheet');
}

test.describe('P35 P0 Flow Map action contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => window.localStorage.clear());
  });

  test('mobile save-all keeps one 7-item snapshot through edit, Back, partial-write rollback, retry, and reload', async ({ page }) => {
    await page.goto(MAP_URL);
    const map = page.getByTestId('flow-map-public');
    await expect(map).toHaveAttribute('data-map-save-mode', 'save_all');
    await expect(map).toHaveAttribute('data-map-execution-state', 'executable');
    await expect(map.getByTestId('flow-map-risk-caution')).toHaveCount(0);

    const cancelledEditor = await openEditor(page, true);
    await cancelledEditor.getByTestId('flow-map-custom-title').fill('버릴 제목');
    await cancelledEditor.locator('input[type="checkbox"]').last().uncheck();
    await cancelledEditor.getByTestId('flow-map-adjust-cancel').click();
    await expect(page.getByTestId('flow-map-adjust-panel')).toHaveCount(0);
    await expect(map.getByTestId('flow-map-applied-adjustment-summary')).toHaveCount(0);

    const expectedIds = await applySevenItemSnapshot(page, true);
    await assertAppliedParity(page, expectedIds, true);

    for (const closeMode of ['cancel', 'escape', 'back'] as const) {
      const editor = await openEditor(page, true);
      await expect(editor.getByTestId('flow-map-custom-title')).toHaveValue('시험 전 핵심 단원');
      await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(7);
      await editor.getByTestId('flow-map-custom-title').fill(`버릴 ${closeMode} 제목`);
      await editor.locator('input[type="checkbox"]:checked').last().uncheck();
      if (closeMode === 'cancel') await editor.getByTestId('flow-map-adjust-cancel').click();
      if (closeMode === 'escape') await page.keyboard.press('Escape');
      if (closeMode === 'back') await page.goBack();
      await expect(page).toHaveURL(MAP_URL);
      await expect(page.getByTestId('flow-map-adjust-panel')).toHaveCount(0);
      await expect(adjustmentTrigger(page, true)).toBeFocused();
      await assertAppliedParity(page, expectedIds, true);
    }
    expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('flow:map:')))).toEqual([]);

    await captureEvidence(page, 'p0-02-map-after-390x844.png');
    const beforeFailure = await readRelevantRawStorage(page);
    await page.evaluate((failureKey) => {
      const original = Storage.prototype.setItem;
      let failed = false;
      Storage.prototype.setItem = function setItemWithOneFailure(key: string, value: string) {
        if (!failed && key === failureKey) {
          failed = true;
          throw new DOMException('simulated quota failure', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
      (window as unknown as { restoreFlowMapSetItem: () => void }).restoreFlowMapSetItem = () => {
        Storage.prototype.setItem = original;
      };
    }, `flow:map:persistence:${MAP_ID}`);
    await saveTrigger(page, true).click();
    await expect(page).toHaveURL(MAP_URL);
    await expect(map.getByTestId('flow-map-save-error')).toContainText('선택은 그대로 유지됐어요');
    await expect(saveTrigger(page, true)).toHaveText('다시 저장');
    expect(await readRelevantRawStorage(page)).toEqual(beforeFailure);
    await assertAppliedParity(page, expectedIds, true, '다시 저장');

    await page.evaluate(() => (window as unknown as { restoreFlowMapSetItem: () => void }).restoreFlowMapSetItem());
    await saveTrigger(page, true).click();
    await expect(page).toHaveURL(`/my?savedMap=${MAP_ID}&sort=next`);
    await assertStoredParity(page, expectedIds);
    const rawBeforeReload = await readRelevantRawStorage(page);
    await page.reload();
    expect(await readRelevantRawStorage(page)).toEqual(rawBeforeReload);
    await assertStoredParity(page, expectedIds);
  });

  test('desktop save-all keeps title, IDs, count, storage, and reload parity at 1440x1000', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(MAP_URL);
    const expectedIds = await applySevenItemSnapshot(page, false);
    await assertAppliedParity(page, expectedIds, false);
    await captureEvidence(page, 'p0-02-map-after-1440x1000.png');
    await saveTrigger(page, false).click();
    await expect(page).toHaveURL(`/my?savedMap=${MAP_ID}&sort=next`);
    await assertStoredParity(page, expectedIds);
    const rawBeforeReload = await readRelevantRawStorage(page);
    await page.reload();
    expect(await readRelevantRawStorage(page)).toEqual(rawBeforeReload);
    await assertStoredParity(page, expectedIds);
  });

  test('a stale tab cannot overwrite a newer Flow Map save and keeps its applied selection recoverable', async ({ context, page }) => {
    test.setTimeout(60_000);

    await page.goto(MAP_URL);
    await expect(saveTrigger(page, true)).toBeEnabled();

    const stalePage = await context.newPage();
    await stalePage.setViewportSize({ width: 390, height: 844 });
    await stalePage.goto(MAP_URL);
    await expect(saveTrigger(stalePage, true)).toBeEnabled();

    const staleEditor = await openEditor(stalePage, true);
    await staleEditor.getByTestId('flow-map-custom-title').fill('이 탭에서 고친 계획');
    await staleEditor.locator('input[type="checkbox"]').last().uncheck();
    await staleEditor.getByTestId('flow-map-adjust-apply').click();
    await expect(stalePage.getByTestId('flow-map-effective-snapshot')).toHaveAttribute(
      'data-flow-map-title',
      '이 탭에서 고친 계획',
    );
    await expect(stalePage.getByTestId('flow-map-effective-snapshot')).toHaveAttribute(
      'data-flow-map-item-count',
      '7',
    );

    await saveTrigger(page, true).click();
    await expect(page).toHaveURL(`/my?savedMap=${MAP_ID}&sort=next`);
    const newerRaw = await readRelevantRawStorage(page);

    await saveTrigger(stalePage, true).click();
    await expect(stalePage).toHaveURL(MAP_URL);
    const conflict = stalePage.getByTestId('flow-map-save-conflict');
    await expect(conflict).toContainText(
      '다른 탭에서 이 계획을 먼저 저장했어요',
      { timeout: 15_000 },
    );
    await expect(conflict).toContainText('이 화면의 제목과 선택은 그대로 남겨뒀습니다');
    const latestLink = conflict.getByRole('link', { name: '새 탭에서 최신 저장본 보기' });
    await expect(latestLink).toHaveAttribute('href', `/my?savedMap=${MAP_ID}`);
    await expect(latestLink).toHaveAttribute('target', '_blank');
    await expect(latestLink).toBeFocused();
    await expect(latestLink).toBeInViewport();
    await expect(saveTrigger(stalePage, true)).toBeDisabled();
    await expect(stalePage.getByTestId('flow-map-effective-snapshot')).toHaveAttribute(
      'data-flow-map-title',
      '이 탭에서 고친 계획',
    );
    await expect(stalePage.getByTestId('flow-map-effective-snapshot')).toHaveAttribute(
      'data-flow-map-item-count',
      '7',
    );
    expect(await readRelevantRawStorage(stalePage)).toEqual(newerRaw);

    const reopenedEditor = await openEditor(stalePage, true);
    await reopenedEditor.getByTestId('flow-map-custom-title').fill('충돌 뒤에도 남는 내 초안');
    await reopenedEditor.getByTestId('flow-map-adjust-apply').click();
    await expect(conflict).toBeVisible();
    await expect(saveTrigger(stalePage, true)).toBeDisabled();
    await expect(stalePage.getByTestId('flow-map-effective-snapshot')).toHaveAttribute(
      'data-flow-map-title',
      '충돌 뒤에도 남는 내 초안',
    );
    expect(await readRelevantRawStorage(stalePage)).toEqual(newerRaw);
  });

  test('changing an anchor keeps stale-save recovery visible until the map is refreshed', async ({ context, page }) => {
    test.setTimeout(60_000);
    const datedMapId = 'curated-opic-mock-course';
    const datedFlowSlugs = ['curated-opic-single-mock-review', 'curated-opic-course-row-import'];
    const datedMapUrl = `/flow-maps/${datedMapId}`;
    const datedStorageKeys = [
      ...datedFlowSlugs.flatMap((slug) => [
        `flow:saved:${slug}`,
        `flow_builder_mvp_item_state_${slug}`,
      ]),
      'flow:canonical:origin:v1',
      'flow:meta:last-visit',
      `flow:map:saved:${datedMapId}`,
      `flow:map:persistence:${datedMapId}`,
    ];
    const readDatedRawStorage = (targetPage: Page) => targetPage.evaluate(
      (keys) => Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)])),
      datedStorageKeys,
    );

    await page.goto(datedMapUrl);
    await expect(page.getByTestId('flow-map-anchor-input')).toBeVisible();

    const stalePage = await context.newPage();
    await stalePage.setViewportSize({ width: 390, height: 844 });
    await stalePage.goto(datedMapUrl);
    await expect(stalePage.getByTestId('flow-map-anchor-input')).toBeVisible();

    await saveTrigger(page, true).click();
    await expect(page).toHaveURL(`/my?savedMap=${datedMapId}`);
    const newerRaw = await readDatedRawStorage(page);

    await saveTrigger(stalePage, true).click();
    const conflict = stalePage.getByTestId('flow-map-save-conflict');
    await expect(conflict).toBeVisible();
    await expect(conflict.getByRole('link', { name: '새 탭에서 최신 저장본 보기' })).toBeFocused();
    await expect(saveTrigger(stalePage, true)).toBeDisabled();
    expect(await readDatedRawStorage(stalePage)).toEqual(newerRaw);

    await stalePage.getByTestId('flow-map-anchor-input').fill('2026-08-21');
    await expect(conflict).toBeVisible();
    await expect(saveTrigger(stalePage, true)).toBeDisabled();
    expect(await readDatedRawStorage(stalePage)).toEqual(newerRaw);
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

  test('legacy Map bytes remain untouched when My Flow reads an unsupported saved record', async ({ page }) => {
    const legacyKey = 'flow:map:saved:legacy-p0-02';
    const legacyRaw = '{"mapId":"missing-map","title":"Legacy","flowSlugs":["missing-flow"],"stepCountsByFlow":{"missing-flow":1}}';
    await page.evaluate(({ key, raw }) => window.localStorage.setItem(key, raw), { key: legacyKey, raw: legacyRaw });
    await page.goto('/my');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), legacyKey)).toBe(legacyRaw);
    await page.reload();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), legacyKey)).toBe(legacyRaw);
  });
});
