import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const POC_URL = '/my?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;

type StorageMutation = Readonly<{
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
}>;

type PocStateShape = Readonly<{
  revision: number;
  folders: Array<{ folderId: string; title: string }>;
  memberships: Array<{
    member: 'saved_flow' | 'quick_item';
    memberRef: string;
    folderId?: string;
    orderKey: number;
  }>;
  quickItems: Array<{
    quickItemId: string;
    title: string;
    status: 'open' | 'completed';
    completedAt?: string;
  }>;
  placements: Record<string, {
    itemRef: string;
    scheduleMode: string;
    date?: string;
    time?: string;
    timelinePolicy?: string;
  }>;
  timelineOrders: Array<{
    context: string;
    contextKey: string;
    orderedRefKeys: string[];
  }>;
  completions: Record<string, { status: 'open' | 'completed'; completedAt?: string }>;
  undo?: unknown;
}>;

type PointerSession = Readonly<{
  pointerId: number;
  startX: number;
  startY: number;
}>;

const VIEWPORTS = [
  { label: '320x700', width: 320, height: 700, forcedSafeArea: true },
  { label: '375x812', width: 375, height: 812, forcedSafeArea: false },
  { label: '390x844', width: 390, height: 844, forcedSafeArea: false },
  { label: '844x390', width: 844, height: 390, forcedSafeArea: false },
  { label: '1024x768', width: 1024, height: 768, forcedSafeArea: false },
  { label: '1440x900', width: 1440, height: 900, forcedSafeArea: false },
] as const;

function visibleButton(page: Page, label: string): Locator {
  return page.locator('button:visible').filter({ hasText: new RegExp(`^${label}$`, 'u') }).first();
}

function taskRow(page: Page, title: string): Locator {
  return page.getByTestId('personal-workspace-task-row').filter({ hasText: title }).first();
}

function folderTarget(page: Page, folderId: string): Locator {
  return page.getByTestId(`personal-workspace-folder-target-${folderId}`);
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
  await expect(page.getByTestId('personal-workspace-transaction-status'))
    .toHaveAttribute('data-status', 'success');
}

async function selectView(
  page: Page,
  label: '폴더' | '오늘' | '주간' | '월간' | '날짜 미정',
): Promise<void> {
  const target = visibleButton(page, label);
  if (label === '폴더' && await target.count() === 0) await visibleButton(page, '미분류').click();
  else await target.click();
  const id = label === '폴더'
    ? 'folder'
    : label === '오늘'
      ? 'today'
      : label === '주간'
        ? 'week'
        : label === '월간'
          ? 'month'
          : 'undated';
  await expect(page.getByTestId(`personal-workspace-${id}-surface`)).toBeVisible();
}

async function createFolder(page: Page, title: string): Promise<string> {
  await selectView(page, '폴더');
  await page.getByRole('button', { name: '새 폴더', exact: true }).click();
  const form = page.getByTestId('personal-workspace-folder-form');
  await form.locator('[name="folder-title"]').fill(title);
  await form.getByRole('button', { name: '만들기', exact: true }).click();
  await expectSaved(page);
  const folder = (await readPocState(page)).folders.find((candidate) => candidate.title === title);
  expect(folder).toBeTruthy();
  if (!folder) throw new Error(`Created folder was not projected: ${title}`);
  return folder.folderId;
}

async function createQuickItem(page: Page, title: string): Promise<string> {
  await selectView(page, '오늘');
  await page.getByTestId('personal-workspace-quick-toggle').click();
  const form = page.getByTestId('personal-workspace-quick-form');
  await form.locator('[name="quick-title"]').fill(title);
  await form.getByRole('button', { name: '추가', exact: true }).click();
  await expectSaved(page);
  const ref = await taskRow(page, title).getAttribute('data-item-ref');
  expect(ref).toBeTruthy();
  if (!ref) throw new Error(`Created QuickItem was not projected: ${title}`);
  return ref;
}

async function installFixturesAndAudit(page: Page, calls: StorageMutation[]): Promise<void> {
  await page.exposeFunction('__recordStage4StorageMutation', (mutation: StorageMutation) => {
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
        category: 'Stage 4 검증',
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
        day_offset: index === 0 ? 0 : index - 1,
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
      makeBundle('canonical-source', 'flow:canonical-source', '개인 사본 Flow', 'published', 2),
      makeBundle('legacy-plan', 'flow:legacy', '기존 저장 Flow'),
    ];
    const fixtureEntries: Array<[string, string]> = [
      ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
      ['flow:operational:stage-4-sentinel', '  byte-for-byte stage 4 sentinel  '],
      ['flow:map:saved:map-one', JSON.stringify({
        mapId: 'map-one',
        title: 'Stage 4 지도',
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
        savedItemCount: 2,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: localDate(),
      })],
      ['flow:saved:legacy-plan', JSON.stringify(legacyRecord('legacy-plan'))],
    ];
    for (const [key, value] of fixtureEntries) storageSet.call(window.localStorage, key, value);

    type AuditWindow = Window & typeof globalThis & {
      __recordStage4StorageMutation: (mutation: StorageMutation) => Promise<void>;
    };
    const auditWindow = window as AuditWindow;
    Storage.prototype.setItem = function stage4AuditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordStage4StorageMutation({ method: 'setItem', key });
      }
      return storageSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function stage4AuditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordStage4StorageMutation({ method: 'removeItem', key });
      }
      return storageRemove.call(this, key);
    };
    Storage.prototype.clear = function stage4AuditedClear() {
      if (this === window.localStorage) {
        void auditWindow.__recordStage4StorageMutation({ method: 'clear' });
      }
      return storageClear.call(this);
    };

    void prefix;
    void stateKey;
  }, { prefix: POC_PREFIX, stateKey: POC_STATE_KEY });
}

async function assertStorageBoundary(
  page: Page,
  calls: StorageMutation[],
  operatingBefore: Record<string, string>,
): Promise<void> {
  expect(await readNonPocStorage(page)).toEqual(operatingBefore);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
}

async function startLongPress(
  page: Page,
  handle: Locator,
  pointerId: number,
): Promise<PointerSession> {
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('The movement handle must be browser-visible.');
  const session = {
    pointerId,
    startX: box.x + box.width / 2,
    startY: box.y + box.height / 2,
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

async function movePointer(
  handle: Locator,
  session: PointerSession,
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

async function endPointer(
  handle: Locator,
  session: PointerSession,
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

async function pointAt(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('The pointer target must be browser-visible.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function expectSemanticFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
}

function quickMoveSignature(state: PocStateShape, itemRef: string) {
  const itemRefParts = itemRef.split(':');
  const quickItemId = itemRefParts[itemRefParts.length - 1];
  const item = state.quickItems.find((candidate) => candidate.quickItemId === quickItemId);
  const membership = state.memberships.find((candidate) => candidate.memberRef === itemRef);
  return {
    member: membership?.member ?? null,
    folderId: membership?.folderId ?? null,
    placement: state.placements[itemRef] ?? null,
    completion: state.completions[itemRef] ?? null,
    title: item?.title ?? null,
    status: item?.status ?? null,
  };
}

function flowMoveSignature(state: PocStateShape, flowRef: string) {
  const membership = state.memberships.find((candidate) => (
    candidate.member === 'saved_flow' && candidate.memberRef === flowRef
  ));
  return membership
    ? {
        member: membership.member,
        memberRef: membership.memberRef,
        folderId: membership.folderId ?? null,
        orderKey: membership.orderKey,
      }
    : null;
}

function canonicalFlowCard(page: Page): Locator {
  return page.locator(
    '[data-testid="personal-workspace-flow-card"][data-origin="canonical-personal-copy"]',
  ).first();
}

async function readFlowRef(card: Locator): Promise<string> {
  const flowRef = await card.getAttribute('data-personal-workspace-flow-ref');
  expect(flowRef).toBeTruthy();
  if (!flowRef) throw new Error('The Flow card needs a stable Flow ref.');
  return flowRef;
}

async function expectFolder(page: Page, itemRef: string, folderId: string | null): Promise<void> {
  await expect.poll(async () => {
    const state = await readPocState(page);
    return state.memberships.find((membership) => membership.memberRef === itemRef)?.folderId ?? null;
  }).toBe(folderId);
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

async function countVisiblePrimaryActions(page: Page): Promise<number> {
  return page.getByTestId('personal-workspace-poc-shell').evaluate((root) => {
    const marker = document.createElement('span');
    marker.style.color = getComputedStyle(root).getPropertyValue('--flowme-action');
    root.append(marker);
    const actionColor = getComputedStyle(marker).color;
    marker.remove();
    return Array.from(root.querySelectorAll<HTMLElement>('a,button')).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
        && style.backgroundColor === actionColor;
    }).length;
  });
}

test.describe('FlowMe 개인공간 Stage 4 이동·반응형 runtime 계약', () => {
  test('item sheet, row, and Flow move cancel/success return focus to a semantic owner', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const targetFolderId = await createFolder(page, 'Stage 4 포커스 폴더');
    await createQuickItem(page, 'Stage 4 포커스 빠른 할 일');

    let row = taskRow(page, 'Stage 4 포커스 빠른 할 일');
    let rowMore = row.getByRole('button', { name: 'Stage 4 포커스 빠른 할 일 더보기' });
    await rowMore.click();
    await page.getByTestId('personal-workspace-move-close').click();
    await expectSemanticFocus(rowMore);

    await rowMore.click();
    await folderTarget(page, targetFolderId).click();
    await expectSaved(page);
    row = taskRow(page, 'Stage 4 포커스 빠른 할 일');
    rowMore = row.getByRole('button', { name: 'Stage 4 포커스 빠른 할 일 더보기' });
    await expectSemanticFocus(rowMore);

    await selectView(page, '폴더');
    const flowCard = page.locator(
      '[data-testid="personal-workspace-flow-card"][data-origin="canonical-personal-copy"]',
    );
    await flowCard.locator('[data-personal-workspace-flow-open-trigger]').click();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();

    let itemOpener = page.getByTestId('my-plan-todo-detail-link').first();
    const itemRef = await itemOpener.getAttribute('data-todo-detail-link');
    expect(itemRef).toBeTruthy();
    if (!itemRef) throw new Error('Flow detail Item opener needs a stable item ref.');
    await itemOpener.click();
    const itemSheet = page.getByTestId('personal-workspace-item-sheet');
    await expect(itemSheet).toBeVisible();
    await itemSheet.getByRole('button', { name: '이동', exact: true }).click();
    await expect(itemSheet).toHaveCount(0);
    await page.getByTestId('personal-workspace-move-close').click();
    itemOpener = page.locator(`[data-todo-detail-link="${itemRef}"]`);
    await expectSemanticFocus(itemOpener);

    await itemOpener.click();
    await page.getByTestId('personal-workspace-item-sheet')
      .getByRole('button', { name: '이동', exact: true })
      .click();
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expectSaved(page);
    itemOpener = page.locator(`[data-todo-detail-link="${itemRef}"]`);
    await expectSemanticFocus(itemOpener);

    let flowMove = page.getByRole('button', { name: '폴더 이동', exact: true });
    await flowMove.click();
    await page.getByTestId('personal-workspace-move-close').click();
    await expectSemanticFocus(flowMove);

    await flowMove.click();
    await folderTarget(page, targetFolderId).click();
    await expectSaved(page);
    flowMove = page.getByRole('button', { name: '폴더 이동', exact: true });
    await expectSemanticFocus(flowMove);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('QuickItem pointer, more menu, and keyboard folder moves have one semantic result', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const targetFolderId = await createFolder(page, 'Stage 4 동등성 폴더');
    const itemRef = await createQuickItem(page, 'Stage 4 폴더 이동 동등성');
    const before = quickMoveSignature(await readPocState(page), itemRef);

    let row = taskRow(page, 'Stage 4 폴더 이동 동등성');
    let handle = row.getByTestId('personal-workspace-move-handle');
    let session = await startLongPress(page, handle, 401);
    let target = folderTarget(page, targetFolderId);
    let targetPoint = await pointAt(target);
    await movePointer(handle, session, targetPoint.x, targetPoint.y);
    await expect(target).toHaveAttribute('data-personal-workspace-drop-state', 'valid');
    await endPointer(handle, session, targetPoint.x, targetPoint.y);
    await expectSaved(page);
    await expectFolder(page, itemRef, targetFolderId);
    const pointerResult = quickMoveSignature(await readPocState(page), itemRef);

    await undo(page);
    await expectFolder(page, itemRef, before.folderId);
    expect(quickMoveSignature(await readPocState(page), itemRef)).toEqual(before);

    row = taskRow(page, 'Stage 4 폴더 이동 동등성');
    await row.getByRole('button', { name: 'Stage 4 폴더 이동 동등성 더보기' }).click();
    target = folderTarget(page, targetFolderId);
    await target.click();
    await expectSaved(page);
    const menuResult = quickMoveSignature(await readPocState(page), itemRef);

    await undo(page);
    await expectFolder(page, itemRef, before.folderId);
    expect(quickMoveSignature(await readPocState(page), itemRef)).toEqual(before);

    row = taskRow(page, 'Stage 4 폴더 이동 동등성');
    handle = row.getByTestId('personal-workspace-move-handle');
    await handle.focus();
    await page.keyboard.press('Enter');
    target = folderTarget(page, targetFolderId);
    await target.focus();
    await page.keyboard.press('Enter');
    await expectSaved(page);
    const keyboardResult = quickMoveSignature(await readPocState(page), itemRef);

    expect(menuResult).toEqual(pointerResult);
    expect(keyboardResult).toEqual(pointerResult);
    expect(pointerResult).toMatchObject({ member: 'quick_item', folderId: targetFolderId });
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('Flow handle, long press, native drag, more menu, and keyboard share saved_flow folder semantics', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const targetFolderId = await createFolder(page, 'Stage 4 Flow 동등성 폴더');
    await createQuickItem(page, 'Stage 4 Flow invalid 대상');
    await selectView(page, '폴더');

    let card = canonicalFlowCard(page);
    const flowRef = await readFlowRef(card);
    const before = flowMoveSignature(await readPocState(page), flowRef);
    expect(before).toBeNull();

    const expectBaselineAfterUndo = async () => {
      await undo(page);
      await expectFolder(page, flowRef, null);
      expect(flowMoveSignature(await readPocState(page), flowRef)).toEqual(before);
      await expect(canonicalFlowCard(page)).toBeVisible();
    };

    card = canonicalFlowCard(page);
    let handle = card.getByTestId('personal-workspace-flow-move-handle');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(handleBox?.width ?? 0).toBeGreaterThanOrEqual(48);
    expect(handleBox?.height ?? 0).toBeGreaterThanOrEqual(48);
    await expect(handle).toHaveAttribute('aria-controls', 'personal-workspace-move-panel');
    await expect(handle).toHaveAttribute('aria-describedby', 'personal-workspace-flow-move-handle-instructions');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');

    const noMovementRaw = await readPocRaw(page);
    const noMovementCalls = calls.length;
    let session = await startLongPress(page, handle, 450);
    await endPointer(handle, session, session.startX, session.startY);
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    expect(await readPocRaw(page)).toBe(noMovementRaw);
    expect(calls).toHaveLength(noMovementCalls);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expect(handle).toBeFocused();

    await handle.click();
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    await folderTarget(page, targetFolderId).click();
    await expectSaved(page);
    await expectFolder(page, flowRef, targetFolderId);
    const shortPressResult = flowMoveSignature(await readPocState(page), flowRef);
    await expectBaselineAfterUndo();

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    session = await startLongPress(page, handle, 451);
    let target = folderTarget(page, targetFolderId);
    let targetPoint = await pointAt(target);
    await movePointer(handle, session, targetPoint.x, targetPoint.y);
    await expect(target).toHaveAttribute('data-personal-workspace-drop-state', 'valid');
    await endPointer(handle, session, targetPoint.x, targetPoint.y);
    await expectSaved(page);
    await expectFolder(page, flowRef, targetFolderId);
    const longPressResult = flowMoveSignature(await readPocState(page), flowRef);
    await expectBaselineAfterUndo();

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await handle.dispatchEvent('dragstart', { dataTransfer });
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    target = folderTarget(page, targetFolderId);
    targetPoint = await pointAt(target);
    await target.dispatchEvent('dragenter', {
      clientX: targetPoint.x,
      clientY: targetPoint.y,
      dataTransfer,
    });
    await target.dispatchEvent('dragover', {
      clientX: targetPoint.x,
      clientY: targetPoint.y,
      dataTransfer,
    });
    await target.dispatchEvent('drop', {
      clientX: targetPoint.x,
      clientY: targetPoint.y,
      dataTransfer,
    });
    await expectSaved(page);
    await expectFolder(page, flowRef, targetFolderId);
    const nativeDragResult = flowMoveSignature(await readPocState(page), flowRef);
    await expectBaselineAfterUndo();
    await dataTransfer.dispose();

    card = canonicalFlowCard(page);
    await card.getByRole('button', { name: '개인 사본 Flow 이동 옵션', exact: true }).click();
    await folderTarget(page, targetFolderId).click();
    await expectSaved(page);
    await expectFolder(page, flowRef, targetFolderId);
    const moreMenuResult = flowMoveSignature(await readPocState(page), flowRef);
    await expectBaselineAfterUndo();

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    await handle.focus();
    await page.keyboard.press('Space');
    target = folderTarget(page, targetFolderId);
    await target.focus();
    await page.keyboard.press('Enter');
    await expectSaved(page);
    await expectFolder(page, flowRef, targetFolderId);
    const keyboardResult = flowMoveSignature(await readPocState(page), flowRef);
    expect(longPressResult).toEqual(shortPressResult);
    expect(nativeDragResult).toEqual(shortPressResult);
    expect(moreMenuResult).toEqual(shortPressResult);
    expect(keyboardResult).toEqual(shortPressResult);
    expect(shortPressResult).toMatchObject({ member: 'saved_flow', folderId: targetFolderId });
    await expectBaselineAfterUndo();

    const expectNoFlowMutation = async (rawBefore: string | null, callCount: number) => {
      await page.waitForTimeout(50);
      expect(await readPocRaw(page)).toBe(rawBefore);
      expect(calls).toHaveLength(callCount);
    };

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    let rawBefore = await readPocRaw(page);
    let callsBefore = calls.length;
    await handle.click();
    target = page.getByTestId('personal-workspace-folder-target-unfiled');
    await expect(target).toHaveAttribute('data-personal-workspace-drop-state', 'current');
    await target.click();
    await expect(page.getByTestId('personal-workspace-move-status')).toContainText('이미 같은 위치');
    await expectNoFlowMutation(rawBefore, callsBefore);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectNoFlowMutation(rawBefore, callsBefore);

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    rawBefore = await readPocRaw(page);
    callsBefore = calls.length;
    session = await startLongPress(page, handle, 452);
    await handle.dispatchEvent('pointercancel', {
      button: 0,
      buttons: 0,
      clientX: session.startX,
      clientY: session.startY,
      isPrimary: true,
      pointerId: session.pointerId,
      pointerType: 'touch',
    });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectNoFlowMutation(rawBefore, callsBefore);

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    rawBefore = await readPocRaw(page);
    callsBefore = calls.length;
    session = await startLongPress(page, handle, 453);
    expect(await page.getByTestId('personal-workspace-date-target-0').count()).toBe(0);
    const invalidRow = taskRow(page, 'Stage 4 Flow invalid 대상');
    const invalidPoint = await pointAt(invalidRow);
    await movePointer(handle, session, invalidPoint.x, invalidPoint.y);
    await expect(page.getByTestId('personal-workspace-move-panel'))
      .toHaveAttribute('data-personal-workspace-drop-outcome', 'invalid');
    await endPointer(handle, session, invalidPoint.x, invalidPoint.y);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectNoFlowMutation(rawBefore, callsBefore);

    card = canonicalFlowCard(page);
    handle = card.getByTestId('personal-workspace-flow-move-handle');
    rawBefore = await readPocRaw(page);
    callsBefore = calls.length;
    session = await startLongPress(page, handle, 454);
    await movePointer(handle, session, 2, 2);
    await expect(page.getByTestId('personal-workspace-move-panel'))
      .toHaveAttribute('data-personal-workspace-drop-outcome', 'invalid');
    await endPointer(handle, session, 2, 2);
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await expectNoFlowMutation(rawBefore, callsBefore);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('current, valid, invalid, pointercancel, and lost capture keep canceled bytes exact', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const targetFolderId = await createFolder(page, 'Stage 4 피드백 폴더');
    await createQuickItem(page, 'Stage 4 피드백 빠른 할 일');
    const rawBefore = await readPocRaw(page);
    await page.waitForTimeout(50);
    const callsBefore = calls.length;
    const row = taskRow(page, 'Stage 4 피드백 빠른 할 일');
    const handle = row.getByTestId('personal-workspace-move-handle');

    let session = await startLongPress(page, handle, 411);
    let target = page.getByTestId('personal-workspace-folder-target-unfiled');
    let point = await pointAt(target);
    await movePointer(handle, session, point.x, point.y);
    await expect(target).toHaveAttribute('data-personal-workspace-drop-state', 'current');
    await expect(page.getByTestId('personal-workspace-move-panel'))
      .toHaveAttribute('data-personal-workspace-drop-outcome', 'current');
    await expect(page.getByTestId('personal-workspace-move-status')).toContainText('이미 같은 위치');
    await expect(page.getByTestId('personal-workspace-move-status')).toHaveAttribute('data-status', 'neutral');
    await expect(page.getByTestId('personal-workspace-transaction-status')).toHaveAttribute('data-status', 'neutral');
    const currentTargetStyles = await page.locator('[data-personal-workspace-drop-state="current"]')
      .evaluateAll((elements) => elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          color: style.color,
          boxShadow: style.boxShadow,
        };
      }));
    expect(currentTargetStyles).toHaveLength(3);
    expect(new Set(currentTargetStyles.map((style) => style.backgroundColor)).size).toBe(1);
    expect(new Set(currentTargetStyles.map((style) => style.borderColor)).size).toBe(1);
    expect(new Set(currentTargetStyles.map((style) => style.color)).size).toBe(1);
    expect(currentTargetStyles.every((style) => style.boxShadow === 'none')).toBe(true);
    await endPointer(handle, session, point.x, point.y);
    await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
    expect(await handle.evaluate((element) => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    })).toBe(true);
    expect(await readPocRaw(page)).toBe(rawBefore);
    expect(calls).toHaveLength(callsBefore);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBefore);
    expect(calls).toHaveLength(callsBefore);

    session = await startLongPress(page, handle, 412);
    target = folderTarget(page, targetFolderId);
    point = await pointAt(target);
    await movePointer(handle, session, point.x, point.y);
    await expect(target).toHaveAttribute('data-personal-workspace-drop-state', 'valid');
    await expect(page.getByTestId('personal-workspace-move-panel'))
      .toHaveAttribute('data-personal-workspace-drop-outcome', 'valid');
    expect(await target.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
    await handle.dispatchEvent('pointercancel', {
      button: 0,
      buttons: 0,
      clientX: point.x,
      clientY: point.y,
      isPrimary: true,
      pointerId: session.pointerId,
      pointerType: 'touch',
    });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBefore);
    expect(calls).toHaveLength(callsBefore);

    session = await startLongPress(page, handle, 413);
    await handle.dispatchEvent('lostpointercapture', {
      button: 0,
      buttons: 0,
      clientX: session.startX,
      clientY: session.startY,
      isPrimary: true,
      pointerId: session.pointerId,
      pointerType: 'touch',
    });
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    await handle.dispatchEvent('click');
    await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    expect(await readPocRaw(page)).toBe(rawBefore);
    expect(calls).toHaveLength(callsBefore);

    session = await startLongPress(page, handle, 414);
    await movePointer(handle, session, 2, 2);
    const panel = page.getByTestId('personal-workspace-move-panel');
    await expect(panel).toHaveAttribute('data-personal-workspace-drop-outcome', 'invalid');
    expect(await panel.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
    await expect(page.getByTestId('personal-workspace-move-status'))
      .toContainText(/대상 밖|오른쪽의 같은 목록/u);
    await handle.dispatchEvent('pointercancel', {
      button: 0,
      buttons: 0,
      clientX: 2,
      clientY: 2,
      isPrimary: true,
      pointerId: session.pointerId,
      pointerType: 'touch',
    });
    await expect(panel).toHaveCount(0);
    await page.waitForTimeout(50);
    expect(await readPocRaw(page)).toBe(rawBefore);
    expect(calls).toHaveLength(callsBefore);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('320 auxiliary and five required viewports keep the move panel and primary action operable', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    const errors: string[] = [];
    await installFixturesAndAudit(page, calls);
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(POC_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    await createFolder(page, '아주 긴 Stage 4 이동 대상 폴더 이름');
    await createQuickItem(page, 'Stage 4 viewport corridor 제목');
    const callsBeforeOpenOnlyChecks = calls.length;
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-03-flowme-integrated-poc-movement-parity-report-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(POC_URL);
      await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      if (viewport.forcedSafeArea) {
        await page.addStyleTag({
          content: `[data-testid="personal-workspace-poc-shell"] {
            --personal-workspace-safe-top: 12px !important;
            --personal-workspace-safe-right: 12px !important;
            --personal-workspace-safe-bottom: 16px !important;
            --personal-workspace-safe-left: 12px !important;
          }`,
        });
      }
      await selectView(page, '오늘');

      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )), `${viewport.label}: document horizontal overflow`).toBe(true);
      if (viewport.width < 1024) {
        expect(
          await countVisiblePrimaryActions(page),
          `${viewport.label}: exact-query mobile surface must expose one primary action`,
        ).toBe(1);
      }
      if (viewport.width < 640) {
        const shellHeader = page.getByTestId('personal-workspace-poc-shell').locator(':scope > header');
        const createFlow = page.getByTestId('personal-workspace-create-flow');
        const manage = page.getByTestId('personal-workspace-poc-manage');
        const [createBox, manageBox] = await Promise.all([
          createFlow.boundingBox(),
          manage.boundingBox(),
        ]);
        expect(await shellHeader.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
          `${viewport.label}: mobile header remains one row without overflow`).toBe(true);
        expect(createBox, `${viewport.label}: mobile create Flow bounds`).not.toBeNull();
        expect(manageBox, `${viewport.label}: mobile manage bounds`).not.toBeNull();
        if (createBox && manageBox) {
          expect(Math.abs(createBox.y - manageBox.y),
            `${viewport.label}: create and manage actions share one row`).toBeLessThanOrEqual(1);
        }
        await expect(page.getByTestId('personal-workspace-undo')).not.toBeVisible();
        await manage.click();
        await expect(page.getByTestId('personal-workspace-undo-mobile')).toBeVisible();
        await manage.click();
        await expect(page.getByTestId('personal-workspace-undo-mobile')).not.toBeVisible();
      }

      const row = taskRow(page, 'Stage 4 viewport corridor 제목');
      const handle = row.getByTestId('personal-workspace-move-handle');
      await row.getByRole('button', { name: 'Stage 4 viewport corridor 제목 더보기' }).click();
      const panel = page.getByTestId('personal-workspace-move-panel');
      const close = page.getByTestId('personal-workspace-move-close');
      const moveStatus = page.getByTestId('personal-workspace-move-status');
      await expect(panel).toBeVisible();

      if (viewport.label === '390x844' || viewport.label === '844x390') {
        await page.screenshot({
          path: path.join(screenshotDir, `react-task-move-${viewport.label}.png`),
          fullPage: false,
        });
      }

      const panelBox = await panel.boundingBox();
      expect(panelBox, `${viewport.label}: panel bounds`).not.toBeNull();
      if (!panelBox) continue;
      expect(panelBox.x).toBeGreaterThanOrEqual(0);
      expect(panelBox.y).toBeGreaterThanOrEqual(0);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
      expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
      if (viewport.forcedSafeArea) {
        expect(panelBox.x).toBeGreaterThanOrEqual(12);
        expect(panelBox.y).toBeGreaterThanOrEqual(12);
        expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width - 12);
        expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height - 16);
      }
      const panelOverflow = await panel.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const overflowingChildren = Array.from(element.querySelectorAll<HTMLElement>('*'))
          .map((child) => {
            const childBounds = child.getBoundingClientRect();
            return {
              tag: child.tagName.toLowerCase(),
              testId: child.dataset.testid ?? null,
              ariaLabel: child.getAttribute('aria-label'),
              className: child.className,
              left: childBounds.left,
              right: childBounds.right,
              clientWidth: child.clientWidth,
              scrollWidth: child.scrollWidth,
            };
          })
          .filter((child) => (
            child.left < bounds.left - 1
            || child.right > bounds.right + 1
            || child.scrollWidth > child.clientWidth + 1
          ));
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflowingChildren,
        };
      });
      expect(
        panelOverflow.scrollWidth <= panelOverflow.clientWidth + 1,
        `${viewport.label}: panel owns no horizontal overflow ${JSON.stringify(panelOverflow)}`,
      ).toBe(true);

      const title = row.locator('[data-personal-workspace-task-open-trigger]');
      const corridor = await title.evaluate((element) => {
        const panelElement = document.querySelector<HTMLElement>('[data-testid="personal-workspace-move-panel"]');
        if (!panelElement) return null;
        const rect = element.getBoundingClientRect();
        const panelRect = panelElement.getBoundingClientRect();
        return {
          text: element.textContent?.trim() ?? '',
          textAlign: getComputedStyle(element).textAlign,
          visibleWidth: Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, panelRect.right)),
        };
      });
      expect(corridor, `${viewport.label}: corridor title diagnostics`).not.toBeNull();
      expect(corridor?.text).toContain('Stage 4 viewport corridor 제목');
      expect(corridor?.textAlign).toBe('right');
      expect(corridor?.visibleWidth ?? 0).toBeGreaterThanOrEqual(24);

      const handleBox = await handle.boundingBox();
      expect(handleBox, `${viewport.label}: handle bounds`).not.toBeNull();
      if (handleBox) {
        expect(handleBox.width).toBeGreaterThanOrEqual(48);
        expect(handleBox.height).toBeGreaterThanOrEqual(48);
        expect(handleBox.x + handleBox.width / 2).toBeGreaterThan(panelBox.x + panelBox.width);
        expect(handleBox.x + handleBox.width).toBeLessThanOrEqual(viewport.width);
      }

      if (viewport.width < 1024) {
        const dateInput = panel.locator('input[type="date"][aria-label="직접 실행 날짜"]');
        await dateInput.scrollIntoViewIfNeeded();
        expect(await dateInput.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
          `${viewport.label}: mobile date input font size`).toBeGreaterThanOrEqual(16);
      }

      const folderTargets = panel.locator('[data-personal-workspace-drop-kind="folder"]');
      const folderTargetCount = await folderTargets.count();
      expect(folderTargetCount).toBeGreaterThanOrEqual(2);
      const firstFolderBox = await folderTargets.first().boundingBox();
      const secondFolderBox = await folderTargets.nth(1).boundingBox();
      expect(firstFolderBox, `${viewport.label}: first folder target bounds`).not.toBeNull();
      expect(secondFolderBox, `${viewport.label}: second folder target bounds`).not.toBeNull();
      if (firstFolderBox && secondFolderBox) {
        expect(Math.abs(firstFolderBox.x - secondFolderBox.x),
          `${viewport.label}: folder targets remain one column`).toBeLessThanOrEqual(1);
        expect(Math.abs(firstFolderBox.width - secondFolderBox.width),
          `${viewport.label}: folder target widths remain aligned`).toBeLessThanOrEqual(1);
      }

      const targets = panel.locator('button');
      const targetCount = await targets.count();
      expect(targetCount).toBeGreaterThan(0);
      for (let index = 0; index < targetCount; index += 1) {
        const target = targets.nth(index);
        await target.scrollIntoViewIfNeeded();
        const targetBox = await target.boundingBox();
        const currentPanelBox = await panel.boundingBox();
        expect(targetBox, `${viewport.label}: target ${index} bounds`).not.toBeNull();
        expect(currentPanelBox).not.toBeNull();
        if (!targetBox || !currentPanelBox) continue;
        expect(targetBox.width, `${viewport.label}: target ${index} width`).toBeGreaterThanOrEqual(48);
        expect(targetBox.height, `${viewport.label}: target ${index} height`).toBeGreaterThanOrEqual(48);
        expect(targetBox.x).toBeGreaterThanOrEqual(currentPanelBox.x - 1);
        expect(targetBox.x + targetBox.width).toBeLessThanOrEqual(
          currentPanelBox.x + currentPanelBox.width + 1,
        );
      }

      const lastAction = targets.last();
      await lastAction.scrollIntoViewIfNeeded();
      await expect(lastAction).toBeInViewport();
      await expect(close).toBeInViewport();
      await expect(moveStatus).toBeInViewport();
      expect(await close.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === element || element.contains(hit);
      }), `${viewport.label}: sticky close remains actionable`).toBe(true);
      await close.click();
      await expect(panel).toHaveCount(0);

      await selectView(page, '폴더');
      const flowCards = page.getByTestId('personal-workspace-flow-card');
      expect(await flowCards.count()).toBeGreaterThanOrEqual(2);
      const firstFlowBox = await flowCards.first().boundingBox();
      const secondFlowBox = await flowCards.nth(1).boundingBox();
      expect(firstFlowBox, `${viewport.label}: first Flow card bounds`).not.toBeNull();
      expect(secondFlowBox, `${viewport.label}: second Flow card bounds`).not.toBeNull();
      if (firstFlowBox && secondFlowBox) {
        expect(Math.abs(firstFlowBox.x - secondFlowBox.x),
          `${viewport.label}: Flow cards remain one column`).toBeLessThanOrEqual(1);
        expect(Math.abs(firstFlowBox.width - secondFlowBox.width),
          `${viewport.label}: Flow card widths remain aligned`).toBeLessThanOrEqual(1);
      }

      const firstFlowHandle = flowCards.first().getByTestId('personal-workspace-flow-move-handle');
      await firstFlowHandle.click();
      await expect(page.getByTestId('personal-workspace-move-panel')).toBeVisible();
      const firstFlowTitle = flowCards.first().locator('[data-personal-workspace-flow-open-trigger]');
      const flowCorridor = await firstFlowTitle.evaluate((element) => {
        const panelElement = document.querySelector<HTMLElement>('[data-testid="personal-workspace-move-panel"]');
        if (!panelElement) return null;
        const rect = element.getBoundingClientRect();
        const panelRect = panelElement.getBoundingClientRect();
        return {
          text: element.textContent?.trim() ?? '',
          textAlign: getComputedStyle(element).textAlign,
          visibleWidth: Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, panelRect.right)),
        };
      });
      expect(flowCorridor, `${viewport.label}: Flow corridor title diagnostics`).not.toBeNull();
      expect(flowCorridor?.text.length ?? 0).toBeGreaterThan(0);
      expect(flowCorridor?.textAlign).toBe('right');
      expect(flowCorridor?.visibleWidth ?? 0).toBeGreaterThanOrEqual(24);
      if (viewport.label === '390x844' || viewport.label === '844x390') {
        await page.screenshot({
          path: path.join(screenshotDir, `react-flow-move-${viewport.label}.png`),
          fullPage: false,
        });
      }
      await page.getByTestId('personal-workspace-move-close').click();
      await expect(page.getByTestId('personal-workspace-move-panel')).toHaveCount(0);
    }

    await page.waitForTimeout(50);
    expect(calls).toHaveLength(callsBeforeOpenOnlyChecks);
    expect(errors).toEqual([]);
    await assertStorageBoundary(page, calls, operatingBefore);
  });
});
