import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const EVIDENCE_DIR = process.env.FLOWME_P0_06_EVIDENCE_DIR?.trim();

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

async function captureEvidence(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) return;
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, `${name}.png`),
    animations: 'disabled',
  });
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${request.url()} (${failure})`);
  });
  return errors;
}

async function resetAndOpenSource(
  page: Page,
  viewport: Readonly<{ width: number; height: number }> = MOBILE_VIEWPORT,
): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(SOURCE_ROUTE);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId('public-flow-anchor-input')).toBeVisible();
}

async function expectEditorGeometry(
  page: Page,
  editor: Locator,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<void> {
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  if (viewport.width < 640) {
    expect(box!.x).toBeLessThanOrEqual(1);
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  } else {
    expect(box!.x + box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box!.width).toBeLessThanOrEqual(673);
  }
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);

  const viewportControls = [
    editor.getByRole('button', { name: '닫기', exact: true }),
    editor.locator('[data-editor-action-role="cancel"]'),
    editor.locator('[data-editor-action-role="commit"]'),
  ];
  for (const control of viewportControls) {
    await expect(control).toBeVisible();
    const controlBox = await control.boundingBox();
    expect(controlBox).not.toBeNull();
    expect(controlBox!.y).toBeGreaterThanOrEqual(0);
    expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(viewport.height);
  }
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage) => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort();
      return Object.fromEntries(keys.map((key) => [key, storage.getItem(key) ?? '']));
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

function changedRawKeys(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): string[] {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => before[key] !== after[key])
    .sort();
}

async function expectSharedEditor(
  page: Page,
  editor: Locator,
  expected: Readonly<{
    context: 'public-draft' | 'saved-overlay';
    level: 'plan' | 'item';
    commitRole:
      | 'apply-public-draft'
      | 'apply-item-to-parent-public-draft'
      | 'save-personal-overlay'
      | 'apply-item-to-parent-personal-draft';
  }>,
): Promise<void> {
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-flow-editor-surface', 'true');
  await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
  await expect(editor).toHaveAttribute('data-editor-context', expected.context);
  await expect(editor).toHaveAttribute('data-editor-level', expected.level);
  await expect(editor).toHaveAttribute('data-editor-commit-role', expected.commitRole);
  await expect(editor).toHaveAttribute(
    'data-editor-transaction',
    expected.level === 'plan' ? 'atomic' : 'atomic-child',
  );
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(1);
  const primaryCommit = editor.locator('[data-editor-action-role="commit"]');
  await expect(primaryCommit).toHaveCount(1);
  await expect(primaryCommit).not.toContainText('완료');
  await expect(editor.locator('[data-editor-actions-sticky="true"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
}

async function createCanonicalPersonalCopy(page: Page): Promise<string> {
  await resetAndOpenSource(page);
  await page.getByTestId('public-flow-anchor-input').fill('2031-08-15');
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
      hasReceipt: url.searchParams.has('saveReceipt'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasReceipt: false,
  });
  return new URL(page.url()).searchParams.get('flow') ?? '';
}

test.describe('P35 P0-06 shared editor surface', () => {
  test('public Plan and Item keep storage byte-identical and dirty Back rearms before discard', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await resetAndOpenSource(page);
    const originUrl = new URL(page.url());
    const originRelativeUrl = `${originUrl.pathname}${originUrl.search}${originUrl.hash}`;
    const storageBefore = await rawStorageSnapshot(page);

    const planOpener = page.getByTestId('public-flow-adjust-entry-mobile');
    await planOpener.focus();
    await planOpener.click();
    const planEditor = page.getByTestId('public-flow-personal-adjustment');
    await expectSharedEditor(page, planEditor, {
      context: 'public-draft',
      level: 'plan',
      commitRole: 'apply-public-draft',
    });
    await expectEditorGeometry(page, planEditor, MOBILE_VIEWPORT);
    await captureEvidence(page, 'public-plan-390');

    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const itemRows = planEditor.getByTestId('public-flow-adjustment-item-row');
    await expect(itemRows).toHaveCount(24);
    const itemOpener = itemRows.nth(5).getByTestId('public-flow-adjustment-item-edit');
    const itemId = await itemOpener.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await itemOpener.focus();
    await itemOpener.click();

    let itemEditor = page.getByTestId('public-flow-item-editor');
    await expectSharedEditor(page, itemEditor, {
      context: 'public-draft',
      level: 'item',
      commitRole: 'apply-item-to-parent-public-draft',
    });
    await expectEditorGeometry(page, itemEditor, MOBILE_VIEWPORT);
    await captureEvidence(page, 'public-item-390');
    const itemTitleInput = itemEditor.getByTestId('public-flow-item-editor-title-input');
    await expect(itemEditor.getByRole('link', { name: '원문 보기' })).toBeVisible();
    await itemTitleInput.fill('버릴 변경 - 뒤로가기 보호 확인');
    await expect(itemEditor).toHaveAttribute('data-editor-status', 'dirty-valid');

    await page.goBack();
    const discardPrompt = itemEditor.getByTestId('flow-editor-discard-prompt');
    await expect(discardPrompt).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      window.history.state?.flowPublicBranch?.branch ?? null
    ))).toBe('item');
    await discardPrompt.locator('[data-editor-discard-action="continue-editing"]').click();
    await expect(discardPrompt).toHaveCount(0);
    await expect(itemTitleInput).toBeFocused();

    await page.goBack();
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.locator('[data-editor-discard-action="discard-changes"]').click();
    await expect(itemEditor).toHaveCount(0);
    await expect(planEditor).toBeVisible();
    await expect(itemOpener).toBeFocused();
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);

    await itemOpener.click();
    itemEditor = page.getByTestId('public-flow-item-editor');
    await expectSharedEditor(page, itemEditor, {
      context: 'public-draft',
      level: 'item',
      commitRole: 'apply-item-to-parent-public-draft',
    });
    const savedItemTitle = '계약 전 하자 사진을 길게 확인하고 가족에게 공유하기';
    const savedItemTitleInput = itemEditor.getByTestId('public-flow-item-editor-title-input');
    await savedItemTitleInput.fill('');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await expect(itemEditor).toHaveAttribute('data-editor-status', 'dirty-invalid');
    await expect(itemEditor.getByTestId('public-flow-item-editor-error-summary')).toBeVisible();
    await expect(savedItemTitleInput).toBeFocused();
    await savedItemTitleInput.fill(savedItemTitle);
    await itemEditor.getByTestId('public-flow-item-editor-detail-input').fill(
      '사진 번호와 확인한 위치를 메모하고, 필요한 수리 요청을 계약 전에 정리합니다.',
    );
    await itemEditor.getByTestId('public-flow-item-editor-date-input').fill('2031-08-01');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();

    await expect(itemEditor).toHaveCount(0);
    await expect(planEditor).toBeVisible();
    const updatedParentItem = planEditor.locator(
      `[data-testid="public-flow-adjustment-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(updatedParentItem).toContainText(savedItemTitle);
    await expect(updatedParentItem.getByTestId('public-flow-adjustment-item-edit')).toBeFocused();
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);

    const savedPlanTitle = '우리 가족 이사 준비 - 최종 확인본';
    await planEditor.getByTestId('public-flow-adjustment-kind-name').click();
    await planEditor.getByTestId('public-flow-adjustment-name-input').fill(savedPlanTitle);
    await planEditor.getByTestId('public-flow-adjustment-apply').click();

    await expect(planEditor).toHaveCount(0);
    await expect(page.locator('[data-flow-identity-slot="title"]').first()).toHaveText(savedPlanTitle);
    await expect(
      page
        .getByTestId('public-flow-capability-result')
        .getByTestId('flow-capability-selected-preview'),
    ).toContainText(savedItemTitle);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    const finalUrl = new URL(page.url());
    expect(`${finalUrl.pathname}${finalUrl.search}${finalUrl.hash}`).toBe(originRelativeUrl);
    await expect(planOpener).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('saved canonical personal-copy applies Item only to parent then persists on final Plan save and reload', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectBrowserErrors(page);
    const personalCopyKey = await createCanonicalPersonalCopy(page);
    expect(personalCopyKey).toMatch(/^personal-copy:/u);

    const flow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    const planOpener = flow.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first();
    await expect(planOpener).toBeVisible();
    await planOpener.focus();
    await planOpener.click();

    let planEditor = page.getByTestId('saved-flow-editor-plan');
    await expectSharedEditor(page, planEditor, {
      context: 'saved-overlay',
      level: 'plan',
      commitRole: 'save-personal-overlay',
    });
    await expectEditorGeometry(page, planEditor, MOBILE_VIEWPORT);
    await captureEvidence(page, 'saved-plan-390');
    const planItemList = planEditor.getByTestId('saved-flow-editor-item-list');
    await planItemList.evaluate((element) => { element.scrollTop = 420; });
    const itemOpener = planEditor.getByTestId('saved-flow-editor-item-open').nth(12);
    const itemId = await itemOpener.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();

    const itemStateStorageKey = `flow_builder_mvp_item_state_${personalCopyKey}`;
    await page.evaluate(({ storageKey, stableItemId }) => {
      const current = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as Record<
        string,
        Record<string, unknown>
      >;
      current[stableItemId] = {
        ...(current[stableItemId] ?? {}),
        skipped: true,
        note: 'P0-06 실행 기록 보존 sentinel',
      };
      window.localStorage.setItem(storageKey, JSON.stringify(current));
    }, { storageKey: itemStateStorageKey, stableItemId: itemId ?? '' });
    const storageBeforeItemApply = await rawStorageSnapshot(page);

    await itemOpener.focus();
    const planItemScrollTop = await planItemList.evaluate((element) => element.scrollTop);
    expect(planItemScrollTop).toBeGreaterThan(0);
    await itemOpener.click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    await expectSharedEditor(page, itemEditor, {
      context: 'saved-overlay',
      level: 'item',
      commitRole: 'apply-item-to-parent-personal-draft',
    });
    await expectEditorGeometry(page, itemEditor, MOBILE_VIEWPORT);
    await captureEvidence(page, 'saved-item-390');
    await expect(itemEditor.getByRole('link', { name: '원문 보기' })).toBeVisible();
    const savedItemTitle = '저장한 계획에서 계약 서류와 사진을 최종 대조하기';
    const savedItemDetail = '원본 내용은 유지하고, 내가 확인한 서류 번호와 사진 위치만 개인 메모로 남깁니다.';
    const savedItemDate = '2031-08-03';
    await itemEditor.getByTestId('saved-flow-editor-item-title-input').fill(savedItemTitle);
    await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(savedItemDetail);
    await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill(savedItemDate);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();

    await expect(itemEditor).toHaveCount(0);
    await expect(planEditor).toBeVisible();
    const parentItem = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(parentItem).toContainText(savedItemTitle);
    await expect(parentItem).toContainText(savedItemDate);
    await expect(parentItem.getByTestId('saved-flow-editor-item-open')).toBeFocused();
    await expect.poll(() => planEditor.getByTestId('saved-flow-editor-item-list').evaluate(
      (element) => element.scrollTop,
    )).toBe(planItemScrollTop);
    expect(await rawStorageSnapshot(page)).toEqual(storageBeforeItemApply);

    const savedPlanTitle = '우리 가족 이사 준비 - 저장본 재검토';
    await planEditor.getByTestId('saved-flow-editor-title-input').fill(savedPlanTitle);
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    const storageAfterPlanSave = await rawStorageSnapshot(page);
    expect(storageAfterPlanSave.session).toEqual(storageBeforeItemApply.session);
    const changedKeys = changedRawKeys(
      storageBeforeItemApply.local,
      storageAfterPlanSave.local,
    );
    expect(changedKeys).toEqual(expect.arrayContaining([
      `flow:saved:${personalCopyKey}`,
      'flow:my-flow:item-drafts',
      itemStateStorageKey,
    ]));
    const allowedAuthoringKeys = new Set([
      `flow:saved:${personalCopyKey}`,
      `flow:${personalCopyKey}:anchorDate`,
      'flow:my-flow:item-drafts',
      'flow:my-flow:date-overrides',
      'flow:meta:last-visit',
      itemStateStorageKey,
    ]);
    expect(changedKeys.every((key) => allowedAuthoringKeys.has(key))).toBe(true);
    expect(storageAfterPlanSave.local.flow_builder_mvp_bundles_v11).toBe(
      storageBeforeItemApply.local.flow_builder_mvp_bundles_v11,
    );
    const persistedItemStates = JSON.parse(
      storageAfterPlanSave.local[itemStateStorageKey] ?? '{}',
    ) as Record<string, { skipped?: boolean; note?: string }>;
    expect(persistedItemStates[itemId ?? '']).toMatchObject({
      skipped: true,
      note: 'P0-06 실행 기록 보존 sentinel',
    });

    await page.reload();
    const reloadedFlow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expect(reloadedFlow).toContainText(savedPlanTitle);
    const reloadedPlanOpener = reloadedFlow
      .locator('[data-testid="my-flow-batch-mode-toggle"]:visible')
      .first();
    await reloadedPlanOpener.click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    await expectSharedEditor(page, planEditor, {
      context: 'saved-overlay',
      level: 'plan',
      commitRole: 'save-personal-overlay',
    });
    const reloadedParentItem = planEditor.locator(
      `[data-testid="saved-flow-editor-item-row"][data-item-id="${itemId}"]`,
    );
    await expect(reloadedParentItem).toContainText(savedItemTitle);
    await expect(reloadedParentItem).toContainText(savedItemDate);
    await reloadedParentItem.getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue(savedItemTitle);
    await expect(itemEditor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(savedItemDetail);
    await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue(savedItemDate);
    expect(errors).toEqual([]);
  });

  test('editorTransaction=off keeps a stale recovery journal untouched and renders the legacy public adapter', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/my?editorTransaction=off');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('flow:test-editor-target', 'partial');
      window.sessionStorage.setItem('flow:editor-storage-recovery:v2', JSON.stringify({
        schemaVersion: 2,
        transactionId: 'flag-off-must-not-recover',
        createdAt: new Date().toISOString(),
        targetKeys: ['flow:test-editor-target'],
        snapshot: {
          keys: ['flow:test-editor-target'],
          values: { 'flow:test-editor-target': 'before' },
        },
        commitMarker: {
          key: 'flow:editor-storage-commit-marker:v2',
          value: 'flag-off-must-not-recover',
          previousValue: null,
        },
      }));
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => ({
      value: window.localStorage.getItem('flow:test-editor-target'),
      journal: window.sessionStorage.getItem('flow:editor-storage-recovery:v2'),
    }))).toEqual({
      value: 'partial',
      journal: expect.stringContaining('flag-off-must-not-recover'),
    });
    await expect(page.getByTestId('saved-flow-editor-recovery-notice')).toHaveCount(0);

    await page.goto(`${SOURCE_ROUTE}?editorTransaction=off`);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const legacyEditor = page.getByTestId('public-flow-personal-adjustment');
    await expect(legacyEditor).toHaveAttribute('data-editor-adapter', 'legacy');
    await expect(legacyEditor).not.toHaveAttribute('data-flow-editor-surface', 'true');
  });

  test('public Plan reveals and focuses a validation target that was in another adjustment kind', async ({ page }) => {
    await resetAndOpenSource(page);
    const storageBefore = await rawStorageSnapshot(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const planEditor = page.getByTestId('public-flow-personal-adjustment');
    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const inclusionControls = planEditor
      .getByTestId('public-flow-adjustment-item-row')
      .locator('input[type="checkbox"]');
    const count = await inclusionControls.count();
    expect(count).toBe(24);
    for (let index = 0; index < count; index += 1) {
      await inclusionControls.nth(index).uncheck();
    }

    await planEditor.getByTestId('public-flow-adjustment-kind-name').click();
    await expect(planEditor).toHaveAttribute('data-adjustment-kind', 'name');
    await planEditor.getByTestId('public-flow-adjustment-apply').click();
    await expect(planEditor).toHaveAttribute('data-editor-status', 'dirty-invalid');
    await expect(planEditor).toHaveAttribute('data-adjustment-kind', 'items');
    await expect(planEditor.getByTestId('public-flow-personal-adjustment-error-summary')).toBeVisible();
    await expect(inclusionControls.first()).toBeFocused();
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
  });

  test('a synthetic 50-Item DOM stress keeps one scroll region and one visible sticky action set at 390px', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const planEditor = page.getByTestId('public-flow-personal-adjustment');
    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const itemList = planEditor.getByTestId('public-flow-adjustment-item-list');
    await itemList.evaluate((element) => {
      const rows = Array.from(element.querySelectorAll<HTMLElement>(
        '[data-testid="public-flow-adjustment-item-row"]',
      ));
      const source = rows.at(-1);
      if (!source) throw new Error('P0-06 stress row is missing.');
      for (let index = rows.length; index < 50; index += 1) {
        const clone = source.cloneNode(true) as HTMLElement;
        clone.dataset.itemId = `p0-06-dom-stress-${index + 1}`;
        const title = clone.querySelector<HTMLElement>('button[data-testid="public-flow-adjustment-item-edit"] span');
        if (title) title.textContent = `${index + 1}번째 아주 긴 한글 할 일 제목과 확인해야 할 추가 조건`;
        element.append(clone);
      }
    });
    await expect(planEditor.getByTestId('public-flow-adjustment-item-row')).toHaveCount(50);
    await expect(planEditor.locator('[data-editor-actions-sticky="true"]')).toHaveCount(1);
    await itemList.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(() => itemList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(planEditor.getByTestId('public-flow-adjustment-apply')).toBeVisible();
    await expectEditorGeometry(page, planEditor, MOBILE_VIEWPORT);
    await captureEvidence(page, 'public-plan-50-items-390');
  });

  test('saved Plan detects a concurrent authoring change without overwriting either draft', async ({ page }) => {
    const personalCopyKey = await createCanonicalPersonalCopy(page);
    const flow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await flow.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
    const planEditor = page.getByTestId('saved-flow-editor-plan');
    const localDraftTitle = '이 화면에서 계속 편집할 제목';
    await planEditor.getByTestId('saved-flow-editor-title-input').fill(localDraftTitle);

    const externalTitle = '다른 탭에서 먼저 저장한 제목';
    const originalRecordRaw = await page.evaluate(({ storageKey, title }) => {
      const raw = window.localStorage.getItem(storageKey) || '{}';
      const record = JSON.parse(raw) as Record<string, unknown>;
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...record,
        personalTitle: title,
        savedAt: '2031-08-16T00:00:00.000Z',
        lastSaveRequestId: 'external-tab-save',
      }));
      return raw;
    }, { storageKey: `flow:saved:${personalCopyKey}`, title: externalTitle });

    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveAttribute('data-editor-status', 'recoverable-error');
    await expect(planEditor.getByTestId('flow-editor-error')).toContainText(
      '저장된 계획이 다른 화면에서 바뀌었습니다',
    );
    await expect(planEditor.getByTestId('flow-editor-error')).toBeFocused();
    await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(localDraftTitle);
    expect(await page.evaluate((storageKey) => {
      const record = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as { personalTitle?: string };
      return record.personalTitle;
    }, `flow:saved:${personalCopyKey}`)).toBe(externalTitle);

    await page.evaluate(({ storageKey, raw }) => {
      window.localStorage.setItem(storageKey, raw);
    }, { storageKey: `flow:saved:${personalCopyKey}`, raw: originalRecordRaw });
    await planEditor.getByTestId('flow-editor-retry').click();
    await expect(planEditor).toHaveCount(0);
    expect(await page.evaluate((storageKey) => {
      const record = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as { personalTitle?: string };
      return record.personalTitle;
    }, `flow:saved:${personalCopyKey}`)).toBe(localDraftTitle);
  });

  for (const failureKind of ['runtime', 'storage'] as const) {
    test(`saved Plan keeps its draft and retries after a ${failureKind} failure`, async ({ page }) => {
      test.setTimeout(60_000);
      const errors = collectBrowserErrors(page);
      const personalCopyKey = await createCanonicalPersonalCopy(page);
      const flow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
      await flow.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
      const planEditor = page.getByTestId('saved-flow-editor-plan');
      const retryTitle = `${failureKind} 실패 뒤 다시 저장한 제목`;
      await planEditor.getByTestId('saved-flow-editor-title-input').fill(retryTitle);
      const storageBeforeFailure = await rawStorageSnapshot(page);

      if (failureKind === 'runtime') {
        await page.evaluate(() => {
          const original = Date.prototype.toISOString;
          let shouldFail = true;
          Date.prototype.toISOString = function patchedToISOString() {
            if (shouldFail) {
              shouldFail = false;
              Date.prototype.toISOString = original;
              throw new Error('P0-06 injected runtime failure');
            }
            return original.call(this);
          };
        });
      } else {
        await page.evaluate((targetKey) => {
          const original = Storage.prototype.setItem;
          let shouldFail = true;
          Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
            if (shouldFail && this === window.localStorage && key === targetKey) {
              shouldFail = false;
              Storage.prototype.setItem = original;
              throw new Error('P0-06 injected storage failure');
            }
            return original.call(this, key, value);
          };
        }, `flow:saved:${personalCopyKey}`);
      }

      await planEditor.getByTestId('saved-flow-editor-save').click();
      await expect(planEditor).toHaveAttribute('data-editor-status', 'recoverable-error');
      await expect(planEditor.getByTestId('flow-editor-error')).toBeFocused();
      await expect(planEditor.getByTestId('saved-flow-editor-title-input')).toHaveValue(retryTitle);
      expect(await rawStorageSnapshot(page)).toEqual(storageBeforeFailure);

      await planEditor.getByTestId('flow-editor-retry').click();
      await expect(planEditor).toHaveCount(0);
      expect(await page.evaluate((storageKey) => {
        const record = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as { personalTitle?: string };
        return record.personalTitle;
      }, `flow:saved:${personalCopyKey}`)).toBe(retryTitle);
      expect(errors).toEqual([]);
    });
  }

  for (const viewport of [
    { label: '1024', width: 1024, height: 768 },
    { label: '1440', width: 1440, height: 1000 },
  ]) {
    test(`all four Plan and Item contexts use the same right inspector contract at ${viewport.label}px`, async ({ page }) => {
      const errors = collectBrowserErrors(page);
      await resetAndOpenSource(page, viewport);
      await page.getByTestId('public-flow-adjust-entry').click();
      const publicPlanEditor = page.getByTestId('public-flow-personal-adjustment');
      await expectSharedEditor(page, publicPlanEditor, {
        context: 'public-draft',
        level: 'plan',
        commitRole: 'apply-public-draft',
      });
      await expectEditorGeometry(page, publicPlanEditor, viewport);
      await captureEvidence(page, `public-plan-${viewport.label}`);
      await publicPlanEditor.getByTestId('public-flow-adjustment-kind-items').click();
      await publicPlanEditor.getByTestId('public-flow-adjustment-item-edit').nth(5).click();
      const publicItemEditor = page.getByTestId('public-flow-item-editor');
      await expectSharedEditor(page, publicItemEditor, {
        context: 'public-draft',
        level: 'item',
        commitRole: 'apply-item-to-parent-public-draft',
      });
      await expectEditorGeometry(page, publicItemEditor, viewport);
      await captureEvidence(page, `public-item-${viewport.label}`);

      const personalCopyKey = await createCanonicalPersonalCopy(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const flow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
      await flow.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();

      const planEditor = page.getByTestId('saved-flow-editor-plan');
      await expectSharedEditor(page, planEditor, {
        context: 'saved-overlay',
        level: 'plan',
        commitRole: 'save-personal-overlay',
      });
      await captureEvidence(page, `saved-plan-${viewport.label}`);
      const planBox = await planEditor.boundingBox();
      expect(planBox).not.toBeNull();
      expect(planBox!.x + planBox!.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(planBox!.width).toBeLessThanOrEqual(673);
      expect(planBox!.height).toBeGreaterThanOrEqual(viewport.height - 1);

      await planEditor.getByTestId('saved-flow-editor-item-open').nth(5).click();
      const itemEditor = page.getByTestId('saved-flow-editor-item');
      await expectSharedEditor(page, itemEditor, {
        context: 'saved-overlay',
        level: 'item',
        commitRole: 'apply-item-to-parent-personal-draft',
      });
      await captureEvidence(page, `saved-item-${viewport.label}`);
      const itemBox = await itemEditor.boundingBox();
      expect(itemBox).not.toBeNull();
      expect(itemBox!.x + itemBox!.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(itemBox!.width).toBeLessThanOrEqual(673);
      expect(itemBox!.height).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      ))).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }
});
