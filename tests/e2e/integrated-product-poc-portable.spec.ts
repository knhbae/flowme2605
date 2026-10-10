import { test, expect, type Page } from '@playwright/test';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';
import { buildProgramCatalog } from '../../lib/flow/integrated-poc/catalog';
import { isPublicCatalogFlowOnHold } from '../../lib/flow/public-source-review-policy';

const URL = '/my?personalWorkspacePoc=v1';
const KEY = 'flow:poc:personal-workspace:v1:program:state';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SENTINEL = 'flow:portable-regression:sentinel';
const BYTES = '  synthetic portable QA sentinel\r\n exact bytes  ';
const wire = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const state = async (page: Page): Promise<ProgramEnvelope> => JSON.parse((await wire(page))!);

async function audit(page: Page) {
  const calls: { method: string; key: string | null }[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.exposeBinding('__portableAudit', (_source, call) => calls.push(call));
  const origin = new globalThis.URL(test.info().project.use.baseURL!).origin;
  await page.addInitScript(({ key, value, origin }) => {
    if (location.origin !== origin) return;
    // Seed synthetic operating bytes before instrumentation in this fresh context.
    // After first boot, never repair a missing or mutated sentinel.
    if (!sessionStorage.getItem('portable-fixture-seeded')) {
      localStorage.setItem(key, value);
      sessionStorage.setItem('portable-fixture-seeded', '1');
    }
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        if (this === localStorage) void (window as unknown as { __portableAudit: (v: unknown) => Promise<void> }).__portableAudit({ method, key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      } });
    }
  }, { key: SENTINEL, value: BYTES, origin });
  return async () => {
    expect(await page.evaluate(key => localStorage.getItem(key), SENTINEL)).toBe(BYTES);
    expect(calls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX))).toEqual([]);
    expect(errors).toEqual([]);
  };
}

test('portable gate: exact query only; corrupt Program payload falls back without repair', async ({ page }) => {
  const verify = await audit(page);
  for (const path of ['/my', '/my?personalWorkspacePoc=wrong', '/my?personalWorkspacePoc=v1&extra=1', '/my?personalWorkspacePoc=v1&personalWorkspacePoc=v1']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByTestId('integrated-program-app')).toHaveCount(0);
    expect(await wire(page)).toBeNull();
  }
  await page.goto(URL);
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect(await wire(page)).toBeNull(); // read-only boot
  await page.evaluate(key => localStorage.setItem(key, '{corrupt portable fixture'), KEY);
  await page.reload();
  // The operating My screen may canonicalize its default sort after fallback.
  await expect(page).toHaveURL(/\/my(?:\?sort=next)?$/);
  await expect(page.getByTestId('integrated-program-app')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '내 계획', exact: true })).toBeVisible();
  expect(await wire(page)).toBe('{corrupt portable fixture');
  await verify();
});

test('portable private journey: document, task date and time, completion, Undo and reload preserve operating bytes', async ({ page }) => {
  const verify = await audit(page);
  await page.goto(URL);
  // Named document creation is an explicit secondary action. Preserve the
  // original document journey, but reach its form through the visible UI.
  const titleInput = page.getByLabel('새 문서', { exact: true });
  await expect(titleInput).toBeHidden();
  await page.getByRole('button', { name: '글 찾기 · 내 문서와 할 일', exact: true }).click();
  const find = page.getByRole('dialog', { name: '글 찾기', exact: true });
  await expect(find).toBeVisible();
  await find.locator('summary').filter({ hasText: /^이름을 정해 새 문서 만들기$/ }).click();
  await expect(titleInput).toBeVisible();
  await page.getByLabel('새 문서', { exact: true }).fill('Portable private document');
  await page.getByRole('button', { name: '만들기', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Portable private document', exact: true })).toBeVisible();
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  await editor.locator('textarea').fill('- [ ] Portable task');
  await editor.locator('textarea').press('Tab');
  await expect.poll(async () => M.tasks((await state(page)).data.spaces['local-user'].text).some(task => task.title === 'Portable task')).toBe(true);
  await page.getByRole('navigation', { name: '기본 이동', exact: true }).getByRole('button', { name: '분류', exact: true }).click();
  await page.getByRole('button', { name: 'Portable task 작업', exact: true }).click();
  await page.getByRole('dialog').getByLabel('실행 날짜', { exact: true }).fill('2026-10-10');
  const taskTime = page.getByRole('dialog').getByLabel(/^시간/);
  await expect(taskTime).toHaveAttribute('type', 'time');
  await taskTime.fill('09:30');
  await page.getByRole('dialog').getByRole('button', { name: '날짜·시간 적용', exact: true }).click();
  await expect.poll(async () => {
    const task = M.tasks((await state(page)).data.spaces['local-user'].text).find(task => task.title === 'Portable task');
    return { date: task?.date, time: task?.time };
  }).toEqual({ date: '2026-10-10', time: '09:30' });
  await page.keyboard.press('Escape');
  const before = (await state(page)).data.spaces['local-user'];
  await page.getByRole('button', { name: 'Portable task 완료', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Portable task 다시 열기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(async () => (await state(page)).data.spaces['local-user']).toEqual(before);
  const success = await wire(page);
  await page.reload();
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect(await wire(page)).toBe(success);
  await verify();
});

async function verifyPrivateCopyEditing(page: Page, inputMode: 'replace' | 'append') {
  const verify = await audit(page);
  await page.goto(URL + '#flowme/discover');
  await expect(page.getByTestId('program-discovery')).toBeVisible();
  // Moving is review-held for NEW starts. Select the existing supported travel
  // source explicitly, never use catalog order or bypass that hold for this QA.
  const catalog = buildProgramCatalog('creator-minji');
  const coverage = catalog.coverage.find(row => row.sourceSlug === 'chiangmai-solo-trip-packing')!;
  const version = catalog.versions.find(row => row.id === coverage.versionId)!;
  expect(isPublicCatalogFlowOnHold(coverage.flowId)).toBe(false);
  await page.getByTestId('program-discovery').getByRole('button', { name: version.title, exact: true }).click();
  await expect(page.getByTestId('program-flow-detail').getByRole('heading', { name: version.title, exact: true })).toBeVisible();
  await page.getByLabel(coverage.anchorLabel, { exact: false }).fill('2026-10-10');
  await page.getByRole('button', { name: '내 문서에 가져오기', exact: true }).click();
  await expect.poll(async () => (await wire(page)) && (await state(page)).data.spaces['local-user'].copies.length).toBe(1);
  const before = await state(page);
  const copy = before.data.spaces['local-user'].copies[0];
  expect(copy.flowId).toBe(coverage.flowId);
  expect(copy.baseVersionId).toBe(version.id);
  expect(copy.includedItemIds).toEqual(version.items.map(item => item.id));
  expect(before.data.public.versions.some(version => version.id === copy.baseVersionId)).toBe(true);
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  const input = editor.locator('textarea');
  const originalRaw = await input.inputValue();
  const originalDocument = M.getDocument(before.data.spaces['local-user'].text, copy.documentId)!;
  if (inputMode === 'replace') await input.fill(originalRaw + '\nPortable private note only');
  else {
    await input.focus();
    await input.press('ControlOrMeta+End');
    await page.keyboard.insertText('\nPortable private note only');
  }
  await input.press('Tab');
  // Tab is the native editor's two-space indent command, not blur. Wait for
  // that final command's raw and position, not an earlier fill-only save.
  const finalInput = await input.evaluate((element: HTMLTextAreaElement) => ({
    raw: element.value, start: element.selectionStart, end: element.selectionEnd, scrollTop: element.scrollTop,
  }));
  expect(finalInput.raw).toBe(originalRaw + '\n  Portable private note only');
  expect(finalInput.raw.split('\n').at(-1)).toBe('  Portable private note only');
  await expect.poll(async () => {
    const saved = (await state(page)).data.spaces['local-user'];
    return { raw: M.raw(M.getDocument(saved.text, copy.documentId)),
      documentId: saved.position.documentId, start: saved.position.start,
      end: saved.position.end, scrollTop: saved.position.scrollTop };
  }).toEqual({ ...finalInput, documentId: copy.documentId });
  const after = await state(page);
  expect(after.data.spaces['local-user'].copies).toEqual(before.data.spaces['local-user'].copies);
  if (inputMode === 'append') {
    const editedDocument = M.getDocument(after.data.spaces['local-user'].text, copy.documentId)!;
    // Appending a personal note must preserve all existing line identities/text.
    expect(editedDocument.lines.slice(0, originalDocument.lines.length)).toEqual(originalDocument.lines);
  }
  expect(after.data.public).toEqual(before.data.public);
  expect(JSON.stringify(after.data.public)).not.toContain('Portable private note only');
  for (const actor of before.data.actors.filter(actor => actor.id !== 'local-user')) expect(after.data.spaces[actor.id]).toEqual(before.data.spaces[actor.id]);
  await page.reload();
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect((await state(page)).data).toEqual(after.data);
  await verify();
}

test('portable discovery: public version becomes a private copy without mutating public content', async ({ page }) => {
  // Retain the original whole-document replacement regression. Chromium emits
  // hundreds of native input events for this 7k multiline fill; use the same
  // bounded budget as the dedicated portable lane, not a latency acceptance bar.
  test.setTimeout(60_000);
  await verifyPrivateCopyEditing(page, 'replace');
});

test('portable discovery: native note append retains source lines and private-copy identity', async ({ page }) => {
  await verifyPrivateCopyEditing(page, 'append');
});
