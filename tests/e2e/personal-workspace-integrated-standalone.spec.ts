import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';
import { findPersonalWorkspacePocStructureTemplatePreview } from '../../lib/flow/personal-workspace-poc-structure-template';

// K3-A adaptation: selecting a historical D2 template now previews only.
// This proves the pinned HTML's explicit apply contract, not original D2 parity.
async function applyStandaloneTemplate(page: Page, index = 0, nativeAvailable = true) {
  const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[index];
  const editor = page.locator('#flow-editor');
  await expect(editor).toHaveValue('');
  const before = await page.evaluate(() => {
    const w = window as typeof window & { __templateAudit?: { writes: number; native: number; restore: () => void } };
    const methods = ['setItem', 'removeItem', 'clear'] as const;
    const originals = methods.map(method => Storage.prototype[method]);
    const exec = document.execCommand;
    const audit = { writes: 0, native: 0, restore: () => {
      methods.forEach((method, index) => Object.defineProperty(Storage.prototype, method, { configurable: true, writable: true, value: originals[index] }));
      document.execCommand = exec;
    } };
    methods.forEach((method, index) => Object.defineProperty(Storage.prototype, method, { configurable: true, writable: true, value: function(this: Storage, ...args: string[]) {
      audit.writes++;
      return Reflect.apply(originals[index], this, args);
    } }));
    document.execCommand = function(command, ...args) { if (command === 'insertText') audit.native++; return Reflect.apply(exec, document, [command, ...args]); };
    w.__templateAudit = audit;
    try { return Object.fromEntries(Object.entries(localStorage)); } catch { return null; }
  });
  try {
    await page.locator(`button[data-action="select-template"][data-template-id="${template.templateId}"]`).click();
    await expect(editor).toHaveValue('');
    expect(await page.locator('#template-example-source').textContent()).toBe(findPersonalWorkspacePocStructureTemplatePreview(template.templateId)!.expectedRawText);
    const preview = await page.evaluate(() => {
      const audit = (window as typeof window & { __templateAudit: { writes: number; native: number } }).__templateAudit;
      let storage = null;
      try { storage = Object.fromEntries(Object.entries(localStorage)); } catch { /* Explicit storage-denied scenario. */ }
      return { writes: audit.writes, native: audit.native, storage };
    });
    expect(preview).toEqual({ writes: 0, native: 0, storage: before });
    await page.locator(`button[data-action="apply-template"][data-template-id="${template.templateId}"]`).click();
    await expect(editor).toHaveValue(nativeAvailable ? template.scaffold : '');
    expect(await page.evaluate(() => (window as typeof window & { __templateAudit: { native: number } }).__templateAudit.native)).toBe(1);
  } finally {
    await page.evaluate(() => (window as typeof window & { __templateAudit: { restore: () => void } }).__templateAudit.restore());
  }
}

const STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated';
const WORKSPACE_STORAGE_KEY = `${STORAGE_KEY}:workspace-v2`;
const WORKSPACE_RECOVERY_KEY = 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2';
// Read-only checkpoint projection. A missing/invalid v2 record is never silently
// substituted with a seed or repaired; legacy bytes are checked separately.
async function readStandaloneCheckpoint(page: Page) {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (raw === null) throw Error('Expected a persisted v2 checkpoint');
    const checkpoint = JSON.parse(raw);
    const api = (window as unknown as { FlowPocWorkspaceCheckpoint: { validateCheckpoint: (value: unknown) => { ok: boolean; reason?: string } } }).FlowPocWorkspaceCheckpoint;
    const checked = api.validateCheckpoint(checkpoint);
    if (!checked.ok || checkpoint.version !== 2 || checkpoint.contract !== 'flowme-standalone-workspace-checkpoint-v2') throw Error(`Invalid v2 checkpoint: ${checked.reason}`);
    return checkpoint;
  }, WORKSPACE_STORAGE_KEY);
}
const DRAFT_STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated:draft';
const OPERATING_SENTINEL_KEY = 'flow:standalone:android-sentinel';
const HTML_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
);
const HTML_URL = pathToFileURL(HTML_PATH).href;
async function standaloneUntimedSeedRows(page: Page) {
  // Freeze Date, not timers: preserve the original 9/2 seed journey while the
  // live timeline otherwise includes seven overdue rows on later dates.
  expect(await page.locator('.task-row').evaluateAll(rows => rows.map(row => row.getAttribute('data-task-id'))))
    .toEqual(['meeting', 'memo-share', 'washer-filter', 'checklist']);
  const rows = page.locator('.task-row:not([data-task-id="meeting"])');
  await expect(rows).toHaveCount(3);
  return rows;
}
const VALID_SOURCE = [
  '# 휴대폰 검증 Flow',
  '- 기준일: 2026-09-20',
  '',
  '## 준비',
  '- [ ] 전입 신고 준비',
  '  - 날짜: 2026-09-08',
].join('\n');

const REQUIRED_VIEWPORTS = [
  { label: '320x700', width: 320, height: 700 },
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
];

type StandaloneStorageMutation = {
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
};

async function expectSuccessfulMutationCount(page: Page, count: number): Promise<void> {
  const expected = String(count);
  await expect(page.locator('#app')).toHaveAttribute('data-successful-mutations', expected);
  await expect(page.locator('#mutation-count')).toHaveAttribute('data-successful-mutations', expected);
}

async function expectSaveStatus(page: Page, text: string | RegExp, mode: string): Promise<void> {
  const status = page.locator('#save-status');
  await expect(status).toContainText(text);
  await expect(status).toHaveAttribute('data-mode', mode);
  await expect(page.locator('#app')).toHaveAttribute('data-save-state', mode);
}

async function installStandaloneA8StorageAudit(
  page: Page,
  calls: StandaloneStorageMutation[],
  operatingBytes: string,
): Promise<void> {
  await page.exposeFunction(
    '__recordStandaloneA8Mutation',
    (entry: StandaloneStorageMutation) => calls.push(entry),
  );
  await page.addInitScript(({ operatingSentinelKey, storageKey, draftStorageKey, sentinelBytes, seedFlag }) => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    if (window.name !== seedFlag) {
      originalRemove.call(window.localStorage, storageKey);
      originalRemove.call(window.localStorage, draftStorageKey);
      originalSet.call(window.localStorage, operatingSentinelKey, sentinelBytes);
      window.name = seedFlag;
    }

    type AuditWindow = Window & typeof globalThis & {
      __recordStandaloneA8Mutation: (entry: StandaloneStorageMutation) => Promise<void>;
    };
    const auditWindow = window as AuditWindow;
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordStandaloneA8Mutation({ method: 'setItem', key });
      }
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordStandaloneA8Mutation({ method: 'removeItem', key });
      }
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) {
        void auditWindow.__recordStandaloneA8Mutation({ method: 'clear' });
      }
      return originalClear.call(this);
    };
  }, {
    operatingSentinelKey: OPERATING_SENTINEL_KEY,
    storageKey: STORAGE_KEY,
    draftStorageKey: DRAFT_STORAGE_KEY,
    sentinelBytes: operatingBytes,
    seedFlag: 'flowme-integrated-standalone-a8-seeded',
  });
}

async function authorAndOpenFlow(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#template-picker-opener').click();
  await expect(page.locator('.template-choice')).toHaveCount(6);
  await expect(page.locator('#template-picker-panel')).toContainText('예:');
  await expect(page.locator('#flow-editor')).toHaveValue('');
  await applyStandaloneTemplate(page);
  const insertedTemplate = await page.locator('#flow-editor').inputValue();
  expect(insertedTemplate.length).toBeGreaterThan(0);
  await page.locator('#flow-editor').press('Control+z');
  await expect(page.locator('#flow-editor')).toHaveValue('');
  await page.locator('#flow-editor').press('Control+Shift+z');
  await expect(page.locator('#flow-editor')).toHaveValue(insertedTemplate);
  await page.locator('#flow-editor').press('Control+z');
  await expect(page.locator('#flow-editor')).toHaveValue('');
  await page.locator('#flow-editor').fill(VALID_SOURCE);
  const resultTab = page.locator('#authoring-tab-result');
  if (await resultTab.isVisible()) await resultTab.click();
  await expect(page.locator('#authoring-artifact-result')).toBeVisible();
  await page.locator('#commit-authoring').click();
  await expect(page.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toBeVisible();
  await page.locator('button[data-action="open-receipt-flow"]').click();
  await expect(page.getByRole('heading', { name: '휴대폰 검증 Flow' })).toBeVisible();
}

test('single-file standalone works from file URL and writes only its exact PoC keys', async ({ page }) => {
  test.setTimeout(60_000);
  const calls: Array<{ method: string; key?: string }> = [];
  const errors: string[] = [];
  const assetRequests: string[] = [];

  await page.exposeFunction(
    '__recordIntegratedStandaloneMutation',
    (entry: { method: string; key?: string }) => calls.push(entry),
  );
  await page.addInitScript(({ operatingSentinelKey, storageKey, draftStorageKey, seedFlag }) => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    if (window.name !== seedFlag) {
      originalRemove.call(window.localStorage, storageKey);
      originalRemove.call(window.localStorage, draftStorageKey);
      originalSet.call(window.localStorage, operatingSentinelKey, '  keep exact Android bytes  ');
      window.name = seedFlag;
    }
    type TestWindow = Window & typeof globalThis & {
      __recordIntegratedStandaloneMutation: (
        entry: { method: string; key?: string },
      ) => Promise<void>;
    };
    const testWindow = window as TestWindow;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (this === window.localStorage) {
        void testWindow.__recordIntegratedStandaloneMutation({ method: 'setItem', key });
      }
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      if (this === window.localStorage) {
        void testWindow.__recordIntegratedStandaloneMutation({ method: 'removeItem', key });
      }
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      if (this === window.localStorage) {
        void testWindow.__recordIntegratedStandaloneMutation({ method: 'clear' });
      }
      return originalClear.call(this);
    };
  }, {
    operatingSentinelKey: OPERATING_SENTINEL_KEY,
    storageKey: STORAGE_KEY,
    draftStorageKey: DRAFT_STORAGE_KEY,
    seedFlag: 'flowme-integrated-standalone-seeded',
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\.(?:css|js)(?:$|\?)/u.test(request.url())) assetRequests.push(request.url());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  const initialOrder = await page.locator('.task-row').evaluateAll((rows) => (
    rows.map((row) => row.getAttribute('data-task-id'))
  ));
  const secondTask = page.locator('.task-row').nth(1);
  const movedId = await secondTask.getAttribute('data-task-id');
  await secondTask.locator('button[data-action="task-menu"]').click();
  await page.locator('#move-panel button[data-action="move-up"]').click();
  expect(await page.locator('.task-row').first().getAttribute('data-task-id')).toBe(movedId);
  await page.locator('button[data-action="undo"]:visible').first().click();
  expect(await page.locator('.task-row').evaluateAll((rows) => (
    rows.map((row) => row.getAttribute('data-task-id'))
  ))).toEqual(initialOrder);
  await page.locator('button[data-view="folder:unfiled"]').click();
  await expect(page.locator('.flow-row')).toHaveCount(4);
  await authorAndOpenFlow(page);

  const resultSurface = page.getByTestId('standalone-result-surface');
  await expect(resultSurface).toBeVisible();
  const resultTabs = resultSurface.getByRole('tab');
  await expect(resultTabs).toHaveCount(4);
  const manifest = await resultSurface.getAttribute('data-result-item-refs');
  await resultTabs.first().focus();
  await resultTabs.first().press('End');
  await expect(resultTabs.last()).toBeFocused();
  await expect(resultSurface).toHaveAttribute('data-result-view', 'sheet');
  await resultTabs.last().press('Home');
  await expect(resultSurface.getByRole('tab').first()).toBeFocused();
  await expect(resultSurface).toHaveAttribute('data-result-view', 'txt');
  await resultSurface.getByRole('tab', { name: '할 일', exact: true }).click();
  await expect(resultSurface).toHaveAttribute('data-result-item-refs', manifest ?? '');
  const resultItem = resultSurface.locator('[data-action="result-open-item"]').first();
  const resultItemRef = await resultItem.getAttribute('data-item-ref');
  await resultItem.click();
  const itemDetail = page.getByTestId('standalone-item-detail');
  await expect(itemDetail).toHaveAttribute('data-product-plan-item-grammar', 'v1');
  await expect(itemDetail).toHaveAttribute('data-item-ref', resultItemRef ?? '');
  await page.locator('[data-action="close-item-detail"]').click();
  await expect(page.locator(`[data-item-ref="${resultItemRef}"][data-action="result-open-item"]`)).toBeFocused();

  const task = page.locator('.task-row').filter({ hasText: '전입 신고 준비' });
  await task.locator('button[data-action="toggle-complete"]').click();
  await expect(task).toHaveClass(/done/u);
  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect(task).not.toHaveClass(/done/u);

  await readStandaloneCheckpoint(page);
  const stateBeforeReload = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  expect(stateBeforeReload).not.toBeNull();
  await page.reload();
  await page.locator('button[data-view="folder:unfiled"]').click();
  await expect(page.locator('.flow-row')).toHaveCount(5);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(stateBeforeReload);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
  await readStandaloneCheckpoint(page);
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY),
  ).toBe('  keep exact Android bytes  ');
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY, DRAFT_STORAGE_KEY].includes(entry.key))).toEqual([]);
  expect(assetRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('authoring draft restores after reload and corrupt draft fails closed', async ({ page }) => {
  const operatingBytes = '  keep operating bytes exactly  ';
  await page.addInitScript(({ operatingSentinelKey, storageKey, draftStorageKey, seedFlag }) => {
    if (window.name === seedFlag) return;
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.setItem(operatingSentinelKey, '  keep operating bytes exactly  ');
    window.name = seedFlag;
  }, {
    operatingSentinelKey: OPERATING_SENTINEL_KEY,
    storageKey: STORAGE_KEY,
    draftStorageKey: DRAFT_STORAGE_KEY,
    seedFlag: 'flowme-integrated-draft-reload-seeded',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#template-picker-opener').click();
  await applyStandaloneTemplate(page);
  const scaffold = await page.locator('#flow-editor').inputValue();
  expect(scaffold.length).toBeGreaterThan(0);
  const storedDraft = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
  expect(storedDraft).not.toBeNull();

  await page.reload();
  await expect(page.getByRole('heading', { name: '새 Flow 만들기' })).toBeVisible();
  await expect(page.locator('#flow-editor')).toHaveValue(scaffold);
  await expect(page.locator('#source-confirmed')).toHaveCount(0);
  await expect(page.locator('#save-status')).toContainText('작성 중 초안 복원');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);

  const corruptDraft = '{not-valid-draft';
  await page.evaluate(({ key, bytes }) => window.localStorage.setItem(key, bytes), {
    key: DRAFT_STORAGE_KEY,
    bytes: corruptDraft,
  });
  const corruptStorage = await page.evaluate(() => Object.entries(window.localStorage).sort());
  const corruptCalls: StandaloneStorageMutation[] = [];
  await page.exposeFunction('__recordCorruptDraftMutation', (entry: StandaloneStorageMutation) => corruptCalls.push(entry));
  await page.addInitScript(() => {
    const target = window as typeof window & { __recordCorruptDraftMutation: (entry: { method: string; key?: string }) => Promise<void> };
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args: string[]) {
        if (this === window.localStorage) void target.__recordCorruptDraftMutation({ method, key: args[0] });
        return Reflect.apply(original, this, args);
      };
    }
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('손상된 작성 초안 차단');
  await page.locator('button[data-action="go-authoring"]').first().click();
  // K2-B quarantines the draft feature instead of mounting an empty writable editor.
  await expect(page.locator('#flow-editor')).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(corruptDraft);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(await page.evaluate(() => Object.entries(window.localStorage).sort())).toEqual(corruptStorage);
  expect(corruptCalls).toEqual([]);
});

test('P1 fixed result slots and trash lifecycle stay interactive, reload-safe, and PoC-only', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-02T03:00:00Z'));
  test.setTimeout(45_000);
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  const operatingBytes = '  keep P1 result and trash operating bytes  ';
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('[data-view="folder:unfiled"]').click();
  await page.locator('[data-action="open-flow"][data-id="moving"]').first().click();

  const result = page.getByTestId('standalone-result-surface');
  await expect(result.getByRole('tab')).toHaveText(['TXT', '할 일', '캘린더', '표']);
  const manifest = JSON.parse((await result.getAttribute('data-result-item-refs')) || '[]') as string[];
  await expect(result.locator('[data-copy-only="true"]')).toBeVisible();
  await expect(result.locator('[data-working-source-kind]')).toHaveCount(1);
  await result.getByRole('tab', { name: '할 일', exact: true }).click();
  expect(await result.locator('[data-action="result-open-item"]').evaluateAll((items) => items.map((item) => item.getAttribute('data-item-ref')))).toEqual(manifest);
  await result.getByRole('tab', { name: '캘린더', exact: true }).click();
  const calendar = result.locator('.result-calendar-month');
  const undatedRefs = JSON.parse((await calendar.getAttribute('data-undated-item-refs')) || '[]') as string[];
  expect(await result.locator('[data-action="result-open-item"]').evaluateAll((items) => items.map((item) => item.getAttribute('data-item-ref')))).toEqual(undatedRefs);
  await calendar.locator('[data-action="result-calendar-select"][data-date="2026-09-03"]').click();
  expect(new Set(await result.locator('[data-action="result-open-item"]').evaluateAll((items) => items.map((item) => item.getAttribute('data-item-ref'))))).toEqual(new Set(manifest));
  await result.getByRole('tab', { name: '표', exact: true }).click();
  expect(await result.locator('.result-sheet tbody tr').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-item-ref')))).toEqual(manifest);

  await result.getByRole('tab', { name: '할 일', exact: true }).click();
  await result.locator('[data-action="result-open-item"]').first().click();
  await page.locator('[data-action="task-menu"]').click();
  await page.locator('#move-panel [data-action="move-date-target"][data-date="2026-09-02"]').click();
  await page.locator('[data-action="close-item-detail"]').click();
  const effectiveRef = manifest[0];
  const effectiveDate = '2026-09-02';
  await expect(result.locator('[data-action="result-open-item"][data-item-ref="' + effectiveRef + '"]')).toHaveAttribute('data-effective-date', effectiveDate);
  await result.getByRole('tab', { name: '캘린더', exact: true }).click();
  await calendar.locator('[data-action="result-calendar-select"][data-date="' + effectiveDate + '"]').click();
  await expect(result.locator('[data-action="result-open-item"][data-item-ref="' + effectiveRef + '"]')).toHaveAttribute('data-effective-date', effectiveDate);
  await result.getByRole('tab', { name: '표', exact: true }).click();
  const effectiveSheetRow = result.locator('.result-sheet tbody tr[data-item-ref="' + effectiveRef + '"]');
  const sheetHeaders = await result.locator('.result-sheet thead th').allTextContents();
  expect(sheetHeaders).toContain('원 발생일');
  expect(sheetHeaders).toContain('실행 날짜');
  await expect(effectiveSheetRow.locator('td').nth(sheetHeaders.indexOf('원 발생일'))).toHaveText('미정');
  await expect(effectiveSheetRow.locator('td').nth(sheetHeaders.indexOf('실행 날짜'))).toHaveText(effectiveDate);

  await page.locator('[data-action="move-to-trash"][data-kind="flow"]').click();
  await expect(page.locator('.trash-row[data-trash-id="moving"]')).toBeVisible();
  const bytesAfterTrash = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await readStandaloneCheckpoint(page);
  await page.reload();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesAfterTrash);
  await page.locator('[data-view="trash"]').click();
  const trashRow = page.locator('.trash-row[data-trash-id="moving"]');
  await expect(trashRow).toBeVisible();
  await trashRow.locator('[data-action="restore-trash"]').click();
  await expect(trashRow).toHaveCount(0);
  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect(trashRow).toBeVisible();

  page.once('dialog', (dialog) => dialog.dismiss());
  await trashRow.locator('[data-action="permanent-delete"]').click();
  await expect(trashRow).toBeVisible();
  await expectSaveStatus(page, '영구 삭제를 취소했어요', 'noop');
  expect(calls.filter(entry => entry.method === 'clear' || (entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY, DRAFT_STORAGE_KEY].includes(entry.key)))).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  const deletionCallStart = calls.length;
  page.once('dialog', (dialog) => dialog.accept());
  await trashRow.locator('[data-action="permanent-delete"]').click();
  await expect(trashRow).toHaveCount(0);
  await expect(page.locator('button[data-action="undo"]:visible').first()).toBeDisabled();
  const bytesAfterPermanentDelete = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await page.reload();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesAfterPermanentDelete);
  await readStandaloneCheckpoint(page);
  const legacyAfterDeletion = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(legacyAfterDeletion).not.toBeNull();
  expect((await readStandaloneCheckpoint(page)).legacyBaseRaw).toBe(legacyAfterDeletion);
  await page.locator('[data-view="trash"]').click();
  await expect(page.locator('.trash-row[data-trash-id="moving"]')).toHaveCount(0);
  await expect(page.locator('button[data-action="undo"]:visible').first()).toBeDisabled();

  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  const deletionCalls = calls.slice(deletionCallStart);
  expect(deletionCalls.filter(entry => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY, STORAGE_KEY, 'flow:poc:personal-workspace:v1:source-candidates'].includes(entry.key))).toEqual([]);
  expect(deletionCalls.filter(entry => entry.key === WORKSPACE_STORAGE_KEY)).toHaveLength(1);
  expect(deletionCalls.filter(entry => entry.key === STORAGE_KEY)).toHaveLength(1);
  // This seed has no source-candidate sidecar: null -> null is not a write.
  expect(deletionCalls.filter(entry => entry.key === 'flow:poc:personal-workspace:v1:source-candidates')).toHaveLength(0);
  expect(await page.evaluate(key => localStorage.getItem(key), 'flow:poc:personal-workspace:v1:source-candidates')).toBeNull();
  expect(errors).toEqual([]);
});

const STANDALONE_PROPERTY_KEYS = {
  schedule: ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration'],
  execution: ['completion', 'condition', 'subcheck'],
  content: ['detail', 'resource'],
  provenance: ['repeat', 'repeatEnd', 'guide', 'caution', 'source'],
} as const;

async function chooseStandalonePropertyGroup(page: Page, group: keyof typeof STANDALONE_PROPERTY_KEYS) {
  const tray = page.locator('[data-authoring-property-tray]');
  if (await tray.count() === 0) await page.locator('[data-action="open-authoring-properties"]').first().click();
  for (let step = 0; step < 2 && await tray.getAttribute('data-chooser-stage') !== 'groups'; step++) {
    await tray.locator('[data-action="back-authoring-chooser"]').click();
  }
  await expect(tray).toHaveAttribute('data-chooser-stage', 'groups');
  await expect(tray.locator('.property-group-choice')).toHaveCount(4);
  await expect(tray.locator('.property-card')).toHaveCount(0);
  await tray.locator(`[data-action="choose-authoring-property-group"][data-group="${group}"]`).click();
  await expect(tray).toHaveAttribute('data-chooser-stage', 'properties');
}

test('P2-C property catalog keeps all 16 fields editable with inline, dependent batch, exact reentry, and zero-write cancel', async ({ page }) => {
  test.setTimeout(75_000);
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  const operatingBytes = '  keep P2-C authoring operating bytes  ';
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('[data-action="go-authoring"]').first().click();
  const source = [
    '# P2-C 작성',
    '- 기준일: 2026-09-20',
    '## 준비',
    '- [ ] 탑승 준비',
    '  - 시간: 09:00',
    '-[] 그대로 둘 줄',
    '-[] 고칠 줄',
  ].join('\n');
  await page.locator('#flow-editor').fill(source);
  await page.locator('#authoring-tab-result').click();
  await expect(page.locator('#authoring-artifact-result [role="tab"]')).toHaveText(['TXT', '할 일', '캘린더', '표']);
  await expect(page.locator('.authoring-working-source')).toContainText('원문 편집은 아래 결과에 즉시 반영됩니다.');
  await expect(page.locator('.authoring-working-source')).toContainText('개인 Flow 저장 뒤 shadow 수정은 원문으로 돌아오지 않습니다.');
  await page.locator('#authoring-review-opener').click();
  await expect(page.locator('[data-near-miss-id]')).toHaveCount(2);
  await page.locator('[data-action="open-authoring-properties"]').first().click();
  const tray = page.locator('[data-authoring-property-tray]');
  await expect(tray).toBeVisible();
  await expect(tray.locator('.property-boundary-copy')).toHaveText('적용하면 이 항목의 원문과 결과가 함께 바뀝니다.');
  await expect(tray.locator('.property-group-choice')).toHaveCount(4);
  await expect(tray.locator('.property-group-choice strong')).toHaveText(['일정', '실행', '내용', '더 보기']);

  const observedPropertyKeys: string[] = [];
  for (const group of Object.keys(STANDALONE_PROPERTY_KEYS) as Array<keyof typeof STANDALONE_PROPERTY_KEYS>) {
    const expectedKeys = STANDALONE_PROPERTY_KEYS[group];
    await chooseStandalonePropertyGroup(page, group);
    await expect(tray.locator('.property-card-list')).toHaveAttribute('data-property-group', group);
    await expect(tray.locator('.property-card')).toHaveCount(expectedKeys.length);
    await expect(tray.locator('.property-card[data-write-support="editable"]')).toHaveCount(expectedKeys.length);
    await expect(tray.locator('.property-card[data-write-support="blocked"]')).toHaveCount(0);
    const keys = await tray.locator('.property-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-property-key')!));
    expect(keys).toEqual(expectedKeys);
    observedPropertyKeys.push(...keys);
  }
  expect(observedPropertyKeys).toHaveLength(16);
  expect(new Set(observedPropertyKeys).size).toBe(16);

  await chooseStandalonePropertyGroup(page, 'schedule');
  const beforeInlineCancel = await page.locator('#flow-editor').inputValue();
  const callsBeforeInlineCancel = calls.length;
  await tray.locator('[data-action="edit-authoring-property"][data-key="duration"]').click();
  const inlineDuration = tray.locator('[data-authoring-inline-form][data-key="duration"]');
  await expect(inlineDuration).toBeVisible();
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
  expect(await inlineDuration.evaluate((element) => getComputedStyle(element).position)).toBe('static');
  await inlineDuration.locator('input[name="value"]').fill('45분');
  await inlineDuration.locator('[data-action="cancel-authoring-property"]').click();
  await expect(inlineDuration).toHaveCount(0);
  await expect(tray).toHaveAttribute('data-chooser-stage', 'properties');
  await expect(tray.locator('[data-action="edit-authoring-property"][data-key="duration"]')).toBeFocused();
  await expect(page.locator('#flow-editor')).toHaveValue(beforeInlineCancel);
  expect(calls).toHaveLength(callsBeforeInlineCancel);

  await tray.locator('[data-action="edit-authoring-property"][data-key="duration"]').click();
  await tray.locator('[data-authoring-inline-form][data-key="duration"] input[name="value"]').fill('30분');
  await tray.locator('[data-authoring-inline-form][data-key="duration"] button[type="submit"]').click();
  const afterDuration = await page.locator('#flow-editor').inputValue();
  expect(afterDuration).toContain('  - 시간: 09:00\n  - 소요 시간: 30분\n-[] 그대로 둘 줄');
  await expect(page.locator('#app')).toHaveAttribute('data-authoring-source-mutations', '1');

  await page.locator('#authoring-tab-result').click();
  await page.locator('#authoring-review-opener').click();
  const callsBeforeDependentCancel = calls.length;
  await chooseStandalonePropertyGroup(page, 'schedule');
  await tray.locator('[data-action="edit-authoring-property"][data-key="timezone"]').click();
  const timezoneForm = page.locator('[data-dialog-form="authoring-dependent-property"][data-dependent-kind="timezone"]');
  await expect(timezoneForm).toBeVisible();
  await expect(timezoneForm.locator('input[name="time"]')).toHaveValue('09:00');
  await timezoneForm.locator('input[name="timezone"]').fill('Asia/Seoul');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
  await expect(timezoneForm).toBeHidden();
  await expect(tray).toHaveAttribute('data-chooser-stage', 'properties');
  await expect(tray.locator('[data-action="edit-authoring-property"][data-key="timezone"]')).toBeFocused();
  await expect(page.locator('#flow-editor')).toHaveValue(afterDuration);
  await expect(page.locator('#app')).toHaveAttribute('data-authoring-source-mutations', '1');
  expect(calls).toHaveLength(callsBeforeDependentCancel);

  await tray.locator('[data-action="edit-authoring-property"][data-key="timezone"]').click();
  await timezoneForm.locator('input[name="time"]').fill('10:30');
  await timezoneForm.locator('input[name="timezone"]').fill('Asia/Seoul');
  await timezoneForm.locator('button[type="submit"]').click();
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
  const afterTimeZone = await page.locator('#flow-editor').inputValue();
  expect(afterTimeZone).toContain('  - 시간: 10:30\n  - 소요 시간: 30분\n  - 시간대: Asia/Seoul');
  await expect(page.locator('#app')).toHaveAttribute('data-authoring-source-mutations', '2');

  await page.locator('#authoring-tab-result').click();
  await page.locator('#authoring-review-opener').click();
  await chooseStandalonePropertyGroup(page, 'schedule');
  await tray.locator('.property-card[data-property-key="timezone"] [data-action="locate-authoring-property"]').click();
  await expect.poll(() => page.locator('#flow-editor').evaluate((editor) => {
    const textarea = editor as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  })).toBe('Asia/Seoul');

  await page.locator('#authoring-tab-result').click();
  await page.locator('#authoring-review-opener').click();
  await chooseStandalonePropertyGroup(page, 'execution');
  await tray.locator('[data-action="edit-authoring-property"][data-key="subcheck"]').click();
  const subcheckForm = tray.locator('[data-authoring-inline-form][data-key="subcheck"]');
  await subcheckForm.locator('input[name="value"]').fill('예약번호 확인');
  await subcheckForm.locator('button[type="submit"]').click();
  const afterSubcheck = await page.locator('#flow-editor').inputValue();
  expect(afterSubcheck).toContain('- [ ] 탑승 준비\n  - [ ] 예약번호 확인\n  - 시간: 10:30');
  await expect(page.locator('#app')).toHaveAttribute('data-authoring-source-mutations', '3');

  await page.locator('#authoring-tab-result').click();
  await page.locator('#authoring-review-opener').click();
  await chooseStandalonePropertyGroup(page, 'execution');
  const subcheckInstance = tray.locator('.property-card[data-property-key="subcheck"] [data-action="locate-authoring-property"]');
  await expect(subcheckInstance).toHaveCount(1);
  await expect(subcheckInstance).toHaveAttribute('data-property-source-line', /\d+/u);
  await subcheckInstance.click();
  await expect.poll(() => page.locator('#flow-editor').evaluate((editor) => {
    const textarea = editor as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  })).toBe('예약번호 확인');

  await page.locator('#authoring-tab-result').click();
  await page.locator('#authoring-review-opener').click();
  const bytesBeforeDismiss = await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY });
  const callsBeforeDismiss = calls.length;
  await page.locator('[data-action="dismiss-near-miss"]').first().click();
  expect(await page.locator('#flow-editor').inputValue()).toBe(afterSubcheck);
  expect(await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY })).toEqual(bytesBeforeDismiss);
  expect(calls).toHaveLength(callsBeforeDismiss);

  await page.locator('[data-action="repair-near-miss"]').first().click();
  await expect(page.locator('#app')).toHaveAttribute('data-authoring-source-mutations', '4');
  await expect(page.locator('#authoring-tab-input')).toHaveAttribute('aria-current', 'page');
  const editor = page.locator('#flow-editor');
  await editor.focus();
  await editor.press('Control+z');
  await expect(editor).toHaveValue(afterSubcheck);
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).rawText : null;
  }, DRAFT_STORAGE_KEY)).toBe(afterSubcheck);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![STORAGE_KEY, DRAFT_STORAGE_KEY].includes(entry.key))).toEqual([]);
  expect(errors).toEqual([]);
});

test('P2-C inline and dependent property surfaces stay operable and cancel without writes in five required viewports', async ({ browser }) => {
  test.setTimeout(120_000);
  const allErrors: string[] = [];
  const viewports = REQUIRED_VIEWPORTS.filter(({ label }) => label !== '320x700');

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const calls: StandaloneStorageMutation[] = [];
    const operatingBytes = `  keep P2-C viewport ${viewport.label} bytes  `;
    await installStandaloneA8StorageAudit(page, calls, operatingBytes);
    page.on('console', (message) => {
      if (message.type() === 'error') allErrors.push(`${viewport.label}: ${message.text()}`);
    });
    page.on('pageerror', (error) => allErrors.push(`${viewport.label}: ${error.message}`));

    await page.goto(HTML_URL);
    await page.locator('[data-action="go-authoring"]').first().click();
    const source = [
      `# ${viewport.label} 속성 검증`,
      '## 준비',
      '- [ ] 탑승 준비',
      '  - 시간: 09:00',
    ].join('\n');
    await page.locator('#flow-editor').fill(source);
    const resultTab = page.locator('#authoring-tab-result');
    if (await resultTab.isVisible()) await resultTab.click();
    await page.locator('#authoring-review-opener').click();
    await page.locator('[data-action="open-authoring-properties"]').first().click();

    const tray = page.locator('[data-authoring-property-tray]');
    await expect(tray.locator('.property-group-choice')).toHaveCount(4);
    await chooseStandalonePropertyGroup(page, 'schedule');
    await tray.locator('[data-action="edit-authoring-property"][data-key="duration"]').click();
    const inlineForm = tray.locator('[data-authoring-inline-form][data-key="duration"]');
    await inlineForm.scrollIntoViewIfNeeded();
    await expect(inlineForm).toBeVisible();
    expect(await inlineForm.evaluate((element) => getComputedStyle(element).position), `${viewport.label} inline position`).toBe('static');
    const inlineBox = await inlineForm.boundingBox();
    expect(inlineBox, `${viewport.label} inline box`).not.toBeNull();
    if (inlineBox) {
      expect(inlineBox.x, `${viewport.label} inline left`).toBeGreaterThanOrEqual(0);
      expect(inlineBox.x + inlineBox.width, `${viewport.label} inline right`).toBeLessThanOrEqual(viewport.width + 1);
    }
    const inlineCancel = inlineForm.locator('[data-action="cancel-authoring-property"]');
    await inlineCancel.scrollIntoViewIfNeeded();
    await inlineCancel.click({ trial: true });
    const callsBeforeInlineEscape = calls.length;
    await page.keyboard.press('Escape');
    await expect(inlineForm).toHaveCount(0);
    await expect(page.locator('#flow-editor')).toHaveValue(source);
    expect(calls, `${viewport.label} inline Escape writes`).toHaveLength(callsBeforeInlineEscape);

    await tray.locator('[data-action="edit-authoring-property"][data-key="timezone"]').click();
    const dependentForm = page.locator('[data-dialog-form="authoring-dependent-property"][data-dependent-kind="timezone"]');
    await expect(dependentForm).toBeVisible();
    await expect(dependentForm.locator('input[name="time"]')).toHaveValue('09:00');
    await expect(dependentForm.locator('input[name="timezone"]')).toBeVisible();
    const dialog = page.locator('#dialog');
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox, `${viewport.label} dependent dialog box`).not.toBeNull();
    if (dialogBox) {
      expect(dialogBox.x, `${viewport.label} dialog left`).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width, `${viewport.label} dialog right`).toBeLessThanOrEqual(viewport.width + 1);
      expect(dialogBox.y, `${viewport.label} dialog top`).toBeGreaterThanOrEqual(0);
      expect(dialogBox.y + dialogBox.height, `${viewport.label} dialog bottom`).toBeLessThanOrEqual(viewport.height + 1);
    }
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth), `${viewport.label} dialog horizontal overflow`).toBeLessThanOrEqual(1);
    const dependentCancel = dependentForm.locator('[data-action="close-dialog"]');
    await dependentCancel.scrollIntoViewIfNeeded();
    await dependentCancel.click({ trial: true });
    const callsBeforeDependentEscape = calls.length;
    await page.keyboard.press('Escape');
    await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
    await expect(dependentForm).toBeHidden();
    await expect(page.locator('#flow-editor')).toHaveValue(source);
    expect(calls, `${viewport.label} dependent Escape writes`).toHaveLength(callsBeforeDependentEscape);

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
    expect(calls.filter((entry) => entry.method === 'clear'), `${viewport.label} clear calls`).toEqual([]);
    expect(calls.filter((entry) => entry.key && ![STORAGE_KEY, DRAFT_STORAGE_KEY].includes(entry.key)), `${viewport.label} outside-prefix writes`).toEqual([]);
    await context.close();
  }

  expect(allErrors).toEqual([]);
});

test('authoring template, optional review, and save action stay operable across compact and desktop viewports', async ({ browser }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  for (const viewport of [
    { label: '320x700', width: 320, height: 700 },
    { label: '375x812', width: 375, height: 812 },
    { label: '390x844', width: 390, height: 844 },
    { label: '844x390', width: 844, height: 390 },
    { label: '1024x768', width: 1024, height: 768 },
    { label: '1440x900', width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${viewport.label}: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${viewport.label}: ${error.message}`));
    await page.goto(HTML_URL);
    await page.locator('button[data-action="go-authoring"]').first().click();
    await expect(page.locator('.product-nav button[data-action="go-authoring"]')).toHaveAttribute('aria-current', 'page');
    if (viewport.height <= 500 && viewport.width < 1024) {
      await expect(page.locator('#flow-editor')).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: '새 Flow 만들기' })).toBeVisible();
    }
    await expect(page.locator('#source-confirmed')).toHaveCount(0);
    await expect(page.locator('.authoring-steps')).toHaveCount(0);

    await page.locator('#template-picker-opener').click();
    await expect(page.locator('.template-option')).toHaveCount(6);
    await expect(page.locator('.template-example')).toHaveCount(1);
    await expect(page.locator('.template-example')).toBeVisible();
    await expect(page.locator('.template-example')).toHaveAttribute('role', 'region');
    await expect(page.locator('.template-example')).toHaveAttribute('aria-labelledby', 'template-example-label');
    await expect(page.locator('.template-example')).not.toHaveAttribute('aria-live', /.+/u);
    await expect(page.locator('#template-example-label')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#flow-editor')).toHaveValue('');
    const templateAction = page.locator('button[data-action="select-template"]').first();
    await templateAction.focus();
    await expect(templateAction).toBeFocused();
    await expect(page.locator('#template-example-source')).toHaveText(findPersonalWorkspacePocStructureTemplatePreview(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0].templateId)!.expectedRawText);
    await templateAction.press('ArrowRight');
    const secondTemplateAction = page.locator('button[data-action="select-template"]').nth(1);
    await expect(secondTemplateAction).toBeFocused();
    await expect(secondTemplateAction).toHaveAttribute('data-preview-active', 'true');
    await expect(page.locator('#template-example-source')).toHaveText(findPersonalWorkspacePocStructureTemplatePreview(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[1].templateId)!.expectedRawText);
    await templateAction.focus();
    await expect(page.locator('#template-example-source')).toHaveText(findPersonalWorkspacePocStructureTemplatePreview(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0].templateId)!.expectedRawText);
    const templateBox = await templateAction.boundingBox();
    expect(templateBox, `${viewport.label} template target`).not.toBeNull();
    if (templateBox) expect(templateBox.height).toBeGreaterThanOrEqual(48);
    if (viewport.label === '390x844' || viewport.label === '1024x768') {
      await page.screenshot({
        path: path.join(
          process.cwd(),
          'docs',
          'content-audit',
          '2026-09-03-flowme-integrated-poc-product-ux-validation-report-assets',
          `after-standalone-${viewport.label}.png`,
        ),
      });
    }
    await applyStandaloneTemplate(page);
    const scaffold = await page.locator('#flow-editor').inputValue();
    expect(scaffold).not.toContain('4주 운동 적응');
    await page.locator('#flow-editor').press('Control+z');
    await expect(page.locator('#flow-editor')).toHaveValue('');
    await page.locator('#flow-editor').fill(VALID_SOURCE);

    const resultTab = page.locator('#authoring-tab-result');
    if (await resultTab.isVisible()) await resultTab.click();
    await expect(page.locator('#authoring-artifact-result')).toBeVisible();
    const reviewOpener = page.locator('#authoring-review-opener');
    await reviewOpener.click();
    await expect(page.locator('#authoring-review')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#authoring-review')).toBeHidden();

    const saveAction = page.locator('#commit-authoring');
    const dismissToast = page.locator('#toast:not([hidden]) [data-action="dismiss-toast"]');
    if (await dismissToast.isVisible()) await dismissToast.click();
    await saveAction.scrollIntoViewIfNeeded();
    await expect(saveAction).toBeVisible();
    await expect(saveAction).toBeEnabled();
    await saveAction.click({ trial: true, timeout: 7_000 });
    const saveBox = await saveAction.boundingBox();
    expect(saveBox, `${viewport.label} save hit target`).not.toBeNull();
    if (saveBox) expect(saveBox.height, `${viewport.label} save height`).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);
    await context.close();
  }
  expect(errors).toEqual([]);
});

test('inline blank examples and native template Undo preserve the textarea bytes across six viewports', async ({ browser }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const ghostSource = [
    '# ',
    '- 기준일: ',
    '',
    '## ',
    '- [ ] ',
    '  - [ ] ',
    '  - 상대 날짜: ',
    '  - 날짜: ',
    '  - 장소: ',
    '  - 자료: ',
    '  - 완료 기준: ',
    ...Array.from({ length: 32 }, (_, index) => `일반 메모 ${index + 1}`),
    '',
  ].join('\n');
  const viewports = [
    { label: '320x700', width: 320, height: 700 },
    { label: '375x812', width: 375, height: 812 },
    { label: '390x844', width: 390, height: 844 },
    { label: '844x390', width: 844, height: 390 },
    { label: '1024x768', width: 1024, height: 768 },
    { label: '1440x900', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${viewport.label}: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${viewport.label}: ${error.message}`));
    await page.goto(HTML_URL);
    await page.locator('button[data-action="go-authoring"]').first().click();

    const editor = page.locator('#flow-editor');
    await page.locator('#template-picker-opener').click();
    await applyStandaloneTemplate(page);
    const scaffold = await editor.inputValue();
    expect(scaffold.length, `${viewport.label} native scaffold`).toBeGreaterThan(0);
    const templateDraft = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(templateDraft, `${viewport.label} no manual history in draft`).not.toContain('templateEditHistory');
    await editor.press('Control+z');
    await expect(editor).toHaveValue('');
    await editor.press('Control+Shift+z');
    await expect(editor).toHaveValue(scaffold);
    await editor.press('Control+z');
    await expect(editor).toHaveValue('');

    await editor.fill(ghostSource);
    await expect(page.locator('.authoring-ghost')).toHaveCount(10);
    await expect(page.locator('#authoring-ghost-overlay')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#authoring-ghost-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.authoring-ghost').allTextContents()).toEqual([
      '예: 8월 제주 여행 준비',
      '예: 2026-09-02',
      '예: 예약',
      '예: 항공권 확인',
      '예: 예약번호 확인',
      '예: D-7',
      '예: 2026-09-02',
      '예: 김포공항',
      '예: https://example.com',
      '예: 예약번호를 메모에 남김',
    ]);

    const crlfRoundTrip = await page.evaluate(() => {
      const source = '# \r\n## \r\n- [ ] \r\n';
      const model = (window as Window & typeof globalThis & {
        FlowMeIntegratedPoc: { authoringGhostLines: (value: string) => Array<{ rawLine: string; terminator: string }> };
      }).FlowMeIntegratedPoc;
      return model.authoringGhostLines(source).map((line) => line.rawLine + line.terminator).join('');
    });
    expect(crlfRoundTrip, `${viewport.label} CRLF round-trip`).toBe('# \r\n## \r\n- [ ] \r\n');

    await editor.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(0, 6, 'forward');
      textarea.scrollTop = 96;
      textarea.dispatchEvent(new Event('scroll'));
      (window as Window & typeof globalThis & { __standaloneCopiedSource?: string }).__standaloneCopiedSource = '';
      textarea.addEventListener('copy', () => {
        (window as Window & typeof globalThis & { __standaloneCopiedSource?: string }).__standaloneCopiedSource = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
      }, { once: true });
    });
    await editor.press('Control+c');
    const beforeToggle = await page.evaluate((draftKey) => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#flow-editor')!;
      return {
        value: textarea.value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
        selectionDirection: textarea.selectionDirection,
        scrollTop: textarea.scrollTop,
        scrollLeft: textarea.scrollLeft,
        draft: window.localStorage.getItem(draftKey),
        copied: (window as Window & typeof globalThis & { __standaloneCopiedSource?: string }).__standaloneCopiedSource,
        transform: (document.querySelector<HTMLElement>('#authoring-ghost-scroll')!).style.transform,
      };
    }, DRAFT_STORAGE_KEY);
    expect(beforeToggle.copied, `${viewport.label} native copy source`).toBe(ghostSource.slice(0, 6));
    expect(beforeToggle.scrollTop, `${viewport.label} editor scroll`).toBeGreaterThan(0);
    expect(beforeToggle.transform, `${viewport.label} ghost scroll sync`).toBe(`translate(${-beforeToggle.scrollLeft}px, ${-beforeToggle.scrollTop}px)`);

    const ghostToggle = page.locator('#authoring-ghost-toggle');
    await ghostToggle.click();
    await expect(ghostToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.authoring-ghost')).toHaveCount(0);
    const afterOff = await editor.evaluate((textarea) => ({
      value: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
      selectionDirection: textarea.selectionDirection,
      scrollTop: textarea.scrollTop,
      scrollLeft: textarea.scrollLeft,
    }));
    expect(afterOff, `${viewport.label} toggle-off textarea state`).toEqual({
      value: beforeToggle.value,
      selectionStart: beforeToggle.selectionStart,
      selectionEnd: beforeToggle.selectionEnd,
      selectionDirection: beforeToggle.selectionDirection,
      scrollTop: beforeToggle.scrollTop,
      scrollLeft: beforeToggle.scrollLeft,
    });
    expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY), `${viewport.label} toggle-off draft`).toBe(beforeToggle.draft);

    await ghostToggle.click();
    await expect(ghostToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.authoring-ghost')).toHaveCount(10);
    await ghostToggle.focus();
    await expect(ghostToggle).toBeFocused();
    await ghostToggle.press('Space');
    await expect(ghostToggle).toHaveAttribute('aria-pressed', 'false');
    await ghostToggle.press('Enter');
    await expect(ghostToggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY), `${viewport.label} keyboard toggle draft`).toBe(beforeToggle.draft);
    await editor.focus();
    await editor.evaluate((textarea) => textarea.setSelectionRange(2, 2));
    await editor.press('X');
    const editedSource = await editor.inputValue();
    expect(editedSource).not.toBe(ghostSource);
    await ghostToggle.click();
    await ghostToggle.click();
    await editor.press('Control+z');
    await expect(editor).toHaveValue(ghostSource);

    const frame = page.locator('#flow-editor-frame');
    const geometry = await frame.evaluate((element) => {
      const frameRect = element.getBoundingClientRect();
      const textareaRect = element.querySelector('textarea')!.getBoundingClientRect();
      const overlayRect = element.querySelector<HTMLElement>('#authoring-ghost-overlay')!.getBoundingClientRect();
      return {
        frame: { left: frameRect.left, right: frameRect.right, top: frameRect.top, bottom: frameRect.bottom },
        textarea: { left: textareaRect.left, right: textareaRect.right, top: textareaRect.top, bottom: textareaRect.bottom },
        overlay: { left: overlayRect.left, right: overlayRect.right, top: overlayRect.top, bottom: overlayRect.bottom },
      };
    });
    expect(geometry.overlay, `${viewport.label} overlay geometry`).toEqual(geometry.textarea);
    expect(geometry.textarea.left, `${viewport.label} editor left`).toBeGreaterThanOrEqual(geometry.frame.left);
    expect(geometry.textarea.right, `${viewport.label} editor right`).toBeLessThanOrEqual(geometry.frame.right);

    const resultAction = page.locator('.authoring-input-actions .primary:visible, #commit-authoring:visible').first();
    const dismissToast = page.locator('#toast:not([hidden]) [data-action="dismiss-toast"]');
    if (await dismissToast.isVisible()) await dismissToast.click();
    await resultAction.scrollIntoViewIfNeeded();
    await expect(resultAction).toBeVisible();
    if (await resultAction.isEnabled()) {
      await resultAction.click({ trial: true, timeout: 7_000 });
    } else {
      await expect(resultAction).toBeDisabled();
    }
    const resultActionBox = await resultAction.boundingBox();
    expect(resultActionBox, `${viewport.label} result CTA target`).not.toBeNull();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ), `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);
    await context.close();
  }
  expect(errors).toEqual([]);
});

test('template insertion fails closed when the native browser transaction is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#template-picker-opener').click();
  const beforeDraft = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
  await page.evaluate(() => {
    document.execCommand = () => false;
  });
  await applyStandaloneTemplate(page, 0, false);
  await expect(page.locator('#flow-editor')).toHaveValue('');
  await expectSaveStatus(page, '작성 틀을 넣지 못했어요.', 'error');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(beforeDraft);
});

test('authoring commit rolls state and draft back together when exact draft cleanup fails', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#flow-editor').fill(VALID_SOURCE);
  const draftBefore = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
  const stateBefore = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  const legacyBefore = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(draftBefore).not.toBeNull();
  await page.evaluate((draftKey) => {
    const originalRemove = Storage.prototype.removeItem;
    let failOnce = true;
    Storage.prototype.removeItem = function failDraftCleanup(key: string) {
      if (this === window.localStorage && key === draftKey && failOnce) {
        failOnce = false;
        throw new Error('forced-draft-cleanup-failure');
      }
      return originalRemove.call(this, key);
    };
  }, DRAFT_STORAGE_KEY);
  const resultTab = page.locator('#authoring-tab-result');
  if (await resultTab.isVisible()) await resultTab.click();
  await page.locator('#commit-authoring').click();
  await expect(page.getByTestId('workspace-storage-gate')).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('저장 상태 확인 필요');
  await expect(page.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toHaveCount(0);
  await expectSuccessfulMutationCount(page, 0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(legacyBefore);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(draftBefore);
  const prepared = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), WORKSPACE_RECOVERY_KEY);
  expect(prepared.contract).toBe('flowme-workspace-action-journal-v2');
  expect(prepared.phase).toBe('prepared');
  expect(prepared.operation).toBe('authoring-handoff');
  expect(prepared.entries.map((entry: { key: string }) => entry.key)).toEqual([WORKSPACE_STORAGE_KEY, DRAFT_STORAGE_KEY]);
  expect(prepared.entries.map((entry: { beforeRaw: string | null }) => entry.beforeRaw)).toEqual([stateBefore, draftBefore]);
  const interruptedBytes = await page.evaluate(() => Object.entries(localStorage).sort());
  await page.reload();
  await expect(page.getByTestId('workspace-storage-gate')).toBeVisible();
  expect(await page.evaluate(() => Object.entries(localStorage).sort())).toEqual(interruptedBytes);
  await page.locator('[data-action="workspace-recover-storage"]').click();
  await expect(page.getByTestId('workspace-storage-gate')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(stateBefore);
  expect(await page.evaluate(key => localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(draftBefore);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(legacyBefore);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
});

test('same source retry opens the existing Flow, preserves the retried draft with zero writes, and adds no duplicate', async ({ page }) => {
  const calls: StandaloneStorageMutation[] = [];
  const operatingBytes = '  same-source retry operating bytes  ';
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#flow-editor').fill(VALID_SOURCE);
  await page.locator('#authoring-tab-result').click();
  await page.locator('#commit-authoring').click();
  await expect(page.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toBeVisible();
  const legacyBytes = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  const firstStateBytes = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  const firstAuthoredCount = (await readStandaloneCheckpoint(page)).state.flows.filter((flow: { origin: string }) => flow.origin === 'authoring-handoff').length;
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBeNull();

  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#flow-editor').fill(VALID_SOURCE);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).not.toBeNull();
  await page.locator('#authoring-tab-result').click();
  const retryDraftBytes = await page.evaluate(key => localStorage.getItem(key), DRAFT_STORAGE_KEY);
  await page.waitForTimeout(25);
  calls.length = 0;
  await page.locator('#commit-authoring').click();

  await expect(page.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toBeVisible();
  await expect(page.locator('.receipt-actions button')).toHaveCount(1);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(firstStateBytes);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(legacyBytes);
  // K2B caller-switch C3-08 explicitly corrects duplicate handoff to a read-only
  // existing-copy result: do not write a draft-only cleanup transaction.
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(retryDraftBytes);
  await expect(page.locator('#save-status')).toContainText('작성 초안은 그대로 두었습니다');
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls).toEqual([]);
  expect((await readStandaloneCheckpoint(page)).state.flows.filter((flow: { origin: string }) => flow.origin === 'authoring-handoff').length).toBe(firstAuthoredCount);
});

test('dedicated 48px drag handle and menu or keyboard use the same scoped order transition', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-02T03:00:00Z'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  const rows = await standaloneUntimedSeedRows(page);
  const originalOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  const first = rows.first();
  const second = rows.nth(1);
  expect(await first.getAttribute('draggable')).toBeNull();
  const handle = second.locator('.drag-handle');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  if (handleBox) {
    expect(handleBox.width).toBeGreaterThanOrEqual(48);
    expect(handleBox.height).toBeGreaterThanOrEqual(48);
  }

  const firstBox = await first.boundingBox();
  expect(firstBox).not.toBeNull();
  if (!firstBox) return;
  await handle.dragTo(first, {
    targetPosition: { x: firstBox.width - 12, y: firstBox.height * 0.25 },
  });
  const draggedOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  expect(draggedOrder).toEqual([originalOrder[1], originalOrder[0], ...originalOrder.slice(2)]);
  const dragStoredOrder = (await readStandaloneCheckpoint(page)).state.timelineContextV1.records;
  expect(dragStoredOrder).toHaveLength(1);
  expect(dragStoredOrder[0].contextKey).toBe('2026-09-02');

  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect(rows.first()).toHaveAttribute('data-task-id', originalOrder[0] || '');
  // The contextual Undo returns to the move owner. Close it before beginning a
  // fresh keyboard transaction, rather than reusing its pre-Undo order ticket.
  await page.keyboard.press('Escape');
  await expect(page.locator('#move-panel')).not.toBeVisible();
  await rows.nth(1).focus();
  await rows.nth(1).press('Alt+ArrowUp');
  await expect.poll(() => rows.evaluateAll(entries => entries.map(entry => entry.getAttribute('data-task-id')))).toEqual(draggedOrder);
  const keyboardOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  expect(keyboardOrder).toEqual(draggedOrder);
  const keyboardStoredOrder = (await readStandaloneCheckpoint(page)).state.timelineContextV1.records;
  expect(keyboardStoredOrder[0].orderedRefKeys).toEqual(dragStoredOrder[0].orderedRefKeys);
  await expect(page.locator('.task-row').first()).toHaveAttribute('data-task-id', 'meeting');

  const bytesBeforeCanceledDrop = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  const currentHandle = rows.nth(1).locator('.drag-handle');
  await currentHandle.dispatchEvent('dragstart');
  await expect(rows.nth(1)).toHaveClass(/dragging/u);
  await rows.first().dispatchEvent('dragover');
  await expect(rows.first()).toHaveClass(/drop-target/u);
  await page.locator('body').dispatchEvent('drop');
  await expect(page.locator('.dragging,.drop-target')).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesBeforeCanceledDrop);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await expectSaveStatus(page, '이동을 취소했어요.', 'noop');
});

test('mouse drag exposes its list corridor and 3px before or after insertion line without saving an outside drop', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-02T03:00:00Z'));
  test.setTimeout(30_000);
  const operatingBytes = '  keep A8 corridor operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto(HTML_URL);

  const rows = await standaloneUntimedSeedRows(page);
  const list = page.locator('.task-list').first();
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#save-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('#save-status')).toHaveAttribute('aria-live', 'polite');
  const stateBytesBeforeDrag = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  const draftBytesBeforeDrag = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
  const sourceRow = rows.nth(1);
  const sourceHandle = sourceRow.locator('.drag-handle');
  await sourceHandle.scrollIntoViewIfNeeded();
  const sourceBox = await sourceHandle.boundingBox();
  const target = rows.first();
  expect(sourceBox).not.toBeNull();
  if (!sourceBox) return;

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 14, sourceBox.y + sourceBox.height / 2 + 4, { steps: 5 });
  await expect(list).toHaveClass(/reorder-corridor/u);
  await expect(sourceRow).toHaveClass(/dragging/u);

  await page.mouse.move(195, 250, { steps: 4 });
  await page.waitForTimeout(50);
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  if (!targetBox) return;
  expect(targetBox.y).toBeGreaterThanOrEqual(0);
  expect(targetBox.y + targetBox.height).toBeLessThanOrEqual(500);
  const targetX = targetBox.x + targetBox.width - 12;
  await page.mouse.move(targetX, targetBox.y + targetBox.height * 0.25, { steps: 6 });
  await expect(target).toHaveClass(/drop-before/u);
  await expect(target).toHaveAttribute('data-drop-position', 'before');
  const beforeLine = await target.evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return { content: style.content, height: style.height };
  });
  expect(beforeLine.content).not.toBe('none');
  expect(beforeLine.height).toBe('3px');
  const targetTitle = (await target.locator('.task-title').textContent())?.trim() ?? '';
  await expect(page.locator('#save-status')).toContainText(`${targetTitle} 앞에 놓기 · 아직 저장 안 됨`);

  await page.mouse.move(targetX, targetBox.y + targetBox.height * 0.75, { steps: 6 });
  await expect(target).toHaveClass(/drop-after/u);
  await expect(target).toHaveAttribute('data-drop-position', 'after');
  const afterLine = await target.evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    return { content: style.content, height: style.height };
  });
  expect(afterLine.content).not.toBe('none');
  expect(afterLine.height).toBe('3px');
  await expect(page.locator('#save-status')).toContainText(`${targetTitle} 뒤에 놓기 · 아직 저장 안 됨`);

  await page.mouse.move(4, 4, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.dragging,.drop-target,.drop-before,.drop-after,.reorder-corridor')).toHaveCount(0);
  await expectSaveStatus(page, '이동을 취소했어요.', 'noop');
  await expectSuccessfulMutationCount(page, 0);
  await page.waitForTimeout(50);
  expect(calls).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(stateBytesBeforeDrag);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(draftBytesBeforeDrag);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('edge-held mouse drag scrolls; browser drop moves the originally offscreen task and Undo restores it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-02T03:00:00Z'));
  test.setTimeout(30_000);
  const operatingBytes = '  keep A8 edge-scroll operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  await page.setViewportSize({ width: 390, height: 360 });
  await page.goto(HTML_URL);

  const rows = await standaloneUntimedSeedRows(page);
  const list = page.locator('.task-list').first();
  await expect(rows).toHaveCount(3);
  const initialOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  const sourceHandle = rows.first().locator('.drag-handle');
  await sourceHandle.scrollIntoViewIfNeeded();
  // Position the actual source in view without centering the last target into
  // view as scrollIntoView does for this three-untimed-row context.
  const lastCenteredBox = await rows.last().boundingBox();
  if (lastCenteredBox && lastCenteredBox.y < 360) await page.evaluate(delta => window.scrollBy(0, delta), lastCenteredBox.y - 370);
  const lastBeforeScroll = await rows.last().boundingBox();
  expect(lastBeforeScroll).not.toBeNull();
  if (lastBeforeScroll) expect(lastBeforeScroll.y).toBeGreaterThanOrEqual(360);
  const sourceBox = await sourceHandle.boundingBox();
  expect(sourceBox).not.toBeNull();
  if (!sourceBox) return;
  const scrollBeforeEdgeHold = await page.evaluate(() => window.scrollY);
  expect(await page.evaluate(() => (
    window.scrollY < document.documentElement.scrollHeight - window.innerHeight
  ))).toBe(true);

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 14, sourceBox.y + sourceBox.height / 2 + 4, { steps: 5 });
  await expect(list).toHaveClass(/reorder-corridor/u);
  await page.mouse.move(Math.min(280, sourceBox.x + sourceBox.width / 2), 356, { steps: 10 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBeforeEdgeHold + 20);
  await expect.poll(async () => {
    const box = await rows.last().boundingBox();
    return Boolean(box && box.y + box.height / 2 < 356 && box.y + box.height > 0);
  }).toBe(true);

  await page.mouse.move(195, 180, { steps: 4 });
  await page.waitForTimeout(50);
  const lastTarget = rows.last();
  const lastTargetBox = await lastTarget.boundingBox();
  expect(lastTargetBox).not.toBeNull();
  if (!lastTargetBox) return;
  const lastTargetAfterX = lastTargetBox.x + lastTargetBox.width / 2;
  const lastTargetAfterY = Math.min(lastTargetBox.y + lastTargetBox.height - 4, 354);
  expect(lastTargetAfterY).toBeGreaterThan(lastTargetBox.y + lastTargetBox.height / 2);
  await lastTarget.dispatchEvent('dragover', {
    clientX: lastTargetAfterX,
    clientY: lastTargetAfterY,
  });
  await expect(lastTarget).toHaveClass(/drop-after/u);
  await expect(lastTarget).toHaveAttribute('data-drop-position', 'after');
  await lastTarget.dispatchEvent('drop', {
    clientX: lastTargetAfterX,
    clientY: lastTargetAfterY,
  });
  await page.mouse.up();

  const reordered = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  expect(reordered).toEqual([...initialOrder.slice(1), initialOrder[0]]);
  await expectSuccessfulMutationCount(page, 1);
  await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY].includes(entry.key))).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await readStandaloneCheckpoint(page);
  await expect(page.locator('.task-row').first()).toHaveAttribute('data-task-id', 'meeting');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);

  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect.poll(async () => rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id'))))
    .toEqual(initialOrder);
  await expectSuccessfulMutationCount(page, 2);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('move menu sends one task to the bottom or top through one write and keeps boundary actions inert', async ({ page }) => {
  test.setTimeout(30_000);
  const operatingBytes = '  keep A9 edge-order operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  const legacyBefore = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const transactionCalls = [
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'setItem', key: WORKSPACE_STORAGE_KEY },
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'removeItem', key: WORKSPACE_RECOVERY_KEY },
  ];
  const expectTransactions = async (count: number) => {
    await expect.poll(() => calls.slice()).toEqual(Array.from({ length: count }, () => transactionCalls).flat());
    expect(calls.filter(entry => entry.method === 'setItem' && entry.key === WORKSPACE_STORAGE_KEY)).toHaveLength(count);
    expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
    expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(legacyBefore);
    await readStandaloneCheckpoint(page);
  };

  const rows = page.locator('.task-row');
  const initialOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  const movedId = initialOrder[1] || '';
  await rows.nth(1).locator('button[data-action="task-menu"]').click();
  await expect(page.locator('#move-panel button[data-action="move-top"]')).toBeEnabled();
  await expect(page.locator('#move-panel button[data-action="move-bottom"]')).toBeEnabled();
  await page.locator('#move-panel button[data-action="move-bottom"]').click();
  await expect.poll(async () => rows.last().getAttribute('data-task-id')).toBe(movedId);
  await expectSuccessfulMutationCount(page, 1);
  await expectTransactions(1);

  await rows.last().locator('button[data-action="task-menu"]').click();
  await expect(page.locator('#move-panel button[data-action="move-bottom"]')).toBeDisabled();
  const bytesAtBottom = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();
  await expectTransactions(1);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesAtBottom);

  await rows.last().locator('button[data-action="task-menu"]').click();
  await page.locator('#move-panel button[data-action="move-top"]').click();
  await expect.poll(async () => rows.first().getAttribute('data-task-id')).toBe(movedId);
  await expectSuccessfulMutationCount(page, 2);
  await expectTransactions(2);

  await rows.first().locator('button[data-action="task-menu"]').click();
  await expect(page.locator('#move-panel button[data-action="move-top"]')).toBeDisabled();
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();
  await expectTransactions(2);

  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect.poll(async () => rows.last().getAttribute('data-task-id')).toBe(movedId);
  await expectSuccessfulMutationCount(page, 3);
  await expectTransactions(3);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY].includes(entry.key))).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('active drag pointer cancel clears insertion state, RAF scrolling and one synthetic click with zero writes', async ({ page }) => {
  test.setTimeout(30_000);
  const operatingBytes = '  keep A9 pointer-cancel operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  await page.setViewportSize({ width: 390, height: 360 });
  await page.goto(HTML_URL);

  const rows = page.locator('.task-row');
  const list = page.locator('.task-list').first();
  const handle = rows.first().locator('.drag-handle');
  await handle.scrollIntoViewIfNeeded();
  const stateBytes = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  const draftBytes = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY);
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await handle.dispatchEvent('dragstart');
  await expect(list).toHaveClass(/reorder-corridor/u);
  await rows.first().dispatchEvent('dragover', { clientX: 195, clientY: 359 });
  await expect(rows.first()).toHaveAttribute('data-drop-position');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);

  await handle.dispatchEvent('pointercancel', {
    pointerId: 91,
    pointerType: 'mouse',
    button: 0,
    clientX: 195,
    clientY: 359,
    isPrimary: true,
  });
  await expect(page.locator('.dragging,.drop-target,.drop-before,.drop-after,.reorder-corridor')).toHaveCount(0);
  await expect(page.locator('[data-drop-position]')).toHaveCount(0);
  await expectSaveStatus(page, '이동을 취소했어요.', 'noop');
  const scrollAfterCancel = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollAfterCancel);
  expect(calls).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(stateBytes);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_STORAGE_KEY)).toBe(draftBytes);

  await expect(page.locator('#move-panel')).toBeVisible();
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();
  await handle.dispatchEvent('click');
  await expect(page.locator('#move-panel')).not.toBeVisible();
  await handle.click();
  await expect(page.locator('#move-panel')).toBeVisible();
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();
  expect(calls).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('844x390 month expands exactly 28 empty dates and every date can create a dated QuickItem', async ({ page }) => {
  test.setTimeout(45_000);
  const operatingBytes = '  keep A9 month operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  await page.exposeFunction('__recordStandaloneA9MonthMutation', (entry: StandaloneStorageMutation) => calls.push(entry));
  await page.addInitScript(({ operatingSentinelKey, storageKey, draftStorageKey, sentinelBytes, seedFlag }) => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    if (window.name !== seedFlag) {
      originalRemove.call(window.localStorage, storageKey);
      originalRemove.call(window.localStorage, draftStorageKey);
      originalSet.call(window.localStorage, operatingSentinelKey, sentinelBytes);
      window.name = seedFlag;
    }
    type AuditWindow = Window & typeof globalThis & {
      __recordStandaloneA9MonthMutation: (entry: StandaloneStorageMutation) => Promise<void>;
    };
    const auditWindow = window as AuditWindow;
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) void auditWindow.__recordStandaloneA9MonthMutation({ method: 'setItem', key });
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) void auditWindow.__recordStandaloneA9MonthMutation({ method: 'removeItem', key });
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) void auditWindow.__recordStandaloneA9MonthMutation({ method: 'clear' });
      return originalClear.call(this);
    };
  }, {
    operatingSentinelKey: OPERATING_SENTINEL_KEY,
    storageKey: STORAGE_KEY,
    draftStorageKey: DRAFT_STORAGE_KEY,
    sentinelBytes: operatingBytes,
    seedFlag: 'flowme-integrated-standalone-a9-month-seeded',
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(HTML_URL);

  // Build validated legacy INPUT, then let the real boot reader project v2.
  // Mutating a persisted v2 .state alone would invalidate its timeline context.
  const legacyInput = await page.evaluate(({ key, targetKey, today, tomorrow }) => {
    const apis = window as unknown as {
      FlowMeIntegratedPoc: { initialEnvelope: () => { state: { tasks: { date: string | null }[]; orders: object } }; validate: (state: unknown) => string[] };
      FlowPocWorkspaceCheckpoint: { fromLegacy: (raw: string) => { ok: boolean } };
    };
    if (localStorage.getItem(targetKey) !== null) throw Error('Fixture requires a fresh checkpoint');
    const envelope = apis.FlowMeIntegratedPoc.initialEnvelope();
    envelope.state.tasks.forEach((task: { date: string | null }, index: number) => {
      task.date = index % 2 === 0 ? today : tomorrow;
    });
    envelope.state.orders = {};
    const raw = JSON.stringify(envelope);
    if (apis.FlowMeIntegratedPoc.validate(envelope.state).length || !apis.FlowPocWorkspaceCheckpoint.fromLegacy(raw).ok) throw Error('Invalid month fixture');
    window.localStorage.setItem(key, raw);
    return raw;
  }, { key: STORAGE_KEY, targetKey: WORKSPACE_STORAGE_KEY, today: '2026-09-02', tomorrow: '2026-09-03' });
  await page.reload();
  calls.length = 0;

  await page.locator('button[data-view="month"]').click();
  const toggle = page.locator('button[data-action="toggle-empty-month"]');
  await expect(toggle).toHaveText('할 일 없는 날짜 28일 보기');
  const bytesBeforeToggle = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await toggle.click();
  await expect(toggle).toHaveText('빈 날짜 접기');
  await expect(page.locator('.period-day')).toHaveCount(30);
  await expect(page.locator('.period-day-empty')).toHaveCount(28);
  await expect(page.locator('.month-date-add')).toHaveCount(30);
  // K2B scopes timeline ordering to each date, not one month-wide list.
  await expect(page.locator('.period-day [id^="task-order-help-"]')).toHaveCount(2);
  expect(await page.locator('.period-day .drag-handle').evaluateAll((handles) => (
    handles.length === 10 && handles.every((handle) => {
      const help = document.getElementById(handle.getAttribute('aria-describedby') ?? '');
      return help?.closest('.period-day') === handle.closest('.period-day') && help?.textContent?.includes('Enter 또는 Space');
    })
  ))).toBe(true);
  await expectSuccessfulMutationCount(page, 0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesBeforeToggle);
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  const targetDate = '2026-09-15';
  const targetSection = page.locator(`.period-day[data-period-date="${targetDate}"]`);
  const bytesBeforeDateEntry = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await targetSection.locator('.month-date-add').click();
  await expect(page.locator('form[data-dialog-form="quick"] input[name="date"]')).toHaveValue(targetDate);
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesBeforeDateEntry);
  expect(calls).toEqual([]);

  await page.evaluate(() => (document.querySelector('[data-action="open-guide"]') as HTMLElement).click());
  await page.locator('#dialog details.test-tools summary').click();
  await page.locator('#force-write-error').check();
  await page.locator('#dialog button[data-action="close-dialog"]').last().click();
  await targetSection.locator('.month-date-add').click();
  await page.locator('form[data-dialog-form="quick"] input[name="title"]').fill('저장되면 안 되는 월간 할 일');
  await page.locator('form[data-dialog-form="quick"] button[type="submit"]').click();
  // K2B requires explicit recovery even when the prepared journal write threw
  // before mutation. The old month stays unavailable until storage is verified.
  await expectSaveStatus(page, '저장 상태 확인 필요 · 변경 차단', 'error');
  const recovery = page.getByTestId('workspace-storage-gate');
  await expect(recovery).toBeVisible();
  await expect(recovery.getByRole('alert')).toContainText('현재 입력을 보존');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(bytesBeforeDateEntry);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
  expect(calls).toEqual([]);
  await recovery.getByRole('button', { name: '이전 상태 복구', exact: true }).click();
  await expect(recovery).toHaveCount(0);
  await expect(page.locator('form[data-dialog-form="quick"] input[name="title"]')).toHaveValue('저장되면 안 되는 월간 할 일');
  await expect(targetSection.locator('.task-row').filter({ hasText: '저장되면 안 되는 월간 할 일' })).toHaveCount(0);
  expect(calls).toEqual([]);
  await page.keyboard.press('Escape');
  await page.evaluate(() => (document.querySelector('[data-action="open-guide"]') as HTMLElement).click());
  await page.locator('#dialog details.test-tools summary').click();
  await page.locator('#force-write-error').uncheck();
  await page.locator('#dialog button[data-action="close-dialog"]').last().click();

  await targetSection.locator('.month-date-add').click();
  await expect(page.locator('form[data-dialog-form="quick"] input[name="date"]')).toHaveValue(targetDate);
  await page.locator('form[data-dialog-form="quick"] input[name="title"]').fill('월간 날짜별 빠른 할 일');
  await page.locator('form[data-dialog-form="quick"] button[type="submit"]').click();
  await expect(targetSection.locator('.task-row').filter({ hasText: '월간 날짜별 빠른 할 일' })).toBeVisible();
  await expect(targetSection.locator('.task-row').filter({ hasText: targetDate })).toHaveCount(0);
  await expectSuccessfulMutationCount(page, 1);
  const transactionCalls = [
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'setItem', key: WORKSPACE_STORAGE_KEY },
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'removeItem', key: WORKSPACE_RECOVERY_KEY },
  ];
  await expect.poll(() => calls).toEqual(transactionCalls);
  await readStandaloneCheckpoint(page);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();

  const menuButton = page.locator('.task-row button[data-action="task-menu"]').first();
  await menuButton.scrollIntoViewIfNeeded();
  await menuButton.click();
  const movePanel = page.locator('#move-panel');
  const bodyOverflow = await movePanel.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(bodyOverflow.scrollHeight).toBeGreaterThan(bodyOverflow.clientHeight);
  const pageScrollBeforePanelScroll = await page.evaluate(() => window.scrollY);
  await movePanel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await movePanel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBeforePanelScroll);
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();

  await page.reload();
  await page.locator('button[data-view="month"]').click();
  await expect(page.locator(`.period-day[data-period-date="${targetDate}"]`).filter({ hasText: '월간 날짜별 빠른 할 일' })).toBeVisible();
  await expect.poll(() => calls).toEqual(transactionCalls);
  const persistentUndo = page.locator('button[data-action="undo"]:visible').first();
  await expect(persistentUndo).toBeEnabled();
  await persistentUndo.click();
  await expect(page.locator(`.period-day[data-period-date="${targetDate}"]`).filter({ hasText: '월간 날짜별 빠른 할 일' })).toHaveCount(0);
  await expect.poll(() => calls).toEqual([...transactionCalls, ...transactionCalls]);
  await readStandaloneCheckpoint(page);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
  await page.reload();
  await page.locator('button[data-view="month"]').click();
  await expect(page.locator('.task-row').filter({ hasText: '월간 날짜별 빠른 할 일' })).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(legacyInput);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY].includes(entry.key))).toEqual([]);
});

test('row scroll stays inert while handle click, long press and menu share one task menu', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  const bytesBeforeGestures = await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY });

  const row = page.locator('.task-row').nth(1);
  const body = row.locator('.task-copy');
  const handle = row.locator('.drag-handle');
  const overflowMenu = row.locator('button[data-action="task-menu"]').last();
  const movePanel = page.locator('#move-panel');
  const closeMovePanel = page.locator('#move-panel button[data-action="close-move-panel"]');
  const touch = { pointerId: 41, pointerType: 'touch', button: 0, clientX: 20, clientY: 20, isPrimary: true };

  await expect(handle).toHaveAttribute('aria-describedby', /task-order-help-/u);
  await expect(page.locator('.visually-hidden').filter({ hasText: '350밀리초' })).toHaveCount(1);

  await body.dispatchEvent('pointerdown', touch);
  await page.waitForTimeout(380);
  await expect(movePanel).not.toBeVisible();
  await body.dispatchEvent('pointerup', touch);

  await handle.click();
  await expect(movePanel).toBeVisible();
  await expect(page.locator('#move-panel-title')).toHaveText((await row.locator('.task-title').textContent())?.trim() ?? '');
  await expect(page.locator('#move-panel-status')).toContainText('이동할 위치를 선택해 주세요.');
  await expect(page.locator('#save-status')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-save-state', 'ready');
  await closeMovePanel.click();

  await overflowMenu.click();
  await expect(movePanel).toBeVisible();
  await closeMovePanel.click();

  await handle.dispatchEvent('pointerdown', touch);
  await page.waitForTimeout(380);
  await expect(movePanel).toBeVisible();
  await handle.dispatchEvent('pointerup', touch);
  await page.keyboard.press('Escape');
  await expect(movePanel).not.toBeVisible();
  await handle.dispatchEvent('click');
  await expect(movePanel).not.toBeVisible();
  await handle.click();
  await expect(movePanel).toBeVisible();
  await closeMovePanel.click();

  const movedTouch = { ...touch, pointerId: 42 };
  await handle.dispatchEvent('pointerdown', movedTouch);
  await handle.dispatchEvent('pointermove', { ...movedTouch, clientX: 26, clientY: 26 });
  await page.waitForTimeout(380);
  await expect(movePanel).not.toBeVisible();
  await expectSaveStatus(page, '손잡이 누르기 취소', 'noop');
  await handle.dispatchEvent('click');
  await expect(movePanel).not.toBeVisible();
  await handle.click();
  await expect(movePanel).toBeVisible();
  await closeMovePanel.click();

  const canceledTouch = { ...touch, pointerId: 43 };
  await handle.dispatchEvent('pointerdown', canceledTouch);
  await handle.dispatchEvent('pointercancel', canceledTouch);
  await handle.dispatchEvent('click');
  await expect(movePanel).not.toBeVisible();
  await handle.click();
  await expect(movePanel).toBeVisible();
  await closeMovePanel.click();

  const scrolledTouch = { ...touch, pointerId: 44 };
  await handle.dispatchEvent('pointerdown', scrolledTouch);
  await page.locator('#main').dispatchEvent('scroll');
  await handle.dispatchEvent('click');
  await expect(movePanel).not.toBeVisible();
  await expectSaveStatus(page, '스크롤로 누르기 취소', 'noop');
  await handle.click();
  await expect(movePanel).toBeVisible();
  await closeMovePanel.click();

  await expectSuccessfulMutationCount(page, 0);
  expect(await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY })).toEqual(bytesBeforeGestures);
});

test('Flow handle click, long press, native drag, more, Space and Enter converge on one folder membership with Undo and zero-write cancels', async ({ page }) => {
  test.setTimeout(45_000);
  const operatingBytes = '  keep Flow movement operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.locator('button[data-view="folder:unfiled"]').click();

  const flowId = 'moving';
  const targetFolderId = 'move';
  const flowRow = () => page.locator(`.flow-row[data-flow-id="${flowId}"]`);
  const flowHandle = () => flowRow().locator('.drag-handle[data-move-kind="flow"]');
  const flowMore = () => flowRow().locator('button[data-action="flow-menu"]');
  const movePanel = page.locator('#move-panel');
  const targetFolder = () => movePanel.locator(`[data-action="move-folder-target"][data-folder-id="${targetFolderId}"]`);
  const currentFolder = () => movePanel.locator('[data-action="move-folder-target"][data-folder-id=""]');
  const readMembership = async () => (await readStandaloneCheckpoint(page)).state.flows.find((flow: { id: string }) => flow.id === flowId).folderId;
  const outcomes: Array<string | null> = [];
  let undoBaselineBytes: string | null = null;

  const assertMovedThenUndo = async () => {
    await expect.poll(readMembership).toBe(targetFolderId);
    outcomes.push(await readMembership());
    await expect(flowRow()).toHaveCount(0);
    await page.locator('button[data-action="undo"]:visible').first().click();
    await expect.poll(readMembership).toBeNull();
    await expect(flowRow()).toBeVisible();
    const restoredBytes = JSON.stringify((await readStandaloneCheckpoint(page)).state);
    if (undoBaselineBytes === null) undoBaselineBytes = restoredBytes;
    else expect(restoredBytes).toBe(undoBaselineBytes);
  };

  await expect(flowRow()).toBeVisible();
  const handleBox = await flowHandle().boundingBox();
  expect(handleBox).not.toBeNull();
  if (handleBox) {
    expect(handleBox.width).toBeGreaterThanOrEqual(48);
    expect(handleBox.height).toBeGreaterThanOrEqual(48);
  }
  await expect(flowHandle()).toHaveAttribute('aria-controls', 'move-panel');
  await expect(flowHandle()).toHaveAttribute('aria-describedby', 'flow-move-help');

  await flowHandle().click();
  await expect(movePanel).toBeVisible();
  await expect(movePanel).toHaveAttribute('aria-modal', 'false');
  await targetFolder().click();
  await assertMovedThenUndo();

  const longPressHandle = flowHandle();
  const longPressBox = await longPressHandle.boundingBox();
  expect(longPressBox).not.toBeNull();
  if (!longPressBox) return;
  const longPress = {
    pointerId: 201,
    pointerType: 'touch',
    button: 0,
    buttons: 1,
    clientX: longPressBox.x + longPressBox.width / 2,
    clientY: longPressBox.y + longPressBox.height / 2,
    isPrimary: true,
  };
  await longPressHandle.dispatchEvent('pointerdown', longPress);
  await page.waitForTimeout(380);
  await expect(movePanel).toBeVisible();
  const destinationBox = await targetFolder().boundingBox();
  expect(destinationBox).not.toBeNull();
  if (!destinationBox) return;
  const destinationPoint = {
    ...longPress,
    clientX: destinationBox.x + destinationBox.width / 2,
    clientY: destinationBox.y + destinationBox.height / 2,
  };
  await longPressHandle.dispatchEvent('pointermove', destinationPoint);
  await longPressHandle.dispatchEvent('pointerup', { ...destinationPoint, buttons: 0 });
  await assertMovedThenUndo();

  const nativeDragHandle = flowHandle();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await nativeDragHandle.dispatchEvent('dragstart', { dataTransfer });
  await expect(movePanel).toBeVisible();
  await targetFolder().dispatchEvent('dragover', { dataTransfer });
  await targetFolder().dispatchEvent('drop', { dataTransfer });
  await assertMovedThenUndo();

  await flowMore().click();
  await expect(movePanel).toBeVisible();
  await targetFolder().click();
  await assertMovedThenUndo();

  await flowHandle().focus();
  await flowHandle().press('Space');
  await expect(movePanel).toBeVisible();
  await targetFolder().focus();
  await targetFolder().press('Enter');
  await assertMovedThenUndo();

  await flowHandle().focus();
  await flowHandle().press('Enter');
  await expect(movePanel).toBeVisible();
  await targetFolder().click();
  await assertMovedThenUndo();

  expect(outcomes).toEqual(Array(6).fill(targetFolderId));
  const transactionCalls = [
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'setItem', key: WORKSPACE_STORAGE_KEY },
    { method: 'setItem', key: WORKSPACE_RECOVERY_KEY },
    { method: 'removeItem', key: WORKSPACE_RECOVERY_KEY },
  ];
  await expect.poll(() => calls.slice()).toEqual(Array.from({ length: 12 }, () => transactionCalls).flat());

  const bytesBeforeNoops = await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: WORKSPACE_STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY });
  const callsBeforeNoops = calls.length;

  await flowHandle().click();
  await currentFolder().click();
  await expect(movePanel).toBeVisible();
  await expect(page.locator('#move-panel-status')).toContainText('이미 같은 위치');
  await page.locator('#move-panel button[data-action="close-move-panel"]').click();

  await flowHandle().click();
  await page.keyboard.press('Escape');
  await expect(movePanel).not.toBeVisible();
  await expectSaveStatus(page, '이동을 취소했어요.', 'noop');

  const canceledHandle = flowHandle();
  const canceledBox = await canceledHandle.boundingBox();
  expect(canceledBox).not.toBeNull();
  if (!canceledBox) return;
  const canceledTouch = {
    pointerId: 202,
    pointerType: 'touch',
    button: 0,
    buttons: 1,
    clientX: canceledBox.x + canceledBox.width / 2,
    clientY: canceledBox.y + canceledBox.height / 2,
    isPrimary: true,
  };
  await canceledHandle.dispatchEvent('pointerdown', canceledTouch);
  await page.waitForTimeout(380);
  await expect(movePanel).toBeVisible();
  await canceledHandle.dispatchEvent('pointercancel', canceledTouch);
  await expect(movePanel).not.toBeVisible();
  await expectSaveStatus(page, '이동을 취소했어요.', 'noop');

  await page.waitForTimeout(50);
  expect(calls).toHaveLength(callsBeforeNoops);
  expect(await page.evaluate(({ stateKey, draftKey }) => ({
    state: window.localStorage.getItem(stateKey),
    draft: window.localStorage.getItem(draftKey),
  }), { stateKey: WORKSPACE_STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY })).toEqual(bytesBeforeNoops);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY].includes(entry.key))).toEqual([]);
  expect(errors).toEqual([]);
});

test('trusted Chromium touch scroll on a row body leaves state unchanged before desktop mouse reorder', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted touch emulation uses the Chromium DevTools input protocol.');
  test.setTimeout(30_000);
  const operatingBytes = '  keep touch and mouse operating bytes  ';
  await page.addInitScript(({ key, bytes }) => {
    window.localStorage.setItem(key, bytes);
  }, { key: OPERATING_SENTINEL_KEY, bytes: operatingBytes });
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto(HTML_URL);

  const rows = page.locator('.task-row');
  const initialOrder = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  const stateBeforeTouch = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  const body = rows.first().locator('.task-copy');
  await body.scrollIntoViewIfNeeded();
  const bodyBox = await body.boundingBox();
  expect(bodyBox).not.toBeNull();
  if (!bodyBox) return;

  const scrollBefore = await page.evaluate(() => window.scrollY);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const x = bodyBox.x + Math.min(40, bodyBox.width / 2);
  const startY = bodyBox.y + Math.min(28, bodyBox.height / 2);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY, id: 1, radiusX: 2, radiusY: 2, force: 1 }],
  });
  for (const delta of [28, 56, 84, 112, 140]) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - delta, id: 1, radiusX: 2, radiusY: 2, force: 1 }],
    });
    await page.waitForTimeout(24);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore + 20);
  await expect(page.locator('#move-panel')).not.toBeVisible();
  await expectSuccessfulMutationCount(page, 0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(stateBeforeTouch);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);

  await page.evaluate(() => window.scrollTo(0, 0));
  const firstRowBox = await rows.first().boundingBox();
  expect(firstRowBox).not.toBeNull();
  if (!firstRowBox) return;
  await rows.nth(1).locator('.drag-handle').dragTo(rows.first(), {
    targetPosition: { x: firstRowBox.width - 12, y: firstRowBox.height * 0.25 },
  });
  const reordered = await rows.evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-task-id')));
  expect(reordered).toEqual([initialOrder[1], initialOrder[0], ...initialOrder.slice(2)]);
  await expectSuccessfulMutationCount(page, 1);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('forced four-side safe variables keep the standalone move panel and contextual completion result inside the viewport', async ({ page }) => {
  const operatingBytes = '  keep forced safe-area operating bytes  ';
  await page.addInitScript(({ key, bytes }) => {
    window.localStorage.setItem(key, bytes);
  }, { key: OPERATING_SENTINEL_KEY, bytes: operatingBytes });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.evaluate(() => {
    const root = document.documentElement.style;
    root.setProperty('--standalone-safe-top', '24px');
    root.setProperty('--standalone-safe-right', '18px');
    root.setProperty('--standalone-safe-bottom', '30px');
    root.setProperty('--standalone-safe-left', '22px');
  });

  const assertInsideForcedInsets = async (selector: string) => {
    const rect = await page.locator(selector).evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });
    expect(rect.left).toBeGreaterThanOrEqual(22);
    expect(rect.top).toBeGreaterThanOrEqual(24);
    expect(rect.right).toBeLessThanOrEqual(390 - 18);
    expect(rect.bottom).toBeLessThanOrEqual(844 - 30);
  };

  const row = page.locator('.task-row').nth(1);
  await row.locator('button[data-action="task-menu"]').click();
  await expect(page.locator('#move-panel')).toBeVisible();
  await assertInsideForcedInsets('#move-panel');
  await page.keyboard.press('Escape');

  await row.locator('button[data-action="toggle-complete"]').click();
  const result = page.getByTestId('workspace-contextual-result');
  await expect(result).toBeVisible();
  await expect(page.locator('#toast')).toBeHidden();
  await assertInsideForcedInsets('[data-testid="workspace-contextual-result"]');
  const undo = result.locator('[data-action="contextual-undo"]');
  await expect(undo).toBeVisible();
  await undo.click({ trial: true });
  expect(await undo.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit === element || element.contains(hit);
  })).toBe(true);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('opaque-origin storage denial falls back to an operable temporary session', async ({ page }) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Blocked for Android preview reproduction', 'SecurityError');
      },
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await page.locator('button[data-view="folder:unfiled"]').click();
  await expect(page.locator('.flow-row')).toHaveCount(4);
  await expect(page.locator('#save-status')).toContainText('임시');
  await authorAndOpenFlow(page);
  await expect(page.locator('.task-row').filter({ hasText: '전입 신고 준비' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('script-disabled preview shows download-and-open guidance instead of a blank body', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(HTML_URL);
  const fallback = page.locator('#boot-fallback');
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('Chrome');
  await expect(fallback).toContainText('내려받은 뒤');
  await context.close();
});

test('standalone Task and Flow move panels stay operable in portrait and landscape report captures', async ({ page }) => {
  test.setTimeout(30_000);
  const operatingBytes = '  keep movement capture operating bytes  ';
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-03-flowme-integrated-poc-movement-parity-report-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of [
    { label: '390x844', width: 390, height: 844 },
    { label: '844x390', width: 844, height: 390 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(HTML_URL);
    const bytesBeforePanels = await page.evaluate(({ stateKey, draftKey }) => ({
      state: window.localStorage.getItem(stateKey),
      draft: window.localStorage.getItem(draftKey),
    }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY });

    const taskMenu = page.locator('.task-row button[data-action="task-menu"]').first();
    await taskMenu.scrollIntoViewIfNeeded();
    await taskMenu.click();
    await expect(page.locator('#move-panel')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, `standalone-task-move-${viewport.label}.png`),
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    const unfiledView = page.locator('button[data-view="folder:unfiled"]');
    await unfiledView.scrollIntoViewIfNeeded();
    await unfiledView.click();
    const flowHandle = page.locator('.flow-row .drag-handle[data-move-kind="flow"]').first();
    await flowHandle.scrollIntoViewIfNeeded();
    await flowHandle.click();
    await expect(page.locator('#move-panel')).toBeVisible();
    await expect(page.locator('#move-panel [data-action="move-folder-target"]')).toHaveCount(5);
    await page.screenshot({
      path: path.join(screenshotDir, `standalone-flow-move-${viewport.label}.png`),
      fullPage: false,
    });
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(({ stateKey, draftKey }) => ({
      state: window.localStorage.getItem(stateKey),
      draft: window.localStorage.getItem(draftKey),
    }), { stateKey: STORAGE_KEY, draftKey: DRAFT_STORAGE_KEY })).toEqual(bytesBeforePanels);
  }

  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
});

test('P2-B standalone restores one recurring Item and three occurrence rows after move and completion', async ({ page }) => {
  test.setTimeout(60_000);
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  const operatingBytes = '  keep P2-B occurrence operating bytes exactly  ';
  const pocPrefix = 'flow:poc:personal-workspace:v1:';
  const recurringSource = [
    '# 아침 루틴',
    '',
    '## 준비',
    '- [ ] 물 마시기',
    '  - 날짜: 2026-09-02',
    '  - 반복: 매일',
    '  - 반복 종료: 3회',
    '  - 완료 기준: 빈 컵을 씻기',
  ].join('\n');

  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await expectSuccessfulMutationCount(page, 0);
  const operatingBefore = await page.evaluate((prefix) => Object.fromEntries(
    Object.entries(window.localStorage)
      .filter(([key]) => key.startsWith('flow:') && !key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right)),
  ), pocPrefix);

  await page.locator('button[data-action="go-authoring"]').first().click();
  await page.locator('#flow-editor').fill(recurringSource);
  await page.locator('#authoring-tab-result').click();
  const authoringPreview = page.locator('#authoring-artifact-result');
  await authoringPreview.getByRole('tab', { name: '할 일', exact: true }).click();
  const previewRows = authoringPreview.locator(
    '.result-occurrence.static[data-occurrence-id]:not([data-occurrence-id=""])',
  );
  await expect(previewRows).toHaveCount(3);
  const previewIdentity = await previewRows.evaluateAll((rows) => rows.map((row) => ({
    occurrenceId: row.getAttribute('data-occurrence-id'),
    rowId: row.getAttribute('data-row-id'),
    sourceItemRef: row.getAttribute('data-source-item-ref'),
    originalDate: row.getAttribute('data-original-date'),
  })));
  expect(new Set(previewIdentity.map((row) => row.occurrenceId)).size).toBe(3);
  expect(new Set(previewIdentity.map((row) => row.sourceItemRef)).size).toBe(1);
  expect(previewIdentity.map((row) => row.rowId)).toEqual(
    previewIdentity.map((row) => row.occurrenceId),
  );
  expect(previewIdentity.map((row) => row.originalDate)).toEqual([
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
  ]);

  await page.locator('#commit-authoring').click();
  await expect(page.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toBeVisible();
  await expectSuccessfulMutationCount(page, 1);
  await page.locator('button[data-action="open-receipt-flow"]').click();
  await expect(page.getByRole('heading', { name: '아침 루틴', exact: true })).toBeVisible();

  let resultSurface = page.getByTestId('standalone-result-surface');
  await resultSurface.getByRole('tab', { name: '할 일', exact: true }).click();
  let occurrenceRows = resultSurface.locator(
    '.result-occurrence[data-occurrence-id]:not([data-occurrence-id=""])',
  );
  await expect(occurrenceRows).toHaveCount(3);
  const savedIdentity = await occurrenceRows.evaluateAll((rows) => rows.map((row) => ({
    occurrenceId: row.getAttribute('data-occurrence-id'),
    rowId: row.getAttribute('data-row-id'),
    sourceItemRef: row.getAttribute('data-source-item-ref'),
  })));
  expect(new Set(savedIdentity.map((row) => row.occurrenceId)).size).toBe(3);
  expect(new Set(savedIdentity.map((row) => row.sourceItemRef)).size).toBe(1);
  expect(savedIdentity.map((row) => row.rowId)).toEqual(
    savedIdentity.map((row) => row.occurrenceId),
  );

  const legacyBytes = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const readSourceItemBytes = async () => {
    const checkpoint = await readStandaloneCheckpoint(page);
    const flow = checkpoint.state.flows.find((candidate: { id: string }) => candidate.id === checkpoint.state.lastReceipt.flowId);
    const sourceItemId = flow.steps.flatMap((step: { itemIds: string[] }) => step.itemIds)[0];
    return JSON.stringify(checkpoint.state.tasks.find((task: { id: string }) => task.id === sourceItemId));
  };
  const sourceItemBytes = await readSourceItemBytes();
  const secondOccurrenceId = savedIdentity[1].occurrenceId;
  expect(secondOccurrenceId).toBeTruthy();
  const secondOccurrence = () => resultSurface.locator(
    `.result-occurrence[data-occurrence-id="${secondOccurrenceId}"]`,
  );

  await page.waitForTimeout(25);
  const callsBeforeEscape = calls.length;
  const stateBeforeEscape = await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
  await secondOccurrence().locator('[data-action="move-result-occurrence-date"]').click();
  const occurrenceDialog = page.locator('[data-dialog-form="occurrence-date"]');
  await expect(occurrenceDialog).toBeVisible();
  await expect(occurrenceDialog.locator('input[name="date"]')).toHaveValue('2026-09-03');
  await page.keyboard.press('Escape');
  await expect(occurrenceDialog).not.toBeVisible();
  await page.waitForTimeout(25);
  expect(calls).toHaveLength(callsBeforeEscape);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(stateBeforeEscape);
  await expectSuccessfulMutationCount(page, 1);

  await secondOccurrence().locator('[data-action="move-result-occurrence-date"]').click();
  await page.locator('[data-dialog-form="occurrence-date"] input[name="date"]').fill('2026-09-10');
  await page.locator('[data-dialog-form="occurrence-date"]').getByRole('button', {
    name: '이 회차 이동',
    exact: true,
  }).click();
  await expect(secondOccurrence()).toHaveAttribute('data-original-date', '2026-09-03');
  await expect(secondOccurrence()).toHaveAttribute('data-effective-date', '2026-09-10');
  await expectSuccessfulMutationCount(page, 2);

  await secondOccurrence().locator('[data-action="toggle-result-occurrence-complete"]').click();
  await expect(secondOccurrence()).toHaveAttribute('data-completed', 'true');
  await expect(secondOccurrence().locator('[data-action="toggle-result-occurrence-complete"]')).toHaveText(
    '이 회차 다시 열기',
  );
  await expectSuccessfulMutationCount(page, 3);
  const stateAfterMoveAndCompletion = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKSPACE_STORAGE_KEY,
  );

  await page.reload();
  await expectSuccessfulMutationCount(page, 0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKSPACE_STORAGE_KEY)).toBe(
    stateAfterMoveAndCompletion,
  );
  await page.locator('button[data-view="folder:unfiled"]').click();
  const savedFlow = page.locator('.flow-row').filter({ hasText: '아침 루틴' });
  await expect(savedFlow).toHaveCount(1);
  await savedFlow.getByRole('button', { name: '아침 루틴', exact: true }).click();
  resultSurface = page.getByTestId('standalone-result-surface');
  await resultSurface.getByRole('tab', { name: '할 일', exact: true }).click();
  occurrenceRows = resultSurface.locator(
    '.result-occurrence[data-occurrence-id]:not([data-occurrence-id=""])',
  );
  await expect(occurrenceRows).toHaveCount(3);
  await expect(secondOccurrence()).toHaveAttribute('data-effective-date', '2026-09-10');
  await expect(secondOccurrence()).toHaveAttribute('data-completed', 'true');

  await page.locator('button[data-action="undo"]:visible').first().click();
  await expect(secondOccurrence()).toHaveAttribute('data-effective-date', '2026-09-10');
  await expect(secondOccurrence()).toHaveAttribute('data-completed', 'false');
  await expect(secondOccurrence().locator('[data-action="toggle-result-occurrence-complete"]')).toHaveText(
    '이 회차 완료',
  );
  await expectSuccessfulMutationCount(page, 1);
  expect(await readSourceItemBytes()).toBe(sourceItemBytes);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(legacyBytes);
  expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE_RECOVERY_KEY)).toBeNull();

  const operatingAfter = await page.evaluate((prefix) => Object.fromEntries(
    Object.entries(window.localStorage)
      .filter(([key]) => key.startsWith('flow:') && !key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right)),
  ), pocPrefix);
  expect(operatingAfter).toEqual(operatingBefore);
  expect(operatingAfter[OPERATING_SENTINEL_KEY]).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![WORKSPACE_STORAGE_KEY, WORKSPACE_RECOVERY_KEY, DRAFT_STORAGE_KEY].includes(entry.key))).toEqual([]);
  expect(errors).toEqual([]);
});

test('P2-A standalone disambiguates copies, renders 42-day results, downloads exact files, and preserves tables or raw text', async ({ page }) => {
  test.setTimeout(120_000);
  const calls: StandaloneStorageMutation[] = [];
  const errors: string[] = [];
  const operatingBytes = '  keep P2-A standalone operating bytes  ';
  await installStandaloneA8StorageAudit(page, calls, operatingBytes);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HTML_URL);
  await page.evaluate((storageKey) => {
    type StandaloneModel = Readonly<{
      initialEnvelope: () => {
        version: number;
        state: {
          flows: Array<Record<string, unknown>>;
        };
        undo: unknown;
      };
    }>;
    const model = (window as Window & typeof globalThis & {
      FlowMeIntegratedPoc: StandaloneModel;
    }).FlowMeIntegratedPoc;
    const envelope = JSON.parse(JSON.stringify(model.initialEnvelope())) as ReturnType<StandaloneModel['initialEnvelope']>;
    const source = envelope.state.flows.find((flow) => flow.id === 'washer');
    if (!source) throw new Error('canonical standalone source fixture missing');
    envelope.state.flows.push({
      ...source,
      id: 'washer-copy-two',
      ref: 'saved-flow:copy-canonical-washer-two:flow-washer',
      savedCopyId: 'copy-canonical-washer-two',
      steps: [],
    });
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  }, STORAGE_KEY);

  const viewports = [
    { label: '320x700', width: 320, height: 700 },
    { label: '390x844', width: 390, height: 844 },
    { label: '375x812', width: 375, height: 812 },
    { label: '844x390', width: 844, height: 390 },
    { label: '1024x768', width: 1024, height: 768 },
    { label: '1440x900', width: 1440, height: 900 },
  ] as const;
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-03-flowme-integrated-poc-p2a-evidence-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });

  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.reload();
    await page.locator('[data-view="folder:unfiled"]').click();
    await expect(page.locator('.flow-row').filter({ hasText: '사본 1 · 우리집 세탁기 관리' })).toHaveCount(1);
    await expect(page.locator('.flow-row').filter({ hasText: '사본 2 · 우리집 세탁기 관리' })).toHaveCount(1);
    await page.locator('[data-action="open-flow"][data-id="moving"]').first().click();
    const result = page.getByTestId('standalone-result-surface');
    await expect(result).toBeVisible();

    if (index === 0) {
      const txtDownloadPromise = page.waitForEvent('download');
      await result.locator('[data-action="download-result-txt"]').click();
      const txtDownload = await txtDownloadPromise;
      const txtPath = await txtDownload.path();
      expect(txtPath).toBeTruthy();
      const txtBytes = fs.readFileSync(txtPath!);
      const txt = txtBytes.toString('utf8');
      expect([...txtBytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
      expect(txt).not.toContain('\r');
      expect(txt.endsWith('\n')).toBe(true);
      expect(txt.endsWith('\n\n')).toBe(false);
    }

    await result.getByRole('tab', { name: '캘린더', exact: true }).click();
    const calendar = result.locator('[data-calendar-week-count]');
    await expect(calendar).toHaveAttribute('data-calendar-week-count', '6');
    await expect(calendar).toHaveAttribute('data-calendar-date-policy', 'effective-date-execution-first');
    await expect(calendar.locator('.result-calendar-grid > *')).toHaveCount(42);
    const monthBefore = await calendar.getByRole('heading', { level: 3 }).first().textContent();
    await calendar.getByRole('button', { name: '다음 달' }).click();
    await expect(calendar.getByRole('heading', { level: 3 }).first()).not.toHaveText(monthBefore ?? '');

    await result.getByRole('tab', { name: '표', exact: true }).click();
    if (index === 0) {
      const csvDownloadPromise = page.waitForEvent('download');
      await result.locator('[data-action="download-result-csv"]').click();
      const csvDownload = await csvDownloadPromise;
      const csvPath = await csvDownload.path();
      expect(csvPath).toBeTruthy();
      const csvBytes = fs.readFileSync(csvPath!);
      expect([...csvBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const csv = csvBytes.subarray(3).toString('utf8');
      expect(csv).toContain('\r\n');
      expect(csv.replaceAll('\r\n', '')).not.toContain('\n');
      expect(csv.endsWith('\r\n')).toBe(true);
      expect(csv.endsWith('\r\n\r\n')).toBe(false);
    }
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )), viewport.label).toBe(true);
    await page.screenshot({
      path: path.join(screenshotDir, `standalone-result-${viewport.label}.png`),
      fullPage: false,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('button[data-action="go-authoring"]').first().click();
  const source = page.locator('#flow-editor');
  const safeTable = '순서\t작품\t자료\n1\t어린 왕자\thttps://example.com/1\n2\t오만과 편견\thttps://example.com/2';
  await source.fill(safeTable);
  await page.locator('#authoring-tab-result').click();
  const table = page.getByTestId('standalone-lossless-table');
  await expect(table).toBeVisible();
  await expect(table).toHaveAttribute('data-source-mutation-count', '0');
  await expect(table).toContainText('2개 SourceRow');
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await page.screenshot({
    path: path.join(screenshotDir, 'standalone-lossless-table-390x844.png'),
    fullPage: false,
  });

  await page.locator('#authoring-tab-input').click();
  await source.fill('열1,열2\n1,=SUM(A1)');
  await page.locator('#authoring-tab-result').click();
  const fallback = page.getByTestId('standalone-lossless-raw');
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('data-lossless-status', 'raw-fallback');
  await expect(fallback).toHaveAttribute('data-source-mutation-count', '0');
  await expect(fallback).toContainText('구조를 추측하지 않고 원문으로 유지');

  expect(await page.evaluate((key) => window.localStorage.getItem(key), OPERATING_SENTINEL_KEY)).toBe(operatingBytes);
  expect(calls.filter((entry) => entry.method === 'clear')).toEqual([]);
  expect(calls.filter((entry) => entry.key && ![STORAGE_KEY, DRAFT_STORAGE_KEY].includes(entry.key))).toEqual([]);
  expect(errors).toEqual([]);
});

test('single-file integrated PoC has no overflow, browser errors, or covered primary action in six viewports', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-flow-poc-validation-report-assets',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of REQUIRED_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(HTML_URL);
    await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

    const primaryAction = page.locator('button[data-action="add-quick"]:visible').first();
    await expect(primaryAction).toBeVisible();
    await primaryAction.scrollIntoViewIfNeeded();
    const clickable = await primaryAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    });
    expect(clickable, `${viewport.label} primary action is clickable`).toBe(true);

    if (viewport.label === '844x390') {
      const taskBox = await page.locator('.task-row').first().boundingBox();
      expect(taskBox).not.toBeNull();
      if (taskBox) expect(taskBox.y).toBeLessThan(viewport.height);
    }

    await page.screenshot({
      path: path.join(screenshotDir, `integrated-${viewport.label}.png`),
      fullPage: false,
    });
  }

  expect(errors).toEqual([]);
});
