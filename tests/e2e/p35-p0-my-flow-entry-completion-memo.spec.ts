import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  expandMyFlowWholePlan,
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  installLegacySavedPlanLibraryNavigation,
} from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const FLOW_SLUG = 'vehicle-inspection-prep';
const ITEM_DRAFTS_KEY = 'flow:my-flow:item-drafts';
const LEGACY_ITEM_STATE_KEY = `flow_builder_mvp_item_state_${FLOW_SLUG}`;
const EXECUTION_NOTES_KEY = `flow:my-flow:execution-notes:${FLOW_SLUG}`;
const RUN_REGISTRY_KEY = `flow:run-registry:${FLOW_SLUG}`;
const FIRST_ENTRY_SESSION_KEY = 'flowme:my-flow:first-entry-plan';
const SENTINEL_DRAFT_KEY = 'other-flow::sentinel::draft-overlay';

const preservedRaw = {
  legacy: JSON.stringify({
    legacyItem: { note: '보존할 이전 Item note', custom: 'legacy-sentinel' },
  }),
  execution: JSON.stringify([{
    itemId: 'legacy::execution::item',
    itemTitle: '이전 실행 항목',
    kind: 'private',
    note: '보존할 비공개 실행 메모',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }]),
  runs: JSON.stringify({ schemaVersion: 1, runs: [] }),
};

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function seedCompatibilityStores(page: Page) {
  await page.evaluate(({ keys, raw }) => {
    window.localStorage.setItem(keys.itemDrafts, JSON.stringify({
      [keys.sentinelDraft]: {
        title: '다른 Flow 제목',
        memo: '보존할 다른 Flow 메모',
        location: '보존 위치',
      },
    }));
    window.localStorage.setItem(keys.legacy, raw.legacy);
    window.localStorage.setItem(keys.execution, raw.execution);
    window.localStorage.setItem(keys.runs, raw.runs);
  }, {
    keys: {
      itemDrafts: ITEM_DRAFTS_KEY,
      sentinelDraft: SENTINEL_DRAFT_KEY,
      legacy: LEGACY_ITEM_STATE_KEY,
      execution: EXECUTION_NOTES_KEY,
      runs: RUN_REGISTRY_KEY,
    },
    raw: preservedRaw,
  });
}

async function expectCompatibilityStoresPreserved(page: Page, memoKey: string, memo: string) {
  const state = await page.evaluate(({ keys }) => ({
    itemDrafts: JSON.parse(window.localStorage.getItem(keys.itemDrafts) || '{}'),
    legacy: window.localStorage.getItem(keys.legacy),
    execution: window.localStorage.getItem(keys.execution),
    runs: window.localStorage.getItem(keys.runs),
    suspiciousMemoKeys: Object.keys(window.localStorage).filter((key) =>
      key.startsWith('flow:item-memo:') || key.startsWith('flow:my-flow:item-memo:'),
    ),
  }), {
    keys: {
      itemDrafts: ITEM_DRAFTS_KEY,
      legacy: LEGACY_ITEM_STATE_KEY,
      execution: EXECUTION_NOTES_KEY,
      runs: RUN_REGISTRY_KEY,
    },
  });

  expect(state.itemDrafts).toMatchObject({ [memoKey]: { memo } });
  expect(state.itemDrafts[SENTINEL_DRAFT_KEY]).toEqual({
    title: '다른 Flow 제목',
    memo: '보존할 다른 Flow 메모',
    location: '보존 위치',
  });
  expect(state.legacy).toBe(preservedRaw.legacy);
  expect(state.execution).toBe(preservedRaw.execution);
  expect(state.runs).toBe(preservedRaw.runs);
  expect(state.suspiciousMemoKeys).toEqual([]);
}

async function enterItemEdit(page: Page, detail: Locator): Promise<Locator> {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const summary = detail.getByTestId('my-flow-detail-read-summary');
    if ((await summary.getAttribute('open')) === null) await summary.locator('summary').click();
    await summary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  const editor = page.locator(
    '[data-testid="saved-flow-editor-item"]:visible, '
      + '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible',
  ).last();
  await expect(editor).toBeVisible();
  return editor;
}

function getItemMemoInput(editor: Locator): Locator {
  return editor.locator(
    '[data-testid="saved-flow-editor-item-detail-input"], '
      + '[data-testid="my-flow-detail-memo"]',
  );
}

function getItemEditorCancel(editor: Locator): Locator {
  return editor.locator(
    '[data-testid="saved-flow-editor-item-cancel"], '
      + '[data-testid="my-flow-editor-cancel"]',
  );
}

async function openFirstEntryItem(page: Page, execution: Locator) {
  const shell = execution.getByTestId('my-flow-execution-row-shell').first();
  const row = shell.locator('article[data-row-key]');
  const rowKey = await row.getAttribute('data-row-key');
  await shell.getByRole('button', { name: /열기/ }).click();
  const detail = getOpenMyFlowItemDetail(page);
  await expect(detail).toBeVisible();
  return { detail, rowKey: rowKey ?? '' };
}

test.describe('P35 P0 My Flow first entry, completion, and memo facade', () => {
  test('mobile first entry stays compact and Item detail is the only completion and memo mutation point', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, `/f/${FLOW_SLUG}`);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const saveBanner = await savePublicFlow(
      page,
      page.getByTestId('public-flow-save-primary-mobile'),
    );
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 10개');
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    await seedCompatibilityStores(page);

    await expect.poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), FIRST_ENTRY_SESSION_KEY)).toBeNull();
    const workspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]`,
    );
    await expect(workspace).toBeVisible();
    await expect(workspace).toHaveAttribute('data-effective-result-count', '10');
    await expect(workspace).toHaveAttribute('data-effective-date-state', 'undated');
    const effectivePersonalVersion = await workspace.getAttribute(
      'data-effective-personal-version',
    );
    const effectiveExecutionVersion = await workspace.getAttribute(
      'data-effective-execution-version',
    );
    expect(effectivePersonalVersion).toMatch(/^personal:/u);
    expect(effectiveExecutionVersion).toMatch(/^execution:/u);
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(workspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/10 완료',
    );

    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute('data-first-entry-limit', '3');
    await expect(execution.getByTestId('my-flow-shape-aware-row')).toHaveCount(3);
    await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-inline-note-open')).toHaveCount(0);

    const opened = await openFirstEntryItem(page, execution);
    expect(opened.rowKey).not.toBe('');
    const itemId = await opened.detail.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await expect(opened.detail).toHaveAttribute('data-effective-item-id', itemId!);
    await expect(opened.detail).toHaveAttribute(
      'data-effective-personal-version',
      effectivePersonalVersion!,
    );
    const memoKey = `${personalCopyKey}::${itemId}::draft-overlay`;
    const personalChecksKey = `flow_builder_mvp_checks_${personalCopyKey}`;
    await expect(opened.detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(opened.detail.getByTestId('my-flow-inline-note-open')).toHaveCount(0);

    const editor = await enterItemEdit(page, opened.detail);
    const memoInput = getItemMemoInput(editor);
    await expect(memoInput).toHaveCount(1);
    await expect.soft(memoInput).toHaveValue('');
    const memo = '자동차등록증 원본과 사진을 함께 준비';
    await memoInput.fill(memo);
    const checksBeforeMemoSave = await page.evaluate((key) => window.localStorage.getItem(key), personalChecksKey);
    await editor.getByTestId('my-flow-detail-save-changes').click();
    await expect(page.getByTestId('saved-flow-editor-item')).toHaveCount(0);
    const parentPlanEditor = page.getByTestId('saved-flow-editor-plan');
    if (await parentPlanEditor.isVisible().catch(() => false)) {
      await parentPlanEditor.getByTestId('saved-flow-editor-save').click();
      await expect(parentPlanEditor).toHaveCount(0);
    }
    await expectCompatibilityStoresPreserved(page, memoKey, memo);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), personalChecksKey)).toBe(checksBeforeMemoSave);
    await closeOpenMyFlowItemDetail(page);

    const reopened = await openFirstEntryItem(page, execution);
    const reopenedEditor = await enterItemEdit(page, reopened.detail);
    await expect(getItemMemoInput(reopenedEditor)).toHaveValue(memo);
    await getItemEditorCancel(reopenedEditor).click();
    const reopenedParentPlan = page.getByTestId('saved-flow-editor-plan');
    if (await reopenedParentPlan.isVisible().catch(() => false)) {
      await reopenedParentPlan.getByTestId('saved-flow-editor-cancel').click();
      await expect(reopenedParentPlan).toHaveCount(0);
    }
    await closeOpenMyFlowItemDetail(page);

    const completionDetail = (await openFirstEntryItem(page, execution)).detail;
    const completion = completionDetail.getByTestId('my-flow-task-complete-control');
    await expect(completion).not.toBeChecked();
    await completion.click();
    await expect(completion).toBeChecked();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 1/10 완료',
    );
    await expect(
      execution.locator(`article[data-row-key="${opened.rowKey}"]`),
    ).toHaveCount(0);
    const completedChecks = await page.evaluate((key) => (
      JSON.parse(window.localStorage.getItem(key) || '{}')
    ), personalChecksKey);
    expect(Object.values(completedChecks).some(Boolean)).toBe(true);
    await expectCompatibilityStoresPreserved(page, memoKey, memo);

    await closeOpenMyFlowItemDetail(page);
    await workspace.getByTestId('my-flow-workspace-plan-toggle').click();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'true',
    );
    await expandMyFlowWholePlan(workspace);
    const planRow = workspace.locator(`article[data-row-key="${opened.rowKey}"]`);
    await expect(planRow).toBeVisible();
    await expect(planRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await planRow.getByRole('button', { name: /열기/ }).click();
    const completedDetail = getOpenMyFlowItemDetail(page);
    const reopen = completedDetail.getByTestId('my-flow-task-complete-control');
    await expect(reopen).toBeChecked();
    await reopen.click();
    await expect(reopen).not.toBeChecked();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/10 완료',
    );
    await expectCompatibilityStoresPreserved(page, memoKey, memo);

    await closeOpenMyFlowItemDetail(page);
    await page.reload();
    const reloadedWorkspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]`,
    );
    await expect(reloadedWorkspace).toBeVisible();
    await expect(reloadedWorkspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(reloadedWorkspace.getByTestId('my-flow-shape-aware-row')).toHaveCount(3);
    await expect(reloadedWorkspace.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expectCompatibilityStoresPreserved(page, memoKey, memo);
    expect(errors).toEqual([]);
  });
});
