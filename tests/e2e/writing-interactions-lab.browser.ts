import { test, expect, type Browser, type Locator, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';

const KEY = 'flow:poc:personal-workspace:v1:writing-input-lab:v1';
const ORIGIN = 'http://127.0.0.1:3113';
const artifact = resolve('docs/content-audit/2026-10-01-flowme-writing-interactions-lab-ko.html');
const html = readFileSync(artifact), sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const htmlSha = sha(html);
const SENTINELS = { 'flow:saved-plans': '  synthetic saved-plan bytes\r\n',
  'flow:completion:v1': '{"synthetic":"완료 자료는 보존"}\t', 'flow:production:synthetic-sentinel': '원문 대체 표식  \r\n' };
type State = { saved: TextWorkspaceState; raw: string; writes: number; view: 'whole' | 'region'; blocked: boolean };
declare global { interface Window {
  WritingInteractionsLab: { getState(): State; key: string };
  __writingLabQa: { failSet: boolean };
} }
const whole = (page: Page) => page.getByRole('textbox', { name: '전체 문서 원문', exact: true });
const partial = (page: Page) => page.getByRole('textbox', { name: '업무 영역 원문', exact: true });
const state = (page: Page) => page.evaluate(() => window.WritingInteractionsLab.getState());
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
type Run = { page: Page; area: Locator; region: boolean; initial: State; boundary(info: TestInfo): Promise<void> };

async function fixture(page: Page, options: { seed?: TextWorkspaceState; malformed?: boolean; region?: boolean } = {}): Promise<Run> {
  const calls: { method: string; key: string | null; local: boolean }[] = [], requests: string[] = [], errors: string[] = [];
  await page.exposeFunction('__writingLabStorageCall', (call: typeof calls[number]) => calls.push(call));
  await page.addInitScript(({ key, origin, sentinels, seed, malformed }) => {
    if (location.origin !== origin) return;
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
    for (const [k, value] of Object.entries(sentinels)) if (localStorage.getItem(k) === null) nativeSet.call(localStorage, k, value);
    if (localStorage.getItem(key) === null) {
      if (malformed) nativeSet.call(localStorage, key, '{broken synthetic payload');
      else if (seed) nativeSet.call(localStorage, key, JSON.stringify({ version: 1, workspace: seed }));
    }
    window.__writingLabQa = { failSet: false };
    const record = (method: string, storage: Storage, k: string | null) => {
      void (window as unknown as { __writingLabStorageCall(call: unknown): Promise<void> })
        .__writingLabStorageCall({ method, key: k, local: storage === localStorage });
    };
    Storage.prototype.setItem = function(k, value) {
      record('set', this, k);
      if (this !== localStorage || k !== key) throw Error('writing-lab-outside-storage-write');
      if (window.__writingLabQa.failSet) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return nativeSet.call(this, k, value);
    };
    Storage.prototype.removeItem = function(k) {
      record('remove', this, k);
      if (this !== localStorage || k !== key) throw Error('writing-lab-outside-storage-remove');
      return nativeRemove.call(this, k);
    };
    Storage.prototype.clear = function() { record('clear', this, null); throw Error('writing-lab-storage-clear-forbidden'); };
  }, { key: KEY, origin: ORIGIN, sentinels: SENTINELS, seed: options.seed, malformed: !!options.malformed });
  page.on('pageerror', error => errors.push(`page:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  await page.context().routeWebSocket('**/*', socket => { requests.push('websocket'); socket.close(); });
  await page.context().route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && url.origin === ORIGIN && url.pathname === '/' && !url.search && !url.hash)
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    requests.push(`${request.method()}:${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
  });
  await page.goto(`${ORIGIN}/`); await expect(whole(page)).toBeVisible();
  if (options.region) { await page.getByRole('combobox', { name: '보기', exact: true }).selectOption('region'); await expect(partial(page)).toBeVisible(); }
  const area = options.region ? partial(page) : whole(page), initial = await state(page);
  return { page, area, region: !!options.region, initial, async boundary(info) {
    expect(requests).toEqual([]); expect(errors).toEqual([]);
    expect(calls.filter(call => !call.local || call.key !== KEY || !['set', 'remove'].includes(call.method))).toEqual([]);
    expect(await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), Object.keys(SENTINELS))).toEqual(SENTINELS);
    expect(sha(readFileSync(artifact)), 'Generated HTML stays frozen throughout the run').toBe(htmlSha);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await info.attach(`${options.region ? 'region' : 'whole'}-lab-boundary`, { contentType: 'application/json', body: JSON.stringify({
      htmlSha, viewport: page.viewportSize(), calls, requests, errors, outsideKeyWrites: 0,
      sentinelBytesUnchanged: true, allDocumentsInjected: true, realNetworkRequests: 0,
      evidence: 'Standalone generated HTML with embedded native editor and local models; not the app server writer or real IME.',
    }) });
  } };
}

async function pair(page: Page, browser: Browser, info: TestInfo, action: (runs: Run[]) => Promise<void>) {
  const full = await fixture(page), context = await browser.newContext({ viewport: page.viewportSize() ?? undefined, serviceWorkers: 'block' });
  try {
    const region = await fixture(await context.newPage(), { seed: full.initial.saved, region: true });
    expect(region.initial.saved).toEqual(full.initial.saved);
    await action([full, region]); await full.boundary(info); await region.boundary(info);
  } finally { await context.close(); }
}

async function caret(run: Run, needle: string) {
  await run.area.focus();
  await run.area.evaluate((area: HTMLTextAreaElement, needle) => {
    const index = area.value.indexOf(needle); if (index < 0) throw Error(`lab-synthetic-row-missing:${needle}`);
    const newline = area.value.indexOf('\n', index), end = newline < 0 ? area.value.length : newline;
    area.setSelectionRange(end, end);
  }, needle);
}
const tasks = (snapshot: State) => snapshot.saved.documents[0].lines.filter(line => /- \[[^\]]*\] \S/.test(line.text));
function preserved(before: TextWorkspaceState, after: TextWorkspaceState, allowed: Set<string>) {
  const ids = new Set(before.documents[0].lines.map(line => line.id));
  expect(after.documents[0].lines.filter(line => ids.has(line.id)).map(line => line.id)).toEqual(before.documents[0].lines.map(line => line.id));
  expect(after.documents[0].lines.filter(line => ids.has(line.id) && !allowed.has(line.id))).toEqual(before.documents[0].lines.filter(line => !allowed.has(line.id)));
  expect(after.folders).toEqual(before.folders); expect(after.bindings).toEqual(before.bindings); expect(after.progressRecords).toEqual(before.progressRecords);
  for (const name of ['itemScopes', 'taskScopes'] as const) for (const [id, scope] of Object.entries(before[name])) expect(after[name][id]).toBe(scope);
}

test('L1 first viewport, common native mirror, mode controls and EscapeTab are visible and zero-write at all five sizes', async ({ page }, info) => {
  const run = await fixture(page); await page.evaluate(() => scrollTo(0, 0));
  const geometry = await page.evaluate(() => {
    const first = document.querySelector('.tle-line')!.getBoundingClientRect();
    return { viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth - innerWidth,
      firstLineTop: first.top, firstLineBottom: first.bottom, visibleHeight: Math.max(0, Math.min(innerHeight, first.bottom) - Math.max(0, first.top)),
      controls: [...document.querySelectorAll<HTMLElement>('.toolbar button,.toolbar select')].map(control => ({ name: control.textContent?.trim(), height: control.getBoundingClientRect().height })) };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1); expect(geometry.visibleHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.controls.every(control => control.height >= 48)).toBe(true);
  await page.screenshot({ path: info.outputPath('first-viewport.png') });
  await info.attach('lab-geometry', { contentType: 'application/json', body: JSON.stringify(geometry) });
  for (const view of ['whole', 'region']) {
    await page.getByRole('combobox', { name: '보기', exact: true }).selectOption(view);
    const area = view === 'whole' ? whole(page) : partial(page); await expect(area).toHaveClass(/tle-textarea/);
    expect(await area.evaluate(el => !!el.closest('.tle-root')?.querySelector('.tle-presentation .tle-line'))).toBe(true);
    const raw = await area.inputValue(); await page.getByRole('button', { name: '원문 보기', exact: true }).click();
    await expect(page.locator('.tle-root')).toHaveAttribute('data-mode', 'text'); await expect(area).toHaveValue(raw);
    await page.getByRole('button', { name: '문서 보기', exact: true }).click(); await expect(page.locator('.tle-root')).toHaveAttribute('data-mode', 'live');
    await area.focus(); await area.press('Escape'); await area.press('Tab'); await expect(area).not.toBeFocused(); await expect(area).toHaveValue(raw);
  }
  expect((await state(page)).saved).toEqual(run.initial.saved); expect((await state(page)).writes).toBe(0); expect(await stored(page)).toBeNull();
  await run.boundary(info);
});

test('L2 native Todo/list Enter continues at the same depth and a newly created empty scaffold exits without promoting ordinary notes', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const original = await run.area.inputValue(); await caret(run, '셋째 할 일'); await run.area.press('Enter');
      await expect(run.area).toHaveValue(original.replace('셋째 할 일', '셋째 할 일\n  - [ ] '));
      await run.area.pressSequentially('새 할 일'); await run.area.press('Enter'); await run.area.press('Enter');
      await caret(run, '자유 메모'); await run.area.press('Enter'); await run.area.pressSequentially('후속 메모');
      const expected = original.replace('셋째 할 일', '셋째 할 일\n  - [ ] 새 할 일\n').replace('자유 메모', '자유 메모\n  - 후속 메모');
      await expect(run.area).toHaveValue(expected); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      const saved = await state(run.page); expect(saved.writes).toBe(1); expect(tasks(saved)).toHaveLength(tasks(run.initial).length + 1);
      preserved(run.initial.saved, saved.saved, new Set());
      expect(saved.raw).toContain('숨은 개인 메모  '); expect(saved.raw).toContain('영역 밖 할 일');
    }
    expect((await state(runs[0].page)).raw).toBe((await state(runs[1].page)).raw);
  });
});

test('L3 native memo-property Enter and ShiftEnter keep one Item note multiline with stable source IDs through save and reload', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const original = await run.area.inputValue(), originalMemo = run.initial.saved.documents[0].lines.find(line => line.text.includes('메모: 첫 문장'))!;
      await caret(run, '메모: 첫 문장'); await run.area.press('Enter'); await run.area.pressSequentially('둘째 문장');
      await run.area.press('Shift+Enter'); await run.area.pressSequentially('셋째 문장');
      await expect(run.area).toHaveValue(original.replace('메모: 첫 문장', '메모: 첫 문장\n    - 메모: 둘째 문장\n    - 메모: 셋째 문장'));
      await expect(run.page.locator('#item-note')).toHaveText('첫 문장\n둘째 문장\n셋째 문장');
      await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      const saved = await state(run.page); expect(saved.writes).toBe(1); expect(tasks(saved)).toHaveLength(tasks(run.initial).length);
      preserved(run.initial.saved, saved.saved, new Set([originalMemo.id]));
      await run.page.reload(); await expect(whole(run.page)).toHaveValue(saved.raw); expect((await state(run.page)).saved).toEqual(saved.saved);
      await expect(run.page.locator('#item-note')).toHaveText('첫 문장\n둘째 문장\n셋째 문장');
    }
  });
});

test('L4 immediate whole ShiftTabTab restores only the leased range; partial Tab is blocked and hands exact raw/caret to whole with zero writes', async ({ page, browser }, info) => {
  await pair(page, browser, info, async ([full, region]) => {
    const raw = await full.area.inputValue(); await caret(full, '둘째 할 일'); await full.area.press('Shift+Tab'); await expect(full.area).not.toHaveValue(raw);
    await full.area.press('Tab'); await expect(full.area).toHaveValue(raw); expect(await state(full.page)).toEqual(full.initial);
    const fragment = await region.area.inputValue(); await caret(region, '둘째 할 일'); await region.area.pressSequentially('x');
    await region.area.press('Tab'); await expect(region.area).toHaveValue(fragment.replace('둘째 할 일', '둘째 할 일x')); await expect(region.page.locator('#notice')).toBeVisible();
    const pending = await state(region.page), expectedCaret = pending.raw.indexOf('둘째 할 일x') + '둘째 할 일x'.length;
    await region.page.getByRole('button', { name: '전체 문서에서 계속 편집', exact: true }).click();
    await expect(whole(region.page)).toHaveValue(pending.raw); await expect(whole(region.page)).toBeFocused();
    expect(await whole(region.page).evaluate((area: HTMLTextAreaElement) => ({ start: area.selectionStart, end: area.selectionEnd }))).toEqual({ start: expectedCaret, end: expectedCaret });
    expect((await state(region.page)).saved).toEqual(region.initial.saved); expect((await state(region.page)).writes).toBe(0);
    await whole(region.page).press('Shift+Enter'); await expect(whole(region.page)).toHaveValue(pending.raw.slice(0, expectedCaret) + '\n' + pending.raw.slice(expectedCaret));
  });
});

test('L5 toolbar Undo and actual CtrlZ restore one pending native keystroke in both writers without a storage write', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const raw = await run.area.inputValue(); await caret(run, '자유 메모'); await run.area.pressSequentially('x'); await run.page.getByRole('button', { name: '입력 되돌리기', exact: true }).click();
      await expect(run.area).toHaveValue(raw); await caret(run, '자유 메모'); await run.area.pressSequentially('y'); await run.area.press('Control+z'); await expect(run.area).toHaveValue(raw);
      expect(await state(run.page)).toEqual(run.initial); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click(); expect((await state(run.page)).writes).toBe(0);
    }
  });
});

test('L6 throwing storage retains exact keyboard draft; retry, same-value save, restore and reload use only the exact lab key', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const raw = await run.area.inputValue(), changed = raw.replace('자유 메모', '자유 메모x'); await caret(run, '자유 메모'); await run.area.pressSequentially('x');
      await run.page.evaluate(() => { window.__writingLabQa.failSet = true; }); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      await expect(run.page.locator('#message')).toHaveText('실험 자료를 저장하지 못했습니다. 입력은 남아 있습니다.'); await expect(run.area).toHaveValue(changed);
      expect((await state(run.page)).saved).toEqual(run.initial.saved); expect((await state(run.page)).writes).toBe(0);
      await run.page.evaluate(() => { window.__writingLabQa.failSet = false; }); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      const saved = await state(run.page); expect(saved.writes).toBe(1); preserved(run.initial.saved, saved.saved, new Set([run.initial.saved.documents[0].lines.find(line => line.text.includes('자유 메모'))!.id]));
      await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click(); expect((await state(run.page)).writes).toBe(1);
      await caret(run, '자유 메모x'); await run.area.pressSequentially('y'); await run.page.getByRole('button', { name: '저장본으로 돌아가기', exact: true }).click(); await expect(run.area).toHaveValue(changed);
      await run.page.reload(); await expect(whole(run.page)).toHaveValue(saved.raw); expect((await state(run.page)).saved).toEqual(saved.saved);
      expect(JSON.parse((await stored(run.page))!).workspace).toEqual(saved.saved);
    }
  });
});

test('L7 synthetic composition keeps native bytes and blocks view/save until the single exact composition end', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const raw = await run.area.inputValue(); await caret(run, '자유 메모'); await run.area.dispatchEvent('compositionstart', { data: '' }); await run.area.pressSequentially('x');
      await run.page.getByRole('combobox', { name: '보기', exact: true }).selectOption(run.region ? 'whole' : 'region');
      await expect(run.page.getByRole('combobox', { name: '보기', exact: true })).toHaveValue(run.region ? 'region' : 'whole');
      await expect(run.area).toHaveValue(raw.replace('자유 메모', '자유 메모x')); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      expect(await state(run.page)).toEqual(run.initial);
      await run.area.dispatchEvent('compositionend', { data: 'x' }); await run.page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
      expect((await state(run.page)).writes).toBe(1); await expect(run.area).toHaveValue(raw.replace('자유 메모', '자유 메모x'));
    }
  });
});

test('L8 malformed storage fails closed; explicit exact-key reset restores input and a long native draft scrolls without clipping the last row', async ({ page }, info) => {
  const run = await fixture(page, { malformed: true }), corrupted = await stored(page), raw = await run.area.inputValue();
  expect(run.initial.blocked).toBe(true); await expect(run.area).not.toBeEditable(); await expect(page.locator('#message')).toContainText('자동으로 지우지 않았습니다');
  await run.area.focus(); await run.area.pressSequentially('x'); await page.getByRole('button', { name: '실험 자료 저장', exact: true }).click();
  await expect(run.area).toHaveValue(raw); expect(await stored(page)).toBe(corrupted); expect((await state(page)).writes).toBe(0);
  await page.getByRole('button', { name: '예제 초기화', exact: true }).click(); await expect(whole(page)).toBeEditable(); expect((await state(page)).blocked).toBe(false); expect(await stored(page)).toBeNull();
  const current: Run = { ...run, area: whole(page), initial: await state(page) }; await caret(current, '자유 메모');
  for (let index = 0; index < 20; index++) { await current.area.press('Enter'); await current.area.pressSequentially(`긴 화면 메모 ${index + 1}`); }
  await current.area.press('Control+End');
  const geometry = await current.area.evaluate((area: HTMLTextAreaElement) => {
    const rows = area.closest('.tle-root')!.querySelectorAll<HTMLElement>('.tle-line'), last = rows[rows.length - 1], line = last.getBoundingClientRect(), bounds = area.getBoundingClientRect();
    return { scrollTop: area.scrollTop, scrollHeight: area.scrollHeight, clientHeight: area.clientHeight, selection: area.selectionStart, rawLength: area.value.length,
      lastOffsetTop: last.offsetTop, lastOffsetHeight: last.offsetHeight, lastTop: line.top, lastBottom: line.bottom, areaTop: bounds.top, areaBottom: bounds.bottom };
  });
  await info.attach('long-native-scroll', { contentType: 'application/json', body: JSON.stringify(geometry) });
  await run.boundary(info);
  await expect.poll(() => current.area.evaluate((area: HTMLTextAreaElement) => {
    const rows = area.closest('.tle-root')!.querySelectorAll<HTMLElement>('.tle-line'), last = rows[rows.length - 1];
    return area.scrollTop > 0 && last.offsetTop >= area.scrollTop - 1 && last.offsetTop + last.offsetHeight <= area.scrollTop + area.clientHeight + 1;
  })).toBe(true);
  expect(geometry.selection).toBe(geometry.rawLength); expect((await state(page)).writes).toBe(0); expect(await stored(page)).toBeNull();
});
