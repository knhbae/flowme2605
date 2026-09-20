import { test, expect, type Page } from '@playwright/test';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';

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

test('portable private journey: document, task date, completion, Undo and reload preserve operating bytes', async ({ page }) => {
  const verify = await audit(page);
  await page.goto(URL);
  await page.getByLabel('새 문서', { exact: true }).fill('Portable private document');
  await page.getByRole('button', { name: '만들기', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Portable private document', exact: true })).toBeVisible();
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  await editor.locator('textarea').fill('- [ ] Portable task');
  await editor.locator('textarea').press('Tab');
  await expect.poll(async () => M.tasks((await state(page)).data.spaces['local-user'].text).some(task => task.title === 'Portable task')).toBe(true);
  await page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '전체 할 일', exact: true }).click();
  await page.getByRole('button', { name: 'Portable task 작업', exact: true }).click();
  await page.getByRole('dialog').getByLabel('실행 날짜', { exact: true }).fill('2026-10-10');
  await page.getByRole('dialog').getByRole('button', { name: '날짜 적용', exact: true }).click();
  await expect.poll(async () => M.tasks((await state(page)).data.spaces['local-user'].text).find(task => task.title === 'Portable task')?.date).toBe('2026-10-10');
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

test('portable discovery: public version becomes a private copy without mutating public content', async ({ page }) => {
  const verify = await audit(page);
  await page.goto(URL + '#flowme/discover');
  await expect(page.getByTestId('program-discovery')).toBeVisible();
  await page.getByTestId('program-discovery').locator('article h2 button').first().click();
  await page.getByLabel(/^이사일/).fill('2026-10-10');
  await page.getByRole('button', { name: '내 문서에 가져오기', exact: true }).click();
  await expect.poll(async () => (await wire(page)) && (await state(page)).data.spaces['local-user'].copies.length).toBe(1);
  const before = await state(page);
  const copy = before.data.spaces['local-user'].copies[0];
  expect(before.data.public.versions.some(version => version.id === copy.baseVersionId)).toBe(true);
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  const input = editor.locator('textarea');
  await input.fill((await input.inputValue()) + '\nPortable private note only');
  await input.press('Tab');
  // Tab is the native editor's two-space indent command, not blur. Wait for
  // that final command's raw and position, not an earlier fill-only save.
  const finalInput = await input.evaluate((element: HTMLTextAreaElement) => ({
    raw: element.value, start: element.selectionStart, end: element.selectionEnd, scrollTop: element.scrollTop,
  }));
  expect(finalInput.raw.split('\n').at(-1)).toBe('  Portable private note only');
  await expect.poll(async () => {
    const saved = (await state(page)).data.spaces['local-user'];
    return { raw: M.raw(M.getDocument(saved.text, copy.documentId)),
      documentId: saved.position.documentId, start: saved.position.start,
      end: saved.position.end, scrollTop: saved.position.scrollTop };
  }).toEqual({ ...finalInput, documentId: copy.documentId });
  const after = await state(page);
  expect(after.data.public).toEqual(before.data.public);
  expect(JSON.stringify(after.data.public)).not.toContain('Portable private note only');
  for (const actor of before.data.actors.filter(actor => actor.id !== 'local-user')) expect(after.data.spaces[actor.id]).toEqual(before.data.spaces[actor.id]);
  await page.reload();
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect((await state(page)).data).toEqual(after.data);
  await verify();
});
