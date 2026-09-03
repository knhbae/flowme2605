import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const WORKSPACE_URL = '/my?personalWorkspacePoc=v1';
const AUTHORING_URL = '/flows/new?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;
const POC_AUTHORING_DRAFT_KEY = `${POC_PREFIX}authoring-draft`;
const POC_RECOVERY_KEY = `${POC_PREFIX}editor-storage-recovery:v1`;
const POC_COMMIT_MARKER_KEY = `${POC_PREFIX}editor-storage-commit-marker:v1`;

const BASE_SOURCE = [
  '# Stage 1 통합 검증',
  '- 기준일: 2026-09-03',
  '',
  '## 준비',
  '- [ ] 원문 보존 확인',
  '  - 날짜: 2026-09-03',
].join('\n');
const CONFIRMED_THEN_CHANGED_SOURCE = `${BASE_SOURCE}\n일반 메모 🙂\n`;

type StorageMutation = Readonly<{
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
}>;

type RuntimePocState = {
  revision: number;
  placements: Record<string, { scheduleMode: string; date?: string }>;
  authoredFlows?: Array<{
    ref: string;
    title: string;
    items: Array<{ ref: string; title: string; sourceDate?: string }>;
    authoring: {
      source?: string;
      rawText: string;
      parsedItems?: Array<unknown>;
      fidelityManifest?: {
        sourceFingerprint: string;
        sourceLength: number;
        entries: Array<unknown>;
      };
    };
  }>;
  undo?: unknown;
};

function taskRow(page: Page, title: string): Locator {
  return page.getByTestId('personal-workspace-task-row').filter({ hasText: title }).first();
}

async function readPocState(page: Page): Promise<RuntimePocState | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, POC_STATE_KEY);
}

async function readPocRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY);
}

async function readDraftRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), POC_AUTHORING_DRAFT_KEY);
}

async function readNonPocStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate((prefix) => {
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    )
      .filter((key): key is string => Boolean(key) && !key!.startsWith(prefix))
      .sort();
    return Object.fromEntries(
      keys.map((key) => [key, window.localStorage.getItem(key) ?? '']),
    );
  }, POC_PREFIX);
}

async function readDocumentMutations(page: Page): Promise<StorageMutation[]> {
  return page.evaluate(() => (
    window as Window & typeof globalThis & {
      __personalWorkspaceStage1Mutations?: StorageMutation[];
    }
  ).__personalWorkspaceStage1Mutations ?? []);
}

async function installFixturesAndAudit(
  page: Page,
  calls: StorageMutation[],
): Promise<void> {
  await page.exposeFunction(
    '__recordPersonalWorkspaceStage1Mutation',
    (mutation: StorageMutation) => calls.push(mutation),
  );
  await page.addInitScript(({ stateKey }) => {
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
        category: 'Stage 1 검증',
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
    const fixtures: Array<[string, string]> = [
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
    for (const [key, value] of fixtures) storageSet.call(window.localStorage, key, value);

    type AuditWindow = Window & typeof globalThis & {
      __recordPersonalWorkspaceStage1Mutation: (mutation: StorageMutation) => Promise<void>;
      __personalWorkspaceStage1Mutations: StorageMutation[];
    };
    const auditWindow = window as AuditWindow;
    auditWindow.__personalWorkspaceStage1Mutations = [];
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'setItem', key };
        auditWindow.__personalWorkspaceStage1Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage1Mutation(mutation);
      }
      return storageSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'removeItem', key };
        auditWindow.__personalWorkspaceStage1Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage1Mutation(mutation);
      }
      return storageRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'clear' };
        auditWindow.__personalWorkspaceStage1Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage1Mutation(mutation);
      }
      return storageClear.call(this);
    };

    void stateKey;
  }, { stateKey: POC_STATE_KEY });
}

async function assertStorageBoundary(
  page: Page,
  calls: StorageMutation[],
  operatingBefore: Record<string, string>,
): Promise<void> {
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  expect(await readNonPocStorage(page)).toEqual(operatingBefore);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
}

async function expectReachableAction(action: Locator): Promise<void> {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  const geometry = await action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      height: rect.height,
      inside: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      hit: hit === element || element.contains(hit),
    };
  });
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.inside).toBe(true);
  expect(geometry.hit).toBe(true);
}

async function undoWorkspace(page: Page): Promise<void> {
  const desktopUndo = page.getByTestId('personal-workspace-undo');
  if (await desktopUndo.isVisible()) {
    await desktopUndo.click();
    return;
  }
  await page.getByTestId('personal-workspace-poc-manage').click();
  const mobileUndo = page.getByTestId('personal-workspace-undo-mobile');
  await expect(mobileUndo).toBeVisible();
  await mobileUndo.click();
  await page.getByTestId('personal-workspace-poc-manage').click();
  await expect(mobileUndo).not.toBeVisible();
}

test.describe('개인공간 통합 PoC Stage 1 런타임', () => {
  test('workspace와 authoring은 exact query에서만 열리고 추가·반복·오류 query는 /my로 닫힌다', async ({ page }) => {
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);

    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();

    await page.goto(`${WORKSPACE_URL}&view=today`);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toHaveCount(0);

    await page.goto(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();

    for (const url of [
      `${AUTHORING_URL}&extra=1`,
      '/flows/new?personalWorkspacePoc=v2',
      '/flows/new?personalWorkspacePoc=v1&personalWorkspacePoc=v1',
    ]) {
      await page.goto(url);
      await page.waitForURL((current) => current.pathname === '/my');
      await expect(page.getByTestId('personal-workspace-authoring-shell')).toHaveCount(0);
    }
  });

  test('마지막 원문과 계보를 atomic 저장하고 /my Undo·reload가 exact bytes를 복구한다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);

    await page.getByTestId('personal-workspace-create-flow').click();
    await page.waitForURL(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
    await page.getByTestId('personal-workspace-entry-input').fill(BASE_SOURCE);
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await expect(source).toHaveValue(BASE_SOURCE);
    await source.fill(CONFIRMED_THEN_CHANGED_SOURCE);
    const draftBeforeCommit = await readDraftRaw(page);
    expect(draftBeforeCommit).toBe(JSON.stringify({
      version: 1,
      rawText: CONFIRMED_THEN_CHANGED_SOURCE,
    }));
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await expect(page.getByTestId('personal-workspace-authoring-save')).toBeEnabled();
    const mutationsBeforeCommit = await readDocumentMutations(page);
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'success');
    await expect(page.getByTestId('personal-workspace-authoring-receipt')).toBeVisible();
    expect(await readDraftRaw(page)).toBeNull();
    expect(await page.evaluate(([recoveryKey, markerKey]) => ({
      recovery: window.localStorage.getItem(recoveryKey),
      marker: window.localStorage.getItem(markerKey),
    }), [POC_RECOVERY_KEY, POC_COMMIT_MARKER_KEY])).toEqual({
      recovery: null,
      marker: null,
    });

    const commitMutations = (await readDocumentMutations(page)).slice(
      mutationsBeforeCommit.length,
    );
    const recoveryWrite = commitMutations.findIndex((entry) => (
      entry.method === 'setItem' && entry.key === POC_RECOVERY_KEY
    ));
    const stateWrite = commitMutations.findIndex((entry) => (
      entry.method === 'setItem' && entry.key === POC_STATE_KEY
    ));
    const draftRemoval = commitMutations.findIndex((entry) => (
      entry.method === 'removeItem' && entry.key === POC_AUTHORING_DRAFT_KEY
    ));
    const markerWrite = commitMutations.findIndex((entry) => (
      entry.method === 'setItem' && entry.key === POC_COMMIT_MARKER_KEY
    ));
    expect(recoveryWrite).toBeGreaterThanOrEqual(0);
    expect(stateWrite).toBeGreaterThan(recoveryWrite);
    expect(draftRemoval).toBeGreaterThan(stateWrite);
    expect(markerWrite).toBeGreaterThan(draftRemoval);

    const committed = await readPocState(page);
    const authored = committed?.authoredFlows?.[0];
    expect(authored).toBeTruthy();
    if (!authored) throw new Error('Stage 1 authored Flow가 저장되지 않았습니다.');
    expect(authored.authoring.source).toBe('text-authoring-poc-v1');
    expect(authored.authoring.rawText).toBe(CONFIRMED_THEN_CHANGED_SOURCE);
    expect(authored.authoring.parsedItems).toHaveLength(1);
    expect(authored.authoring.fidelityManifest).toEqual(expect.objectContaining({
      sourceLength: CONFIRMED_THEN_CHANGED_SOURCE.length,
      entries: [],
    }));

    const mutationsBeforeNoopRetry = await readDocumentMutations(page);
    const stateBeforeNoopRetry = await readPocRaw(page);
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'neutral');
    expect(await readPocRaw(page)).toBe(stateBeforeNoopRetry);
    expect(await readDocumentMutations(page)).toHaveLength(mutationsBeforeNoopRetry.length);

    await page.getByTestId('personal-workspace-authoring-open').click();
    await page.waitForURL((url) => (
      url.pathname === '/my' && url.search === '?personalWorkspacePoc=v1'
    ));
    await expect(page.getByTestId('personal-workspace-flow-detail')).toContainText(authored.title);
    const committedRaw = await readPocRaw(page);
    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    expect(await readPocRaw(page)).toBe(committedRaw);
    await expect(page.getByTestId('personal-workspace-flow-detail')).toContainText(authored.title);

    await undoWorkspace(page);
    await expect(page.getByTestId('personal-workspace-transaction-status'))
      .toHaveAttribute('data-status', 'success');
    expect((await readPocState(page))?.authoredFlows ?? []).toEqual([]);
    expect(await readDraftRaw(page)).toBe(draftBeforeCommit);
    await expect(page.locator(
      '[data-testid="personal-workspace-flow-card"][data-origin="authoring-handoff"]',
    )).toHaveCount(0);

    const undoneRaw = await readPocRaw(page);
    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    expect(await readPocRaw(page)).toBe(undoneRaw);
    expect(await readDraftRaw(page)).toBe(draftBeforeCommit);
    expect((await readPocState(page))?.authoredFlows ?? []).toEqual([]);

    const mapCard = page.locator(
      '[data-testid="personal-workspace-flow-card"][data-origin="source-backed-map"]',
    );
    await mapCard.locator('[data-personal-workspace-flow-open-trigger]').click();
    const sourceItemLink = page.getByTestId('my-plan-todo-detail-link').first();
    const sourceItemRef = await sourceItemLink.getAttribute('data-todo-detail-link');
    expect(sourceItemRef).toBeTruthy();
    if (!sourceItemRef) throw new Error('source Flow Item ref를 찾지 못했습니다.');
    await sourceItemLink.click();
    const itemDetail = page.getByTestId('personal-workspace-flow-item-detail');
    const sourceTimingBefore = await itemDetail
      .getByTestId('personal-workspace-item-source-timing')
      .textContent();
    await itemDetail.getByRole('button', { name: '이동', exact: true }).click();
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expect(page.getByTestId('personal-workspace-transaction-status'))
      .toHaveAttribute('data-status', 'success');
    expect((await readPocState(page))?.placements[sourceItemRef]?.scheduleMode)
      .toBe('fixed_date');

    await page.getByTestId('my-plan-todo-detail-link').first().click();
    await itemDetail.getByRole('button', { name: '이동', exact: true }).click();
    const stateBeforeSameDate = await readPocRaw(page);
    const mutationsBeforeSameDate = await readDocumentMutations(page);
    await page.getByTestId('personal-workspace-date-target-1').click();
    await expect(page.getByTestId('personal-workspace-transaction-status'))
      .toHaveAttribute('data-status', 'neutral');
    expect(await readPocRaw(page)).toBe(stateBeforeSameDate);
    expect(await readDocumentMutations(page)).toHaveLength(mutationsBeforeSameDate.length);
    await page.getByTestId('personal-workspace-date-restore').click();
    await expect(page.getByTestId('personal-workspace-transaction-status'))
      .toHaveAttribute('data-status', 'success');
    expect((await readPocState(page))?.placements[sourceItemRef]).toBeUndefined();
    await page.getByTestId('my-plan-todo-detail-link').first().click();
    await expect(itemDetail.getByTestId('personal-workspace-item-source-timing'))
      .toHaveText(sourceTimingBefore ?? '');

    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('malformed 및 운영 key를 가리키는 recovery journal은 손대지 않고 /my로 fail-closed한다', async ({ page }) => {
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);

    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [POC_RECOVERY_KEY, '{malformed'],
    );
    await page.goto(WORKSPACE_URL);
    await page.waitForURL((url) => (
      url.pathname === '/my' && !url.searchParams.has('personalWorkspacePoc')
    ));
    expect(await page.evaluate((key) => window.localStorage.getItem(key), POC_RECOVERY_KEY))
      .toBe('{malformed');
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);

    const outOfBound = JSON.stringify({
      schemaVersion: 2,
      transactionId: 'out-of-bound',
      createdAt: '2026-09-02T00:00:00.000Z',
      targetKeys: ['flow:operational:sentinel'],
      snapshot: {
        keys: ['flow:operational:sentinel'],
        values: { 'flow:operational:sentinel': '  byte-for-byte sentinel  ' },
      },
      commitMarker: {
        key: POC_COMMIT_MARKER_KEY,
        value: 'out-of-bound',
        previousValue: null,
      },
    });
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [POC_RECOVERY_KEY, outOfBound],
    );
    await page.goto(AUTHORING_URL);
    await page.waitForURL((url) => (
      url.pathname === '/my' && !url.searchParams.has('personalWorkspacePoc')
    ));
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), POC_RECOVERY_KEY))
      .toBe(outOfBound);
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('390x844와 1440x900에서 workspace·authoring 핵심 버튼이 접근 가능하고 overflow·browser error가 없다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-02-flowme-integrated-poc-stage-1-runtime-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });
    const viewports = [
      { label: '390x844', width: 390, height: 844 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    let operatingBefore: Record<string, string> | undefined;

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(WORKSPACE_URL);
      await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      operatingBefore ??= await readNonPocStorage(page);
      await expectReachableAction(page.getByTestId('personal-workspace-create-flow'));
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `workspace-${viewport.label}.png`),
        fullPage: false,
      });

      await page.goto(AUTHORING_URL);
      await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
      const entryInput = page.getByTestId('personal-workspace-entry-input');
      if (await entryInput.count()) {
        await entryInput.fill(BASE_SOURCE);
        await page.getByTestId('personal-workspace-entry-start-authoring').click();
      }
      const source = page.getByTestId('personal-workspace-live-editor-textarea');
      await expect(source).toBeVisible();
      await source.fill(BASE_SOURCE);
      if (viewport.width < 1024) {
        await page.getByTestId('personal-workspace-authoring-tab-result').click();
      }
      await expectReachableAction(page.getByTestId('personal-workspace-authoring-save'));
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `authoring-${viewport.label}.png`),
        fullPage: false,
      });
    }

    expect(errors).toEqual([]);
    expect(operatingBefore).toBeDefined();
    await assertStorageBoundary(page, calls, operatingBefore ?? {});
  });
});
