import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'node:path';

const POC_URL = '/my?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;
const POC_STORAGE_RECOVERY_KEY = `${POC_PREFIX}editor-storage-recovery:v1`;
const POC_STORAGE_COMMIT_MARKER_KEY = `${POC_PREFIX}editor-storage-commit-marker:v1`;

type StorageMutation = {
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  before?: string | null;
  value?: string;
  outcome: 'success' | 'throw';
};

type PocStateShape = {
  folders: Array<{ folderId: string; title: string }>;
  memberships: Array<{ member: 'saved_flow' | 'quick_item'; memberRef: string; folderId?: string }>;
  quickItems: Array<{ quickItemId: string; title: string; status: 'open' | 'completed' }>;
  placements: Record<string, { scheduleMode: string; date?: string }>;
  timelineOrders: Array<{ context: string; contextKey: string; orderedRefKeys: string[] }>;
  completions: Record<string, { status: 'open' | 'completed' }>;
  undo?: unknown;
};

function visibleButton(page: Page, label: string): Locator {
  return page.locator('button:visible').filter({ hasText: new RegExp(`^${label}$`, 'u') }).first();
}

function taskRow(page: Page, title: string): Locator {
  return page.getByTestId('personal-workspace-task-row').filter({ hasText: title }).first();
}

async function readPocState(page: Page): Promise<PocStateShape> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), POC_STATE_KEY);
}

async function readPocRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY);
}

async function readNonPocStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate((prefix) => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter((key): key is string => Boolean(key) && !key!.startsWith(prefix))
      .sort();
    return Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key) ?? '']));
  }, POC_PREFIX);
}

async function expectSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'success');
}

async function undo(page: Page): Promise<void> {
  const desktopUndo = page.getByTestId('personal-workspace-undo');
  if (await desktopUndo.isVisible()) {
    await desktopUndo.click();
  } else {
    const manage = page.getByTestId('personal-workspace-poc-manage');
    await manage.click();
    const mobileUndo = page.getByTestId('personal-workspace-undo-mobile');
    await expect(mobileUndo).toBeVisible();
    await mobileUndo.click();
    await manage.click();
    await expect(mobileUndo).not.toBeVisible();
  }
  await expectSaved(page);
}

async function selectView(page: Page, label: '폴더' | '오늘' | '주간' | '월간' | '날짜 미정'): Promise<void> {
  const target = visibleButton(page, label);
  if (label === '폴더' && await target.count() === 0) {
    await visibleButton(page, '미분류').click();
  } else {
    await target.click();
  }
  const id = label === '폴더' ? 'folder' : label === '오늘' ? 'today' : label === '주간' ? 'week' : label === '월간' ? 'month' : 'undated';
  await expect(page.getByTestId(`personal-workspace-${id}-surface`)).toBeVisible();
}

async function createFolder(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: '새 폴더', exact: true }).click();
  const form = page.getByTestId('personal-workspace-folder-form');
  await form.locator('[name="folder-title"]').fill(title);
  await form.getByRole('button', { name: '만들기', exact: true }).click();
  await expectSaved(page);
}

async function createQuickItem(page: Page, title: string): Promise<void> {
  await page.getByTestId('personal-workspace-quick-toggle').click();
  const form = page.getByTestId('personal-workspace-quick-form');
  await form.locator('[name="quick-title"]').fill(title);
  await form.getByRole('button', { name: '추가', exact: true }).click();
  await expectSaved(page);
}

async function installFixturesAndAudit(page: Page, calls: StorageMutation[]): Promise<void> {
  await page.exposeFunction('__recordPersonalWorkspacePocStorageMutation', (mutation: StorageMutation) => {
    calls.push(mutation);
  });
  await page.addInitScript(({ prefix, stateKey }) => {
    const storageSet = Storage.prototype.setItem;
    const storageRemove = Storage.prototype.removeItem;
    const storageClear = Storage.prototype.clear;
    const localDate = (value = new Date()) => [
      String(value.getFullYear()).padStart(4, '0'),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
    const savedAt = `${localDate()}T00:00:00.000Z`;
    const makeBundle = (
      slug: string,
      id: string,
      title: string,
      status: 'draft' | 'published' = 'published',
      itemCount = 1,
    ) => ({
      flow: {
        id,
        slug,
        title,
        category: 'PoC 검증',
        structure_type: 'timeline',
        anchor_type: 'start_date',
        status,
        created_at: savedAt,
        updated_at: savedAt,
        ...(status === 'draft' ? { source_title: '내 초안', tags: ['내 초안'] } : {}),
      },
      sections: [{ id: `${id}-section`, flow_id: id, title: '실행', order: 0 }],
      items: Array.from({ length: itemCount }, (_, index) => ({
        id: `${slug}-item-${index + 1}`,
        flow_id: id,
        section_id: `${id}-section`,
        title: `${title} 실행 ${index + 1}`,
        type: 'calendar',
        day_offset: index,
        order: index,
      })),
    });
    const legacyRecord = (slug: string) => ({
      slug,
      savedAt,
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: localDate(),
    });

    const bundles = [
      makeBundle('map-child', 'flow:map-child', '지도 저장 Flow', 'published', 2),
      makeBundle('url-draft-note', 'flow:draft', '개인 초안 Flow', 'draft'),
      makeBundle('canonical-source', 'flow:canonical-source', '개인 사본 Flow'),
      makeBundle('legacy-plan', 'flow:legacy', '기존 저장 Flow'),
    ];
    const fixtureEntries: Array<[string, string]> = [
      ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
      ['flow:operational:sentinel', '  byte-for-byte sentinel  '],
      ['flow:map:saved:map-one', JSON.stringify({
        mapId: 'map-one',
        title: '검증 지도',
        version: 'v1',
        savedAt,
        anchor: localDate(),
        flowSlugs: ['map-child'],
      })],
      ['flow:saved:map-child', JSON.stringify(legacyRecord('map-child'))],
      ['flow:saved:url-draft-note', JSON.stringify(legacyRecord('url-draft-note'))],
      ['flow:saved:copy:one', JSON.stringify({
        schemaVersion: 2,
        slug: 'copy:one',
        savedAt,
        personalCopyKey: 'copy:one',
        sourceFlowKey: 'flow:canonical-source',
        sourceFlowSlug: 'canonical-source',
        sourceVersion: 'source-v1',
        lastSaveRequestId: 'request:copy:one',
        savedItemCount: 1,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: localDate(),
      })],
      ['flow:saved:legacy-plan', JSON.stringify(legacyRecord('legacy-plan'))],
    ];
    for (const [key, value] of fixtureEntries) {
      storageSet.call(window.localStorage, key, value);
    }

    type AuditedMutation = {
      method: 'setItem' | 'removeItem' | 'clear';
      key?: string;
      before?: string | null;
      value?: string;
      outcome: 'success' | 'throw';
    };
    type AuditWindow = Window & typeof globalThis & {
      __recordPersonalWorkspacePocStorageMutation: (mutation: StorageMutation) => Promise<void>;
      __personalWorkspacePocFailNextWrite?: boolean;
    };
    const auditWindow = window as AuditWindow;
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this !== window.localStorage) return storageSet.call(this, key, value);
      const mutation: AuditedMutation = {
        method: 'setItem',
        key,
        before: window.localStorage.getItem(key),
        value,
        outcome: 'success',
      };
      if (auditWindow.__personalWorkspacePocFailNextWrite && key === stateKey) {
        auditWindow.__personalWorkspacePocFailNextWrite = false;
        mutation.outcome = 'throw';
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
        throw new DOMException('simulated quota failure', 'QuotaExceededError');
      }
      try {
        storageSet.call(this, key, value);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
        throw error;
      }
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this !== window.localStorage) return storageRemove.call(this, key);
      const mutation: AuditedMutation = {
        method: 'removeItem',
        key,
        before: window.localStorage.getItem(key),
        outcome: 'success',
      };
      try {
        storageRemove.call(this, key);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
        throw error;
      }
    };
    Storage.prototype.clear = function auditedClear() {
      if (this !== window.localStorage) return storageClear.call(this);
      const mutation: AuditedMutation = { method: 'clear', outcome: 'success' };
      try {
        storageClear.call(this);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
        throw error;
      }
    };

    void prefix;
  }, { prefix: POC_PREFIX, stateKey: POC_STATE_KEY });
}

async function assertStorageBoundary(page: Page, calls: StorageMutation[], before: Record<string, string>): Promise<void> {
  await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
  expect(await readNonPocStorage(page)).toEqual(before);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
}

function mutationsAfter(calls: readonly StorageMutation[], cursor: number): readonly StorageMutation[] {
  return calls.slice(cursor);
}

function successfulStateTargetWrites(
  calls: readonly StorageMutation[],
  cursor: number,
): readonly StorageMutation[] {
  return mutationsAfter(calls, cursor).filter((call) => (
    call.method === 'setItem'
    && call.key === POC_STATE_KEY
    && call.outcome === 'success'
  ));
}

function changedStateTargetWrites(
  calls: readonly StorageMutation[],
  cursor: number,
): readonly StorageMutation[] {
  return successfulStateTargetWrites(calls, cursor).filter((call) => call.before !== call.value);
}

function successfulStorageSupportWrites(
  calls: readonly StorageMutation[],
  cursor: number,
): readonly StorageMutation[] {
  return mutationsAfter(calls, cursor).filter((call) => (
    call.outcome === 'success'
    && (call.method === 'setItem' || call.method === 'removeItem')
    && (call.key === POC_STORAGE_RECOVERY_KEY || call.key === POC_STORAGE_COMMIT_MARKER_KEY)
  ));
}

async function expectSuccessfulStateTransactionEvidence(
  calls: readonly StorageMutation[],
  cursor: number,
  expectedTransactions = 1,
): Promise<void> {
  await expect.poll(() => successfulStateTargetWrites(calls, cursor).length).toBe(expectedTransactions);
  await expect.poll(() => successfulStorageSupportWrites(calls, cursor).length)
    .toBe(expectedTransactions * 4);
  expect(changedStateTargetWrites(calls, cursor)).toHaveLength(expectedTransactions);
  expect(mutationsAfter(calls, cursor).filter((call) => (
    call.key === POC_STATE_KEY && call.outcome === 'throw'
  ))).toEqual([]);
}

async function expectFailedStateTransactionEvidence(
  page: Page,
  calls: readonly StorageMutation[],
  cursor: number,
): Promise<void> {
  await expect.poll(() => mutationsAfter(calls, cursor).filter((call) => (
    call.method === 'setItem'
    && call.key === POC_STATE_KEY
    && call.outcome === 'throw'
  )).length).toBe(1);
  await expect.poll(() => mutationsAfter(calls, cursor).some((call) => (
    call.method === 'removeItem'
    && call.key === POC_STORAGE_RECOVERY_KEY
    && call.outcome === 'success'
  ))).toBe(true);
  expect(changedStateTargetWrites(calls, cursor)).toHaveLength(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), POC_STORAGE_RECOVERY_KEY)).toBeNull();
}

type BrowserPoint = Readonly<{ x: number; y: number }>;

async function locatorHitPoint(
  locator: Locator,
  xFraction = 0.5,
  yFraction = 0.5,
): Promise<BrowserPoint> {
  const result = await locator.evaluate((element, fractions) => {
    const rect = element.getBoundingClientRect();
    const y = rect.top + rect.height * fractions.y;
    const xFractions = [fractions.x, 0.88, 0.75, 0.25, 0.12];
    for (const candidateFraction of [...new Set(xFractions)]) {
      const x = rect.left + rect.width * candidateFraction;
      const hit = document.elementFromPoint(x, y);
      if (hit === element || Boolean(hit && element.contains(hit))) return { x, y, hit: true };
    }
    return { x: rect.left + rect.width * fractions.x, y, hit: false };
  }, { x: xFraction, y: yFraction });
  expect(result.hit).toBe(true);
  return { x: result.x, y: result.y };
}

async function blankPanelEdgePoint(
  panel: Locator,
  edge: 'top' | 'bottom',
): Promise<BrowserPoint> {
  return panel.evaluate((element, requestedEdge) => {
    const rect = element.getBoundingClientRect();
    const y = requestedEdge === 'top' ? rect.top + 4 : rect.bottom - 4;
    const candidateXs = [rect.left + 4, rect.right - 4, rect.left + 8, rect.right - 8];
    for (const x of candidateXs) {
      const hit = document.elementFromPoint(x, y);
      if (
        hit
        && element.contains(hit)
        && !hit.closest('[data-personal-workspace-drop-kind]')
      ) {
        return { x, y };
      }
    }
    throw new Error(`No non-target ${requestedEdge} edge point exists inside the move panel.`);
  }, edge);
}

async function centerDateTargetAndMoveActivePointer(
  target: Locator,
  pointerId: number,
): Promise<BrowserPoint> {
  const result = await target.evaluate((element, activePointerId) => {
    const panel = element.closest<HTMLElement>('[data-testid="personal-workspace-move-panel"]');
    const activeHandle = document.querySelector<HTMLElement>(
      '[data-personal-workspace-move-source="true"] [data-testid="personal-workspace-move-handle"]',
    );
    if (!panel || !activeHandle) throw new Error('The active move panel and source handle must exist.');
    const panelRect = panel.getBoundingClientRect();
    const stickyHeader = panel.querySelector<HTMLElement>(':scope > .sticky');
    const contentTop = stickyHeader?.getBoundingClientRect().bottom ?? panelRect.top;
    const initialTargetRect = element.getBoundingClientRect();
    const desiredCenterY = contentTop + (panelRect.bottom - contentTop) / 2;
    panel.scrollTop += initialTargetRect.top + initialTargetRect.height / 2 - desiredCenterY;
    const targetRect = element.getBoundingClientRect();
    const x = targetRect.left + targetRect.width / 2;
    const y = targetRect.top + targetRect.height / 2;
    const hit = document.elementFromPoint(x, y);
    const targetIsTopmost = hit === element || Boolean(hit && element.contains(hit));
    activeHandle.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      isPrimary: true,
      pointerId: activePointerId,
      pointerType: 'touch',
    }));
    return { x, y, hit: targetIsTopmost };
  }, pointerId);
  expect(result.hit).toBe(true);
  return { x: result.x, y: result.y };
}

async function dragHandleToRowCorridor(page: Page, handle: Locator, targetRow: Locator): Promise<void> {
  await targetRow.scrollIntoViewIfNeeded();
  const targetBox = await targetRow.boundingBox();
  expect(targetBox).not.toBeNull();
  if (!targetBox) throw new Error('The reorder row must be browser-visible.');
  await handle.dragTo(targetRow, {
    targetPosition: {
      x: targetBox.width * 0.88,
      y: targetBox.height * 0.25,
    },
    timeout: 15_000,
  });
  await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
}

type AutomatedPointerSession = Readonly<{
  pointerId: number;
  startX: number;
  startY: number;
}>;

async function startAutomatedLongPressMove(
  page: Page,
  handle: Locator,
  pointerId: number,
): Promise<AutomatedPointerSession> {
  await handle.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const point = await locatorHitPoint(handle);
  const session = {
    pointerId,
    startX: point.x,
    startY: point.y,
  };
  await handle.dispatchEvent('pointerdown', {
    button: 0,
    buttons: 1,
    clientX: session.startX,
    clientY: session.startY,
    isPrimary: true,
    pointerId,
    pointerType: 'touch',
  });
  await page.waitForTimeout(400);
  await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
  return session;
}

async function moveAutomatedPointer(
  handle: Locator,
  session: AutomatedPointerSession,
  clientX: number,
  clientY: number,
): Promise<void> {
  await handle.dispatchEvent('pointermove', {
    button: 0,
    buttons: 1,
    clientX,
    clientY,
    isPrimary: true,
    pointerId: session.pointerId,
    pointerType: 'touch',
  });
}

async function endAutomatedPointer(
  handle: Locator,
  session: AutomatedPointerSession,
  clientX: number,
  clientY: number,
): Promise<void> {
  await handle.dispatchEvent('pointerup', {
    button: 0,
    buttons: 0,
    clientX,
    clientY,
    isPrimary: true,
    pointerId: session.pointerId,
    pointerType: 'touch',
  });
}

test.describe('FlowMe 개인공간 v4.1 기능형 PoC', () => {
  test('S1-S4, S7-S8: four origins, shadow moves, completion, Undo, reload, and storage parity', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);

    const origins = ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan'] as const;
    await expect(page.getByTestId('personal-workspace-flow-card')).toHaveCount(4);
    for (const origin of origins) {
      await expect(page.locator(`[data-testid="personal-workspace-flow-card"][data-origin="${origin}"]`)).toHaveCount(1);
    }

    const mapCard = page.locator('[data-testid="personal-workspace-flow-card"][data-origin="source-backed-map"]');
    await mapCard.locator('[data-personal-workspace-flow-open-trigger]').click();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();
    const planEdit = page.getByTestId('my-plan-edit');
    await expect(planEdit).toBeVisible();
    await expect(planEdit).toBeEnabled();
    await expect(page.getByTestId('my-flow-export-entry')).toHaveCount(0);
    const planActions = page.getByTestId('my-plan-actions');
    await expect(planActions).toBeVisible();
    await expect(planActions.getByTestId('my-plan-edit')).toHaveCount(1);
    const rawBeforeCleanEditor = await readPocRaw(page);
    const callsBeforeCleanEditor = calls.length;
    await planEdit.click();
    const planEditor = page.getByTestId('personal-workspace-plan-editor');
    await expect(planEditor).toBeVisible();
    await expect(planEditor).toHaveAttribute(
      'data-editor-schema-fields',
      'source-read-only,personal-title,plan-items,impact-summary',
    );
    await expect(planEditor).toHaveAttribute('data-editor-persistence-scope', 'poc-shadow-only');
    const sourceSection = planEditor.locator('[data-personal-plan-section="source"]');
    await expect(sourceSection).toBeVisible();
    await expect(sourceSection).toContainText('원본 정보');
    await expect(sourceSection).toContainText('원본은 바꿀 수 없어요');
    await expect(sourceSection.locator('input, textarea, select')).toHaveCount(0);
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    await expect(planEditor).toHaveCount(0);
    const noOpReceipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(noOpReceipt).toHaveAttribute('data-receipt-status', 'noop');
    await expect(noOpReceipt).toHaveAttribute('data-target-write-count', '0');
    await expect(noOpReceipt).toHaveAttribute('data-support-write-count', '0');
    await expect(planEdit).toBeFocused();
    expect(await readPocRaw(page)).toBe(rawBeforeCleanEditor);
    expect(calls).toHaveLength(callsBeforeCleanEditor);
    const storageBeforeReadonlyDetail = await readNonPocStorage(page);
    await page.getByTestId('my-plan-todo-detail-link').first().click();
    await expect(page.getByTestId('personal-workspace-item-sheet')).toBeVisible();
    expect(await readNonPocStorage(page)).toEqual(storageBeforeReadonlyDetail);
    await page.getByTestId('personal-workspace-item-sheet-close').click();
    await page.getByTestId('my-plan-library-back').click();

    await createFolder(page, '검증 폴더');
    await createQuickItem(page, '검증 빠른 할 일');
    await selectView(page, '오늘');
    let quickRow = taskRow(page, '검증 빠른 할 일');
    await quickRow.getByRole('button', { name: '검증 빠른 할 일 더보기' }).click();
    await page.locator('[data-testid^="personal-workspace-folder-target-folder-"]').click();
    await expectSaved(page);
    quickRow = taskRow(page, '검증 빠른 할 일');
    await quickRow.getByRole('button', { name: '검증 빠른 할 일 더보기' }).click();
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expectSaved(page);
    await expect(taskRow(page, '검증 빠른 할 일')).toHaveCount(0);
    await undo(page);
    await expect(taskRow(page, '검증 빠른 할 일')).toBeVisible();
    const quickState = await readPocState(page);
    expect(quickState.memberships.find((entry) => entry.member === 'quick_item')?.folderId).toBeTruthy();

    await selectView(page, '폴더');
    const sourceMapCard = page.locator('[data-testid="personal-workspace-flow-card"][data-origin="source-backed-map"]');
    await sourceMapCard.getByRole('button', { name: /이동 옵션$/u }).click();
    await page.locator('[data-testid^="personal-workspace-folder-target-folder-"]').click();
    await expectSaved(page);
    const folderButton = page.locator('button:visible').filter({ hasText: /^검증 폴더$/u }).first();
    await folderButton.click();
    const movedMapCard = page.locator('[data-testid="personal-workspace-flow-card"][data-origin="source-backed-map"]');
    await expect(movedMapCard).toBeVisible();
    const stateBeforeItemMove = await readPocState(page);
    const mapMembership = stateBeforeItemMove.memberships.find((entry) => entry.member === 'saved_flow');
    expect(mapMembership?.folderId).toBeTruthy();
    await movedMapCard.locator('[data-personal-workspace-flow-open-trigger]').click();
    await page.getByTestId('my-plan-todo-detail-link').first().click();
    const itemDetail = page.getByTestId('personal-workspace-flow-item-detail');
    await itemDetail.getByRole('button', { name: '이동', exact: true }).click();
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expectSaved(page);
    const stateAfterItemMove = await readPocState(page);
    expect(stateAfterItemMove.memberships.find((entry) => entry.memberRef === mapMembership?.memberRef)?.folderId)
      .toBe(mapMembership?.folderId);
    expect(Object.values(stateAfterItemMove.placements).some((placement) => placement.scheduleMode === 'fixed_date')).toBe(true);
    await page.getByTestId('my-plan-library-back').click();

    await selectView(page, '오늘');
    let completionRow = taskRow(page, '개인 사본 Flow 실행 1');
    await completionRow.getByTestId('personal-workspace-complete').click();
    await expectSaved(page);
    await expect(completionRow.getByTestId('personal-workspace-complete')).toHaveAttribute('aria-pressed', 'true');
    await completionRow.getByText('개인 사본 Flow 실행 1', { exact: true }).click();
    const detailTodo = page.getByTestId('my-plan-todo-row').filter({ hasText: '개인 사본 Flow 실행 1' });
    await expect(detailTodo.getByTestId('my-plan-todo-checkbox')).toHaveAttribute('aria-checked', 'true');
    const completionSheet = page.getByTestId('personal-workspace-item-sheet');
    await expect(completionSheet).toBeVisible();
    await completionSheet.getByRole('button', { name: '다시 열기', exact: true }).click();
    await expectSaved(page);
    await expect(detailTodo.getByTestId('my-plan-todo-checkbox')).toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('personal-workspace-item-sheet-close').click();
    await page.getByTestId('my-plan-library-back').click();
    completionRow = taskRow(page, '개인 사본 Flow 실행 1');
    await expect(completionRow.getByTestId('personal-workspace-complete')).toHaveAttribute('aria-pressed', 'false');

    const successfulRaw = await readPocRaw(page);
    const successfulState = await readPocState(page);
    expect(successfulState.undo).toBeTruthy();
    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('복원');
    expect(await readPocRaw(page)).toBe(successfulRaw);
    await selectView(page, '오늘');
    await expect(taskRow(page, '개인 사본 Flow 실행 1').getByTestId('personal-workspace-complete'))
      .toHaveAttribute('aria-pressed', 'false');

    await assertStorageBoundary(page, calls, operationalBefore);
    await page.evaluate((key) => window.localStorage.setItem(key, '{broken'), POC_STATE_KEY);
    await page.reload();
    await page.waitForURL((url) => url.pathname === '/my' && url.search === '');
    await expect(page.getByTestId('personal-workspace-poc-shell')).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY)).toBe('{broken');
    expect(await readNonPocStorage(page)).toEqual(operationalBefore);
  });

  test('S5-S6: keyboard, menu, long press, and drag converge; no-op and failures keep bytes', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '순서 검증 A');
    await createQuickItem(page, '순서 검증 B');
    await expectSuccessfulStateTransactionEvidence(calls, 0, 2);

    const rawBeforeNoops = await readPocRaw(page);
    const callsBeforeNoops = calls.length;
    let rowB = taskRow(page, '순서 검증 B');
    await rowB.getByRole('button', { name: '순서 검증 B 더보기' }).click();
    await page.getByTestId('personal-workspace-date-target-0').click();
    await expect(page.getByTestId('personal-workspace-move-status')).toHaveAttribute('data-status', 'neutral');
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);

    const escapeAfterLongPressHandle = taskRow(page, '순서 검증 B').getByTestId('personal-workspace-move-handle');
    await escapeAfterLongPressHandle.dispatchEvent('pointerdown', {
      button: 0, clientX: 20, clientY: 20, pointerId: 69, pointerType: 'touch',
    });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await escapeAfterLongPressHandle.dispatchEvent('pointerup', {
      button: 0, clientX: 20, clientY: 20, pointerId: 69, pointerType: 'touch',
    });
    await escapeAfterLongPressHandle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);

    rowB = taskRow(page, '순서 검증 B');
    const pointerHandle = rowB.getByTestId('personal-workspace-move-handle');
    await pointerHandle.dispatchEvent('pointerdown', { button: 0, clientX: 20, clientY: 20, pointerId: 7, pointerType: 'touch' });
    await pointerHandle.dispatchEvent('pointercancel', { button: 0, clientX: 20, clientY: 20, pointerId: 7, pointerType: 'touch' });
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    await pointerHandle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);

    const scrollCancelHandle = taskRow(page, '순서 검증 B').getByTestId('personal-workspace-move-handle');
    await scrollCancelHandle.dispatchEvent('pointerdown', {
      button: 0, clientX: 20, clientY: 20, pointerId: 70, pointerType: 'touch',
    });
    await scrollCancelHandle.dispatchEvent('pointermove', {
      button: 0, clientX: 28, clientY: 20, pointerId: 70, pointerType: 'touch',
    });
    await scrollCancelHandle.dispatchEvent('pointerup', {
      button: 0, clientX: 28, clientY: 20, pointerId: 70, pointerType: 'touch',
    });
    await scrollCancelHandle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);

    await page.waitForTimeout(750);
    await scrollCancelHandle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);

    await rowB.getByRole('button', { name: '순서 검증 B 더보기' }).click();
    await page.getByTestId('personal-workspace-move-close').click();
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);
    expect(calls).toHaveLength(callsBeforeNoops);

    await rowB.getByRole('button', { name: '순서 검증 B 더보기' }).click();
    const callsBeforeFailure = calls.length;
    await page.evaluate(() => {
      (window as Window & typeof globalThis & { __personalWorkspacePocFailNextWrite?: boolean })
        .__personalWorkspacePocFailNextWrite = true;
    });
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expect(page.getByTestId('personal-workspace-move-status')).toHaveAttribute('data-status', 'failure');
    expect(await readPocRaw(page)).toBe(rawBeforeNoops);
    await expectFailedStateTransactionEvidence(page, calls, callsBeforeFailure);
    await page.keyboard.press('Escape');
    const callsAfterFailure = calls.length;

    const outsideHandle = taskRow(page, '순서 검증 B').getByTestId('personal-workspace-move-handle');
    const outsideBox = await outsideHandle.boundingBox();
    expect(outsideBox).not.toBeNull();
    if (outsideBox) {
      await page.mouse.move(outsideBox.x + outsideBox.width / 2, outsideBox.y + outsideBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(outsideBox.x - 14, outsideBox.y + 2, { steps: 5 });
      await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
      await page.mouse.move(382, 836, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
      await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
      expect(await readPocRaw(page)).toBe(rawBeforeNoops);
      expect(calls).toHaveLength(callsAfterFailure);
    }

    const signatures: string[][] = [];
    const captureOrder = async () => {
      const state = await readPocState(page);
      const order = state.timelineOrders.find((entry) => entry.context === 'date');
      expect(order).toBeTruthy();
      signatures.push(order?.orderedRefKeys ?? []);
    };
    const undoOrder = async () => {
      const undoCursor = calls.length;
      await undo(page);
      await expectSuccessfulStateTransactionEvidence(calls, undoCursor);
      expect((await readPocState(page)).timelineOrders).toEqual([]);
    };

    rowB = taskRow(page, '순서 검증 B');
    let transactionCursor = calls.length;
    await rowB.getByTestId('personal-workspace-move-handle').focus();
    await page.keyboard.press('ArrowUp');
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, transactionCursor);
    await captureOrder();
    await undoOrder();

    rowB = taskRow(page, '순서 검증 B');
    transactionCursor = calls.length;
    await rowB.getByRole('button', { name: '순서 검증 B 더보기' }).click();
    await page.getByRole('button', { name: '위로', exact: true }).click();
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, transactionCursor);
    await captureOrder();
    await undoOrder();

    rowB = taskRow(page, '순서 검증 B');
    transactionCursor = calls.length;
    const longPressHandle = rowB.getByTestId('personal-workspace-move-handle');
    await longPressHandle.dispatchEvent('pointerdown', {
      button: 0, clientX: 20, clientY: 20, pointerId: 8, pointerType: 'touch',
    });
    await page.waitForTimeout(400);
    await longPressHandle.dispatchEvent('pointerup', {
      button: 0, clientX: 20, clientY: 20, pointerId: 8, pointerType: 'touch',
    });
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.getByRole('button', { name: '위로', exact: true }).click();
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, transactionCursor);
    await captureOrder();
    await undoOrder();

    rowB = taskRow(page, '순서 검증 B');
    transactionCursor = calls.length;
    await dragHandleToRowCorridor(
      page,
      rowB.getByTestId('personal-workspace-move-handle'),
      taskRow(page, '순서 검증 A'),
    );
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, transactionCursor);
    await captureOrder();
    expect(signatures).toHaveLength(4);
    expect(signatures[1]).toEqual(signatures[0]);
    expect(signatures[2]).toEqual(signatures[0]);
    expect(signatures[3]).toEqual(signatures[0]);

    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('move menu sends top and bottom through reorder, preserves placement/source bytes, and keeps boundary no-ops write-free', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');

    const title = '개인 초안 Flow 실행 1';
    const row = taskRow(page, title);
    const itemRef = await row.getAttribute('data-item-ref');
    expect(itemRef).toBeTruthy();
    if (!itemRef) throw new Error('The source-backed item must expose its stable ref.');
    const rowMetaBefore = await row.locator('span').nth(1).textContent();
    const stateBefore = await readPocState(page) as PocStateShape | null;
    const placementBefore = stateBefore?.placements[itemRef];
    const membershipsBefore = stateBefore?.memberships ?? [];

    const openMoveMenu = async () => {
      await taskRow(page, title).getByRole('button', { name: `${title} 더보기` }).click();
      await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    };
    const assertPersonalFieldsPreserved = async () => {
      const current = await readPocState(page);
      expect(current.placements[itemRef]).toEqual(placementBefore);
      expect(current.memberships).toEqual(membershipsBefore);
      await expect(taskRow(page, title).locator('span').nth(1)).toHaveText(rowMetaBefore ?? '');
      expect(await readNonPocStorage(page)).toEqual(operationalBefore);
    };

    await openMoveMenu();
    const callsBeforeTop = calls.length;
    await page.getByTestId('personal-workspace-order-top').click();
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeTop);
    let order = (await readPocState(page)).timelineOrders.find((entry) => entry.context === 'date');
    expect(order?.orderedRefKeys[0]).toBe(itemRef);
    await assertPersonalFieldsPreserved();

    await openMoveMenu();
    const rawAtTop = await readPocRaw(page);
    const callsAtTop = calls.length;
    await expect(page.getByTestId('personal-workspace-order-top')).toBeDisabled();
    expect(await readPocRaw(page)).toBe(rawAtTop);
    expect(calls).toHaveLength(callsAtTop);
    await page.keyboard.press('Escape');
    expect(calls).toHaveLength(callsAtTop);

    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsAtTop);
    expect((await readPocState(page)).timelineOrders).toEqual([]);
    await assertPersonalFieldsPreserved();

    await openMoveMenu();
    const callsBeforeBottom = calls.length;
    await page.getByTestId('personal-workspace-order-bottom').click();
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeBottom);
    order = (await readPocState(page)).timelineOrders.find((entry) => entry.context === 'date');
    expect(order?.orderedRefKeys.at(-1)).toBe(itemRef);
    await assertPersonalFieldsPreserved();

    await openMoveMenu();
    const rawAtBottom = await readPocRaw(page);
    const callsAtBottom = calls.length;
    await expect(page.getByTestId('personal-workspace-order-bottom')).toBeDisabled();
    expect(await readPocRaw(page)).toBe(rawAtBottom);
    expect(calls).toHaveLength(callsAtBottom);
    await page.keyboard.press('Escape');
    expect(calls).toHaveLength(callsAtBottom);

    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsAtBottom);
    expect((await readPocState(page)).timelineOrders).toEqual([]);
    await assertPersonalFieldsPreserved();
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('pointer cancel clears the active source, insertion feedback, move overlay, and scheduled auto-scroll without writes', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '취소 정리 A');
    await createQuickItem(page, '취소 정리 B');
    await expectSuccessfulStateTransactionEvidence(calls, 0, 2);

    await page.evaluate(() => {
      type RafAuditWindow = Window & typeof globalThis & {
        __pocPendingRafIds?: Set<number>;
      };
      const auditWindow = window as RafAuditWindow;
      const pendingRafIds = new Set<number>();
      const originalRequest = window.requestAnimationFrame.bind(window);
      const originalCancel = window.cancelAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        let requestId = 0;
        requestId = originalRequest((time) => {
          pendingRafIds.delete(requestId);
          callback(time);
        });
        pendingRafIds.add(requestId);
        return requestId;
      };
      window.cancelAnimationFrame = (requestId: number) => {
        pendingRafIds.delete(requestId);
        originalCancel(requestId);
      };
      auditWindow.__pocPendingRafIds = pendingRafIds;
    });

    const rawBeforeCancel = await readPocRaw(page);
    const callsBeforeCancel = calls.length;
    const sourceRow = taskRow(page, '취소 정리 B');
    const targetRow = taskRow(page, '취소 정리 A');
    const handle = sourceRow.getByTestId('personal-workspace-move-handle');
    const session = await startAutomatedLongPressMove(page, handle, 191);
    const targetPoint = await locatorHitPoint(targetRow, 0.88, 0.25);
    await moveAutomatedPointer(
      handle,
      session,
      targetPoint.x,
      targetPoint.y,
    );
    await expect(targetRow.getByTestId('personal-workspace-reorder-insertion-line')).toBeVisible();
    await expect(sourceRow).toHaveAttribute('data-personal-workspace-move-source', 'true');
    const stalePreviewMessage = await page.getByTestId('personal-workspace-transaction-status').textContent();
    expect(stalePreviewMessage).toContain('앞에 놓기');

    const panel = page.getByTestId('personal-workspace-move-panel');
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (!panelBox) throw new Error('The move panel must have a browser-visible bounding box.');
    const blankBottomEdge = await blankPanelEdgePoint(panel, 'bottom');
    await moveAutomatedPointer(
      handle,
      session,
      blankBottomEdge.x,
      blankBottomEdge.y,
    );
    await expect.poll(() => page.evaluate(() => (
      window as Window & typeof globalThis & { __pocPendingRafIds?: Set<number> }
    ).__pocPendingRafIds?.size ?? 0)).toBeGreaterThan(0);
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await panel.evaluate((element) => {
      (window as Window & typeof globalThis & { __pocDetachedMovePanel?: HTMLElement })
        .__pocDetachedMovePanel = element as HTMLElement;
    });

    await handle.dispatchEvent('pointercancel', {
      button: 0,
      buttons: 0,
      clientX: blankBottomEdge.x,
      clientY: blankBottomEdge.y,
      isPrimary: true,
      pointerId: session.pointerId,
      pointerType: 'touch',
    });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expect(page.locator('[data-personal-workspace-move-source="true"]')).toHaveCount(0);
    await expect(page.locator('[data-personal-workspace-reorder-target="true"]')).toHaveCount(0);
    await expect(page.locator('[data-personal-workspace-reorder-position]')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-reorder-insertion-line')).toHaveCount(0);
    await expect(page.locator('[data-personal-workspace-move-dialog="true"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="personal-workspace-drag-ghost"]')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('포인터 이동을 취소');
    await expect(page.getByTestId('personal-workspace-transaction-status')).not.toContainText(stalePreviewMessage ?? '앞에 놓기');
    expect(await page.evaluate(() => (
      [...document.body.classList].filter((name) => /(?:drag|move)/iu.test(name))
    ))).toEqual([]);
    await expect.poll(() => page.evaluate(() => (
      window as Window & typeof globalThis & { __pocPendingRafIds?: Set<number> }
    ).__pocPendingRafIds?.size ?? 0)).toBe(0);
    const detachedPanelScrollAfterCancel = await page.evaluate(() => (
      window as Window & typeof globalThis & { __pocDetachedMovePanel?: HTMLElement }
    ).__pocDetachedMovePanel?.scrollTop ?? -1);
    await page.evaluate(() => new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    }));
    expect(await page.evaluate(() => (
      window as Window & typeof globalThis & { __pocDetachedMovePanel?: HTMLElement }
    ).__pocDetachedMovePanel?.scrollTop ?? -1)).toBe(detachedPanelScrollAfterCancel);
    expect(await page.evaluate(() => (
      window as Window & typeof globalThis & { __pocPendingRafIds?: Set<number> }
    ).__pocPendingRafIds?.size ?? 0)).toBe(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancel);
    expect(calls).toHaveLength(callsBeforeCancel);

    await handle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(calls).toHaveLength(callsBeforeCancel);
    await handle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await readPocRaw(page)).toBe(rawBeforeCancel);
    expect(calls).toHaveLength(callsBeforeCancel);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('844x390 month exposes 28 empty date sections, date-specific Quick add, recovery, and panel-internal scroll', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '월간');
    await expect(page.getByTestId('personal-workspace-quick-toggle')).toHaveCount(0);

    const mobileNavigation = page.getByRole('navigation', { name: '개인공간 보기' });
    await expect(mobileNavigation).toBeVisible();
    await expect(page.getByRole('complementary', { name: '개인공간 탐색' })).toBeHidden();
    const firstHandleBox = await page.getByTestId('personal-workspace-move-handle').first().boundingBox();
    expect(firstHandleBox).not.toBeNull();
    if (firstHandleBox) {
      expect(firstHandleBox.width).toBeGreaterThanOrEqual(48);
      expect(firstHandleBox.height).toBeGreaterThanOrEqual(48);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const firstOccupiedGroup = page.locator('[data-testid="personal-workspace-task-group"][data-context="date"]').first();
    const occupiedAdd = firstOccupiedGroup.getByTestId('personal-workspace-date-quick-add');
    const occupiedDate = await occupiedAdd.getAttribute('data-date');
    expect(occupiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const rawBeforeCancel = await readPocRaw(page);
    const callsBeforeCancel = calls.length;
    await occupiedAdd.press('Enter');
    let quickForm = page.getByTestId('personal-workspace-quick-form');
    await expect(quickForm.locator('[name="quick-date"]')).toHaveValue(occupiedDate ?? '');
    await page.keyboard.press('Escape');
    await expect(quickForm).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancel);
    expect(calls).toHaveLength(callsBeforeCancel);

    await occupiedAdd.press('Enter');
    quickForm = page.getByTestId('personal-workspace-quick-form');
    await expect(quickForm.locator('[name="quick-date"]')).toHaveValue(occupiedDate ?? '');
    await quickForm.getByRole('button', { name: '취소', exact: true }).click();
    await expect(quickForm).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancel);
    expect(calls).toHaveLength(callsBeforeCancel);

    const emptyToggle = page.getByTestId('personal-workspace-empty-month-dates-toggle');
    await expect(emptyToggle).toHaveText('할 일 없는 날짜 28일 보기');
    await expect(emptyToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(emptyToggle).toHaveAttribute('aria-controls', 'personal-workspace-empty-month-dates');
    await emptyToggle.focus();
    await expect(emptyToggle).toBeFocused();
    await emptyToggle.press('Enter');
    await expect(emptyToggle).toHaveAttribute('aria-expanded', 'true');

    const emptyDateSections = page.getByTestId('personal-workspace-empty-month-date');
    await expect(emptyDateSections).toHaveCount(28);
    const emptyDateAdds = emptyDateSections.getByTestId('personal-workspace-date-quick-add');
    await expect(emptyDateAdds).toHaveCount(28);
    for (let index = 0; index < await emptyDateSections.count(); index += 1) {
      const section = emptyDateSections.nth(index);
      const date = await section.getAttribute('data-date');
      const button = section.getByTestId('personal-workspace-date-quick-add');
      await expect(button).toHaveAttribute('data-date', date ?? '');
      await expect(button).toHaveAttribute('aria-label', /에 빠른 할 일 추가$/u);
    }

    const lastEmptySection = emptyDateSections.last();
    const lastEmptyDate = await lastEmptySection.getAttribute('data-date');
    expect(lastEmptyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const lastEmptyAdd = lastEmptySection.getByTestId('personal-workspace-date-quick-add');
    await lastEmptyAdd.scrollIntoViewIfNeeded();
    const lastAddBox = await lastEmptyAdd.boundingBox();
    expect(lastAddBox).not.toBeNull();
    if (lastAddBox) {
      expect(lastAddBox.width).toBeGreaterThanOrEqual(48);
      expect(lastAddBox.height).toBeGreaterThanOrEqual(48);
      expect(lastAddBox.y).toBeGreaterThanOrEqual(0);
      expect(lastAddBox.y + lastAddBox.height).toBeLessThanOrEqual(390);
    }
    await lastEmptyAdd.focus();
    await lastEmptyAdd.press('Enter');
    quickForm = page.getByTestId('personal-workspace-quick-form');
    await expect(quickForm.locator('[name="quick-date"]')).toHaveValue(lastEmptyDate ?? '');

    const failedTitle = '월간 날짜별 추가';
    await quickForm.locator('[name="quick-title"]').fill(failedTitle);
    const rawBeforeFailure = await readPocRaw(page);
    const callsBeforeFailure = calls.length;
    await page.evaluate(() => {
      (window as Window & typeof globalThis & { __personalWorkspacePocFailNextWrite?: boolean })
        .__personalWorkspacePocFailNextWrite = true;
    });
    await quickForm.getByRole('button', { name: '추가', exact: true }).click();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'failure');
    await expect(quickForm).toBeVisible();
    expect(await readPocRaw(page)).toBe(rawBeforeFailure);
    expect((await readPocState(page))?.quickItems ?? []).toEqual([]);
    await expectFailedStateTransactionEvidence(page, calls, callsBeforeFailure);

    const callsAfterFailure = calls.length;
    await quickForm.getByRole('button', { name: '추가', exact: true }).click();
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsAfterFailure);
    const createdRow = taskRow(page, failedTitle);
    await expect(createdRow).toBeVisible();
    const createdRef = await createdRow.getAttribute('data-item-ref');
    expect(createdRef).toBeTruthy();
    if (!createdRef) throw new Error('The date-specific QuickItem must expose its stable ref.');
    expect((await readPocState(page)).placements[createdRef]?.date).toBe(lastEmptyDate);
    await expect(emptyDateSections).toHaveCount(27);

    await createdRow.getByRole('button', { name: `${failedTitle} 더보기` }).click();
    const movePanel = page.getByTestId('personal-workspace-move-panel');
    await expect(movePanel).toBeVisible();
    const pageScrollBeforePanel = await page.evaluate(() => window.scrollY);
    const panelScrollTarget = movePanel.getByTestId('personal-workspace-folder-target-unfiled');
    await panelScrollTarget.evaluate((element) => (
      element.scrollIntoView({ block: 'center', inline: 'nearest' })
    ));
    await expect.poll(() => movePanel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await locatorHitPoint(panelScrollTarget);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBeforePanel);
    const panelTargetBox = await panelScrollTarget.boundingBox();
    const panelBox = await movePanel.boundingBox();
    expect(panelTargetBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    if (panelTargetBox && panelBox) {
      expect(panelTargetBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(panelTargetBox.y + panelTargetBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height);
    }
    await page.getByTestId('personal-workspace-move-close').click();

    const successfulRaw = await readPocRaw(page);
    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('복원');
    expect(await readPocRaw(page)).toBe(successfulRaw);
    await selectView(page, '월간');
    await expect(taskRow(page, failedTitle)).toBeVisible();
    expect((await readPocState(page)).placements[createdRef]?.date).toBe(lastEmptyDate);

    const callsBeforeUndo = calls.length;
    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeUndo);
    await expect(taskRow(page, failedTitle)).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-empty-month-dates-toggle'))
      .toHaveText('할 일 없는 날짜 28일 보기');
    expect(await readNonPocStorage(page)).toEqual(operationalBefore);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('Chromium pointer corridor resolves before and after insertion lines, no-op drops, reorder, and Undo', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '삽입선 검증 A');
    await createQuickItem(page, '삽입선 검증 B');
    await createQuickItem(page, '삽입선 검증 C');
    await expectSuccessfulStateTransactionEvidence(calls, 0, 3);

    const rawBeforePointerMoves = await readPocRaw(page);
    const callsBeforePointerMoves = calls.length;
    const rowA = taskRow(page, '삽입선 검증 A');
    const rowB = taskRow(page, '삽입선 검증 B');
    const rowC = taskRow(page, '삽입선 검증 C');
    const handleB = rowB.getByTestId('personal-workspace-move-handle');
    await rowC.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));

    let session = await startAutomatedLongPressMove(page, handleB, 101);
    await expect(rowB).toHaveAttribute('data-personal-workspace-move-source', 'true');
    expect(await page.locator('[data-personal-workspace-reorder-target="true"]').count()).toBeGreaterThanOrEqual(3);
    const sourcePoint = await locatorHitPoint(rowB);
    await moveAutomatedPointer(handleB, session, sourcePoint.x, sourcePoint.y);
    await expect(page.getByTestId('personal-workspace-move-status')).toHaveAttribute('data-status', 'neutral');
    await expect(page.getByTestId('personal-workspace-move-status')).toContainText('이미 같은 위치');
    await expect(page.getByTestId('personal-workspace-reorder-insertion-line')).toHaveCount(0);
    await endAutomatedPointer(handleB, session, sourcePoint.x, sourcePoint.y);
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    expect(await readPocRaw(page)).toBe(rawBeforePointerMoves);
    expect(calls).toHaveLength(callsBeforePointerMoves);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);

    session = await startAutomatedLongPressMove(page, handleB, 102);
    await moveAutomatedPointer(handleB, session, 3, 3);
    await expect(page.getByTestId('personal-workspace-move-status')).toContainText('오른쪽의 같은 목록');
    await endAutomatedPointer(handleB, session, 3, 3);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    expect(await readPocRaw(page)).toBe(rawBeforePointerMoves);
    expect(calls).toHaveLength(callsBeforePointerMoves);

    session = await startAutomatedLongPressMove(page, handleB, 103);
    const beforePoint = await locatorHitPoint(rowA, 0.5, 0.25);
    await moveAutomatedPointer(handleB, session, beforePoint.x, beforePoint.y);
    await expect(rowA).toHaveAttribute('data-personal-workspace-reorder-position', 'before');
    let insertionLine = rowA.getByTestId('personal-workspace-reorder-insertion-line');
    await expect(insertionLine).toHaveAttribute('data-position', 'before');
    expect((await insertionLine.boundingBox())?.height).toBe(3);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('삽입선 검증 A 앞에 놓기');

    const afterPoint = await locatorHitPoint(rowC, 0.5, 0.75);
    await moveAutomatedPointer(handleB, session, afterPoint.x, afterPoint.y);
    await expect(rowC).toHaveAttribute('data-personal-workspace-reorder-position', 'after');
    insertionLine = rowC.getByTestId('personal-workspace-reorder-insertion-line');
    await expect(insertionLine).toHaveAttribute('data-position', 'after');
    expect((await insertionLine.boundingBox())?.height).toBe(3);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('삽입선 검증 C 뒤에 놓기');
    await endAutomatedPointer(handleB, session, afterPoint.x, afterPoint.y);
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforePointerMoves);
    expect((await readPocState(page)).timelineOrders).toHaveLength(1);

    const callsBeforeUndo = calls.length;
    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeUndo);
    expect((await readPocState(page)).timelineOrders).toEqual([]);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('350ms Chromium pointer automation drops on a date through one live owner, then Undo restores placement', async ({ page }) => {
    test.setTimeout(60_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '포인터 날짜 이동');
    await expectSuccessfulStateTransactionEvidence(calls, 0);

    const row = taskRow(page, '포인터 날짜 이동');
    const itemRef = await row.getAttribute('data-item-ref');
    expect(itemRef).toBeTruthy();
    if (!itemRef) return;
    const handle = row.getByTestId('personal-workspace-move-handle');
    const placementsBeforeMove = (await readPocState(page)).placements;
    const callsBeforeMove = calls.length;
    const session = await startAutomatedLongPressMove(page, handle, 111);

    const moveStatus = page.getByTestId('personal-workspace-move-status');
    const transactionStatus = page.getByTestId('personal-workspace-transaction-status');
    await expect(moveStatus).toHaveAttribute('aria-live', 'off');
    await expect(transactionStatus).toHaveAttribute('aria-live', 'polite');
    const pocLiveOwners = page.locator(
      '[data-testid="personal-workspace-poc-shell"] [aria-live]:not([aria-live="off"])',
    );
    await expect(pocLiveOwners).toHaveCount(1);
    await expect(pocLiveOwners).toHaveAttribute('data-testid', 'personal-workspace-transaction-status');

    const dateTarget = page.getByTestId('personal-workspace-date-target-1');
    const targetDate = await dateTarget.getAttribute('data-personal-workspace-drop-date');
    expect(targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    if (!targetDate) return;
    const targetPoint = await locatorHitPoint(dateTarget);
    await moveAutomatedPointer(handle, session, targetPoint.x, targetPoint.y);
    await expect(moveStatus).toContainText('내일로 이동하기');
    await expect(transactionStatus).toContainText('내일로 이동하기');
    await endAutomatedPointer(handle, session, targetPoint.x, targetPoint.y);

    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeMove);
    expect((await readPocState(page)).placements[itemRef]).toMatchObject({
      scheduleMode: 'fixed_date',
      date: targetDate,
    });

    const callsBeforeUndo = calls.length;
    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeUndo);
    expect((await readPocState(page)).placements).toEqual(placementsBeforeMove);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('844x300 reduced-motion Chromium pointer automation edge-scrolls to an initially offscreen DATE target, drops, and Undo restores', async ({ page }) => {
    test.setTimeout(60_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 844, height: 300 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '화면 밖 날짜 이동');
    await expectSuccessfulStateTransactionEvidence(calls, 0);

    const row = taskRow(page, '화면 밖 날짜 이동');
    const itemRef = await row.getAttribute('data-item-ref');
    expect(itemRef).toBeTruthy();
    if (!itemRef) return;
    const handle = row.getByTestId('personal-workspace-move-handle');
    const placementsBeforeMove = (await readPocState(page)).placements;
    const callsBeforeMove = calls.length;
    const session = await startAutomatedLongPressMove(page, handle, 121);
    const panel = page.getByTestId('personal-workspace-move-panel');
    const dateTarget = page.getByTestId('personal-workspace-date-target-2');
    const targetDate = await dateTarget.getAttribute('data-personal-workspace-drop-date');
    const initialPanelBox = await panel.boundingBox();
    const initialTargetBox = await dateTarget.boundingBox();
    expect(targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(initialPanelBox).not.toBeNull();
    expect(initialTargetBox).not.toBeNull();
    if (!targetDate || !initialPanelBox || !initialTargetBox) return;
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    expect(initialTargetBox.y).toBeGreaterThanOrEqual(initialPanelBox.y + initialPanelBox.height);

    await panel.evaluate((element) => {
      type ScrollAuditWindow = Window & typeof globalThis & { __pocPanelScrollDeltas?: number[] };
      const auditWindow = window as ScrollAuditWindow;
      const scrollPanel = element as HTMLElement;
      const originalScrollBy = scrollPanel.scrollBy.bind(scrollPanel);
      auditWindow.__pocPanelScrollDeltas = [];
      scrollPanel.scrollBy = ((options: ScrollToOptions) => {
        auditWindow.__pocPanelScrollDeltas?.push(Number(options.top ?? 0));
        originalScrollBy(options);
      }) as typeof scrollPanel.scrollBy;
    });

    const bottomEdge = await blankPanelEdgePoint(panel, 'bottom');
    await moveAutomatedPointer(handle, session, bottomEdge.x, bottomEdge.y);
    await expect.poll(async () => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const targetPoint = await centerDateTargetAndMoveActivePointer(dateTarget, session.pointerId);

    const scrolledTop = await panel.evaluate((element) => element.scrollTop);
    const scrollDeltas = await page.evaluate(() => (
      window as Window & typeof globalThis & { __pocPanelScrollDeltas?: number[] }
    ).__pocPanelScrollDeltas ?? []);
    expect(scrolledTop).toBeGreaterThan(0);
    expect(scrollDeltas.length).toBeGreaterThan(0);
    expect(scrollDeltas.some((delta) => delta > 0)).toBe(true);
    expect(scrollDeltas.every((delta) => delta !== 0 && Math.abs(delta) <= 8)).toBe(true);

    const scrolledPanelBox = await panel.boundingBox();
    expect(scrolledPanelBox).not.toBeNull();
    if (!scrolledPanelBox) return;
    expect(targetPoint.y).toBeGreaterThanOrEqual(scrolledPanelBox.y);
    expect(targetPoint.y).toBeLessThanOrEqual(scrolledPanelBox.y + scrolledPanelBox.height);

    await expect(page.getByTestId('personal-workspace-move-status')).toContainText('일주일 뒤로 이동하기');
    await endAutomatedPointer(handle, session, targetPoint.x, targetPoint.y);
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeMove);
    expect((await readPocState(page)).placements[itemRef]).toMatchObject({
      scheduleMode: 'fixed_date',
      date: targetDate,
    });

    const callsBeforeUndo = calls.length;
    await undo(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeUndo);
    expect((await readPocState(page)).placements).toEqual(placementsBeforeMove);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('active Chromium pointer move cancels on a trusted Playwright mouse-wheel scroll, consumes one synthetic click, and the next click works', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '활성 스크롤 취소 원본');
    for (let index = 1; index <= 7; index += 1) {
      await createQuickItem(page, `활성 스크롤 여백 ${index}`);
    }
    await expectSuccessfulStateTransactionEvidence(calls, 0, 8);

    const row = taskRow(page, '활성 스크롤 취소 원본');
    const handle = row.getByTestId('personal-workspace-move-handle');
    await handle.scrollIntoViewIfNeeded();
    const scrollRoom = await page.evaluate(() => (
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY
    ));
    expect(scrollRoom).toBeGreaterThan(80);
    const rawBeforeScrollCancel = await readPocRaw(page);
    const callsBeforeScrollCancel = calls.length;
    const session = await startAutomatedLongPressMove(page, handle, 131);

    const activeX = 382;
    const activeY = 210;
    await moveAutomatedPointer(handle, session, activeX, activeY);
    await expect(row).toHaveAttribute('data-personal-workspace-move-source', 'true');
    await page.evaluate(() => {
      type WheelAuditWindow = Window & typeof globalThis & {
        __pocWheelEvidence?: { deltaY: number; isTrusted: boolean };
      };
      window.addEventListener('wheel', (event) => {
        (window as WheelAuditWindow).__pocWheelEvidence = {
          deltaY: event.deltaY,
          isTrusted: event.isTrusted,
        };
      }, { once: true });
    });
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move(activeX, activeY);
    await page.mouse.wheel(0, 160);
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    const wheelEvidence = await page.evaluate(() => (
      window as Window & typeof globalThis & {
        __pocWheelEvidence?: { deltaY: number; isTrusted: boolean };
      }
    ).__pocWheelEvidence);
    expect(wheelEvidence).toEqual({ deltaY: 160, isTrusted: true });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('빠른 스크롤');
    expect(await readPocRaw(page)).toBe(rawBeforeScrollCancel);
    expect(calls).toHaveLength(callsBeforeScrollCancel);

    await endAutomatedPointer(handle, session, activeX, activeY);
    await handle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeScrollCancel);
    expect(calls).toHaveLength(callsBeforeScrollCancel);

    await handle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeScrollCancel);
    expect(calls).toHaveLength(callsBeforeScrollCancel);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('browser scroll over a row body keeps bytes, then keyboard reorder still works', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '브라우저 스크롤 순서 A');
    await createQuickItem(page, '브라우저 스크롤 순서 B');
    for (let index = 1; index <= 6; index += 1) {
      await createQuickItem(page, `브라우저 스크롤 여백 ${index}`);
    }

    await expectSuccessfulStateTransactionEvidence(calls, 0, 8);
    const rawBeforeScroll = await readPocRaw(page);
    const callsBeforeScroll = calls.length;
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);

    const rowBody = taskRow(page, '브라우저 스크롤 순서 A')
      .locator('[data-personal-workspace-task-open-trigger]');
    await rowBody.scrollIntoViewIfNeeded();
    const bodyBox = await rowBody.boundingBox();
    expect(bodyBox).not.toBeNull();
    if (bodyBox) {
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);
      await page.mouse.wheel(0, 480);
      await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    }
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeScroll);
    expect(calls).toHaveLength(callsBeforeScroll);

    await page.setViewportSize({ width: 1024, height: 768 });
    const rowB = taskRow(page, '브라우저 스크롤 순서 B');
    await rowB.getByTestId('personal-workspace-move-handle').focus();
    await page.keyboard.press('ArrowUp');
    await expectSaved(page);
    await expectSuccessfulStateTransactionEvidence(calls, callsBeforeScroll);
    expect(await readPocRaw(page)).not.toBe(rawBeforeScroll);
    expect((await readPocState(page)).timelineOrders.some((entry) => entry.context === 'date')).toBe(true);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('blur and resize cancel long-press sessions without mutation or an overlay rebound', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);
    await selectView(page, '오늘');
    await createQuickItem(page, '창 취소 검증');
    await expectSuccessfulStateTransactionEvidence(calls, 0);

    const rawBeforeCancels = await readPocRaw(page);
    const callsBeforeCancels = calls.length;
    const handle = taskRow(page, '창 취소 검증').getByTestId('personal-workspace-move-handle');

    await handle.dispatchEvent('pointerdown', {
      button: 0, clientX: 20, clientY: 20, pointerId: 81, pointerType: 'touch',
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(300);
    await handle.dispatchEvent('pointerup', {
      button: 0, clientX: 20, clientY: 20, pointerId: 81, pointerType: 'touch',
    });
    await handle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancels);
    expect(calls).toHaveLength(callsBeforeCancels);

    await page.waitForTimeout(750);
    await handle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);

    await handle.dispatchEvent('pointerdown', {
      button: 0, clientX: 20, clientY: 20, pointerId: 82, pointerType: 'touch',
    });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.setViewportSize({ width: 391, height: 844 });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    await handle.dispatchEvent('pointerup', {
      button: 0, clientX: 20, clientY: 20, pointerId: 82, pointerType: 'touch',
    });
    await handle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancels);
    expect(calls).toHaveLength(callsBeforeCancels);

    await page.waitForTimeout(750);
    await handle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBeforeCancels);
    expect(calls).toHaveLength(callsBeforeCancels);
    await assertStorageBoundary(page, calls, operationalBefore);
  });

  test('five required viewports have no page overflow, errors, or covered primary action', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    const viewports = [
      { label: '390x844', width: 390, height: 844 },
      { label: '375x812', width: 375, height: 812 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    const screenshotDir = path.join(process.cwd(), 'docs', 'content-audit', '2026-09-01-flowme-personal-workspace-v4-1-poc-local-validation-assets');

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(POC_URL);
      await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      await selectView(page, '오늘');
      const quickAction = page.getByTestId('personal-workspace-quick-toggle');
      await quickAction.scrollIntoViewIfNeeded();
      expect(await quickAction.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return top === element || element.contains(top);
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `implementation-${viewport.label}.png`),
        fullPage: false,
      });

      const firstTask = page.getByTestId('personal-workspace-task-row').first();
      if (viewport.label === '844x390') {
        const taskBox = await firstTask.boundingBox();
        expect(taskBox).not.toBeNull();
        if (taskBox) expect(taskBox.y).toBeLessThan(viewport.height);
      }
      await firstTask.getByRole('button', { name: /더보기$/u }).click();
      const movePanel = page.getByTestId('personal-workspace-move-panel');
      await expect(movePanel).toBeVisible();
      await expect(movePanel).not.toHaveAttribute('aria-modal', 'true');
      const panelBox = await movePanel.boundingBox();
      expect(panelBox).not.toBeNull();
      if (panelBox) {
        expect(panelBox.x).toBeGreaterThanOrEqual(0);
        expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
        expect(panelBox.width).toBeLessThanOrEqual(300);
        expect(viewport.width - panelBox.x - panelBox.width).toBeGreaterThanOrEqual(167);
        expect(panelBox.y).toBeGreaterThanOrEqual(64);
      }
      const moveTargets = movePanel.locator('button:visible');
      for (let index = 0; index < await moveTargets.count(); index += 1) {
        const targetBox = await moveTargets.nth(index).boundingBox();
        if (targetBox) expect(targetBox.height).toBeGreaterThanOrEqual(48);
      }
      if (viewport.label === '390x844' || viewport.label === '844x390') {
        await page.screenshot({
          path: path.join(screenshotDir, `implementation-move-${viewport.label}.png`),
          fullPage: false,
        });
      }
      await page.getByTestId('personal-workspace-date-target-0').scrollIntoViewIfNeeded();
      await page.getByTestId('personal-workspace-order-target').first().scrollIntoViewIfNeeded();
      await page.getByTestId('personal-workspace-move-close').click();

      await selectView(page, '폴더');
      await page.locator('[data-testid="personal-workspace-flow-card"][data-origin="canonical-personal-copy"] [data-personal-workspace-flow-open-trigger]').click();
      await page.getByTestId('my-plan-todo-detail-link').click();
      if (viewport.width < 1280) {
        await expect(page.getByTestId('personal-workspace-item-sheet')).toBeVisible();
        await page.getByTestId('personal-workspace-item-sheet-close').click();
      } else {
        await expect(page.getByTestId('personal-workspace-flow-item-detail')).toBeVisible();
      }
      await page.getByTestId('my-plan-library-back').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test('forced four-side safe area, skip link, and move instructions stay operable', async ({ page }) => {
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    const operationalBefore = await readNonPocStorage(page);
    const shell = page.getByTestId('personal-workspace-poc-shell');
    await page.addStyleTag({
      content: `[data-testid="personal-workspace-poc-shell"] {
        --personal-workspace-safe-top: 24px !important;
        --personal-workspace-safe-right: 18px !important;
        --personal-workspace-safe-bottom: 30px !important;
        --personal-workspace-safe-left: 22px !important;
      }`,
    });
    const padding = await shell.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        top: Number.parseFloat(style.paddingTop),
        right: Number.parseFloat(style.paddingRight),
        bottom: Number.parseFloat(style.paddingBottom),
        left: Number.parseFloat(style.paddingLeft),
      };
    });
    expect(padding.top).toBeGreaterThanOrEqual(24);
    expect(padding.right).toBeGreaterThanOrEqual(18);
    expect(padding.bottom).toBeGreaterThanOrEqual(30);
    expect(padding.left).toBeGreaterThanOrEqual(22);

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: '개인공간 본문으로 건너뛰기' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await skipLink.press('Enter');
    await expect(page.locator('#personal-workspace-view-heading')).toBeFocused();

    await selectView(page, '오늘');
    const handle = page.getByTestId('personal-workspace-move-handle').first();
    await expect(handle).toHaveAttribute(
      'aria-describedby',
      'personal-workspace-move-handle-instructions',
    );

    const firstTask = page.getByTestId('personal-workspace-task-row').first();
    await firstTask.getByRole('button', { name: /더보기$/u }).click();
    const movePanel = page.getByTestId('personal-workspace-move-panel');
    await expect(movePanel).toBeVisible();
    const panelBox = await movePanel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(Math.abs(panelBox.x - 22)).toBeLessThanOrEqual(1);
      expect(Math.abs(panelBox.y - 96)).toBeLessThanOrEqual(1);
      expect(Math.abs(panelBox.width - 182)).toBeLessThanOrEqual(1);
      expect(Math.abs((panelBox.y + panelBox.height) - 814)).toBeLessThanOrEqual(1);
    }
    await page.getByTestId('personal-workspace-move-close').click();

    await firstTask.locator('[data-personal-workspace-task-open-trigger]').click();
    const itemSheet = page.getByTestId('personal-workspace-item-sheet');
    await expect(itemSheet).toBeVisible();
    const sheetInsets = await itemSheet.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.bottom,
        paddingBottom: Number.parseFloat(style.paddingBottom),
        maxHeight: Number.parseFloat(style.maxHeight),
      };
    });
    expect(Math.abs(sheetInsets.left - 22)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetInsets.right - 18)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetInsets.bottom - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetInsets.paddingBottom - 46)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetInsets.maxHeight - ((844 * 0.86) - 24 - 30))).toBeLessThanOrEqual(1);
    await page.getByTestId('personal-workspace-item-sheet-close').click();

    await page.getByTestId('personal-workspace-poc-manage').click();
    await page.getByTestId('personal-workspace-reset-open').click();
    const resetConfirm = page.getByTestId('personal-workspace-reset-confirm');
    await expect(resetConfirm).toBeVisible();
    const resetInsets = await resetConfirm.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.bottom,
        paddingBottom: Number.parseFloat(style.paddingBottom),
        maxHeight: Number.parseFloat(style.maxHeight),
      };
    });
    expect(Math.abs(resetInsets.left - 22)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetInsets.right - 18)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetInsets.bottom - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetInsets.paddingBottom - 46)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetInsets.maxHeight - ((844 * 0.86) - 24 - 30))).toBeLessThanOrEqual(1);
    await page.getByTestId('personal-workspace-reset-cancel').click();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'canceled');
    expect(calls).toEqual([]);
    expect(await readNonPocStorage(page)).toEqual(operationalBefore);
  });

  test('D1-010: Flow and QuickItem trash, Undo, restore, reload, and confirmed permanent delete stay PoC-only', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operationalBefore = await readNonPocStorage(page);

    const flowCard = page.getByTestId('personal-workspace-flow-card').first();
    const flowTitle = (await flowCard.locator('span.text-base').textContent())?.trim() ?? '';
    expect(flowTitle).not.toBe('');
    await flowCard.getByRole('button', { name: `${flowTitle} 이동 옵션`, exact: true }).click();
    await page.getByTestId('personal-workspace-move-to-trash').click();
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-flow-card')).toHaveCount(3);

    await undo(page);
    await expect(page.getByTestId('personal-workspace-flow-card')).toHaveCount(4);
    const restoredCard = page.getByTestId('personal-workspace-flow-card').filter({ hasText: flowTitle });
    await restoredCard.getByRole('button', { name: `${flowTitle} 이동 옵션`, exact: true }).click();
    await page.getByTestId('personal-workspace-move-to-trash').click();
    await expectSaved(page);

    await page.getByRole('button', { name: /^휴지통 1$/u }).click();
    await expect(page.getByTestId('personal-workspace-trash-row')).toContainText(flowTitle);
    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    await page.getByRole('button', { name: /^휴지통 1$/u }).click();
    await expect(page.getByTestId('personal-workspace-trash-row')).toContainText(flowTitle);
    await page.getByTestId('personal-workspace-trash-restore').click();
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-trash-row')).toHaveCount(0);

    await visibleButton(page, '폴더').click();
    await createQuickItem(page, '휴지통 빠른 할 일');
    const quickRow = taskRow(page, '휴지통 빠른 할 일');
    await quickRow.getByRole('button', { name: '휴지통 빠른 할 일 더보기', exact: true }).click();
    await page.getByTestId('personal-workspace-move-to-trash').click();
    await expectSaved(page);
    await page.getByRole('button', { name: /^휴지통 1$/u }).click();
    const trashRow = page.getByTestId('personal-workspace-trash-row');
    await expect(trashRow).toContainText('휴지통 빠른 할 일');
    await page.getByTestId('personal-workspace-trash-restore').click();
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-trash-row')).toHaveCount(0);
    await visibleButton(page, '폴더').click();
    const restoredQuickRow = taskRow(page, '휴지통 빠른 할 일');
    await expect(restoredQuickRow).toBeVisible();
    await restoredQuickRow.getByRole('button', { name: '휴지통 빠른 할 일 더보기', exact: true }).click();
    await page.getByTestId('personal-workspace-move-to-trash').click();
    await expectSaved(page);
    await page.getByRole('button', { name: /^휴지통 1$/u }).click();
    await page.getByTestId('personal-workspace-trash-search').fill('빠른');
    await expect(page.getByTestId('personal-workspace-trash-visible-count')).toHaveText('1개 표시 · 전체 1개');

    const beforeCancelRaw = await readPocRaw(page);
    const callsBeforeCancel = calls.length;
    await page.getByTestId('personal-workspace-trash-delete').click();
    const confirm = page.getByTestId('personal-workspace-trash-delete-confirm');
    await expect(confirm).toContainText('복원할 수 없습니다.');
    await page.getByTestId('personal-workspace-trash-delete-cancel').click();
    expect(await readPocRaw(page)).toBe(beforeCancelRaw);
    expect(calls.length).toBe(callsBeforeCancel);
    await expect(trashRow).toBeVisible();

    await page.getByTestId('personal-workspace-trash-delete').click();
    await page.getByTestId('personal-workspace-trash-delete-confirm-action').click();
    await expectSaved(page);
    await expect(page.getByTestId('personal-workspace-trash-row')).toHaveCount(0);
    expect((await readPocState(page)).quickItems.some((item) => item.title === '휴지통 빠른 할 일')).toBe(false);
    expect(await readNonPocStorage(page)).toEqual(operationalBefore);
    expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
    expect(calls.filter((call) => call.key && !call.key.startsWith(POC_PREFIX))).toEqual([]);
  });

});
