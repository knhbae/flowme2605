import { test, expect, type Page } from '@playwright/test';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';

const KEY = 'flow:poc:personal-workspace:v1:program:state';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SENTINEL = 'flow:authoring-merge:operating-sentinel';
const BYTES = '  synthetic D2 operating bytes\r\n unchanged  ';
const read = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), KEY))!) as ProgramEnvelope;
const working = async (page: Page) => (await read(page)).data.spaces['local-user'].creatorWorkspace!.working!;

async function start(page: Page) {
  const errors: string[] = [], calls: { method: string; key: string | null }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.exposeBinding('__authoringMergeAudit', (_source, call) => calls.push(call));
  const origin = new URL(test.info().project.use.baseURL!).origin;
  await page.addInitScript(({ origin, key, value }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('authoring-merge-seeded')) {
      localStorage.setItem(key, value); sessionStorage.setItem('authoring-merge-seeded', '1');
    }
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        if (this === localStorage) void (window as unknown as { __authoringMergeAudit: (v: unknown) => Promise<void> }).__authoringMergeAudit({ method, key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      } });
    }
  }, { origin, key: SENTINEL, value: BYTES });
  await page.goto('/my?personalWorkspacePoc=v1#flowme/creator');
  const surface = page.getByRole('region', { name: '제작 작업 공간', exact: true });
  await expect(surface).toBeVisible();
  await surface.getByRole('button', { name: '빈 제작 원문 만들기', exact: true }).filter({ visible: true }).click();
  const source = surface.getByRole('textbox', { name: '제작 원문', exact: true });
  await expect(source).toHaveValue('');
  return { surface, source, verify: async () => {
    expect(await page.evaluate(key => localStorage.getItem(key), SENTINEL)).toBe(BYTES);
    expect(calls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX))).toEqual([]);
    expect(errors).toEqual([]);
  } };
}

test('D2 current creator: empty template preview, explicit insertion, native Undo/Redo, saved reentry and reload', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const { surface, source, verify } = await start(page);
  await surface.getByLabel('제작 초안 제목', { exact: true }).fill('Merge D2 template');
  await surface.getByText('작성 틀·예시 선택', { exact: true }).click();
  await surface.getByRole('button', { name: '예시 확인', exact: true }).first().click();
  const preview = surface.getByRole('region', { name: '제작 원문 적용 확인' });
  await expect(preview.locator('pre')).not.toBeEmpty();
  await expect(source).toHaveValue('');
  expect((await working(page)).rawText).toBe('');
  await preview.getByRole('button', { name: '취소', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(source).toHaveValue('');
  // A12/D2-049: a blank scaffold is inserted once, directly into empty source.
  // It is not the separate, confirmation-gated populated structure example.
  const scaffold = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0].scaffold;
  const insert = surface.getByRole('button', { name: '빈 틀 넣기', exact: true }).first();
  await insert.click();
  await expect(source).toHaveValue(scaffold);
  await expect(preview).toHaveCount(0);
  await expect(insert).toBeDisabled();
  await source.press('Control+z');
  await expect(source).toHaveValue('');
  await expect(insert).toBeEnabled();
  await source.press('Control+Shift+z');
  await expect(source).toHaveValue(scaffold);
  await surface.getByRole('button', { name: 'Flow 편집', exact: true }).click();
  const hint = surface.getByRole('button', { name: '빈칸 힌트', exact: true });
  await hint.click(); await expect(source).toHaveValue(scaffold);
  await hint.click(); await expect(source).toHaveValue(scaffold);
  // Explicit user source input makes the blank scaffold a saveable authored draft.
  await source.fill('# Merge D2 template\n## 준비\n- [ ] source survives saved reentry');
  await source.press('Tab');
  const authored = await source.inputValue();
  await surface.getByRole('button', { name: '제작 초안 저장', exact: true }).click();
  await expect.poll(async () => (await working(page)).baseRecordRevision).not.toBeNull();
  const draftId = (await working(page)).draftId;
  await surface.getByRole('navigation', { name: '제작 단계' }).getByRole('button', { name: '제작 초안', exact: true }).click();
  await surface.getByRole('button', { name: /^Merge D2 template.*저장 판본/ }).click();
  await expect(source).toHaveValue(authored);
  expect((await working(page)).draftId).toBe(draftId);
  await page.reload();
  await expect(source).toHaveValue(authored);
  expect((await working(page)).draftId).toBe(draftId);
  await verify();
});

test('D2 current creator: choosing another blank draft cannot silently discard dirty source', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { surface, source, verify } = await start(page);
  await source.fill('# Unsaved D2\n- [ ] keep this raw input');
  await source.press('Tab');
  const raw = await source.inputValue(), draftId = (await working(page)).draftId;
  await surface.getByRole('navigation', { name: '제작 단계' }).getByRole('button', { name: '제작 초안', exact: true }).click();
  await surface.getByRole('button', { name: '빈 제작 원문 만들기', exact: true }).filter({ visible: true }).click();
  const guard = surface.getByRole('region', { name: '작성 중 원문 확인' });
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: '계속 편집', exact: true }).click();
  await surface.getByRole('navigation', { name: '제작 단계' }).getByRole('button', { name: '원문', exact: true }).click();
  await expect(source).toHaveValue(raw);
  expect((await working(page)).draftId).toBe(draftId);
  // Reload recovery covers the last successful 600 ms draft persistence, not
  // an unfinished input transaction deliberately interrupted before success.
  await expect.poll(async () => (await working(page)).rawText).toBe(raw);
  await page.reload();
  await expect(source).toHaveValue(raw);
  expect((await working(page)).draftId).toBe(draftId);
  await verify();
});

test('D2 structure form: visible example and typed form values do not materialize source; Escape closes only the example', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { surface, source, verify } = await start(page);
  const form = surface.getByRole('region', { name: '구조 템플릿 작성', exact: true });
  await form.locator('summary').filter({ hasText: /^구조 템플릿으로 시작$/ }).click();
  await form.getByRole('combobox', { name: '작성 틀', exact: true }).selectOption({ index: 1 });
  await form.getByText('예시 보기', { exact: true }).click();
  const example = form.getByLabel('읽기 전용 원문 예시', { exact: true });
  await expect(example).toBeVisible();
  await expect(example).not.toBeEmpty();
  await expect(source).toHaveValue('');
  await form.getByRole('textbox').first().fill('My private form input');
  await form.getByRole('textbox').first().press('Tab');
  await expect.poll(async () => JSON.stringify((await working(page)).structure)).toContain('My private form input');
  expect((await working(page)).rawText).toBe('');
  await example.focus(); await page.keyboard.press('Escape');
  await expect(example).toBeHidden();
  await expect(form.getByRole('textbox').first()).toHaveValue('My private form input');
  await expect(source).toHaveValue('');
  await verify();
});
