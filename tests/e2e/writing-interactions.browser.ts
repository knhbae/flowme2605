import { test, expect, type Browser, type Locator, type Page, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease, RELEASE_ORIGIN } from './cloudflare-release.fixture';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';
import { readProgramFolderRegions } from '../../lib/flow/integrated-poc/folder-document-regions';

const ids = { parent: 'keys-company', work: 'keys-work', child: 'keys-child', personal: 'keys-personal', homonym: 'keys-homonym' };
const title = '키보드 합성 문서';
const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
const fullArea = (page: Page) => editor(page).locator('[data-native-editor="v11-core"] textarea');
const regionAreas = (page: Page) => editor(page).getByRole('textbox', { name: /^폴더 영역 \d+ 원문$/ });
const scope = (page: Page) => page.getByRole('combobox', { name: '폴더', exact: true });
const views = (page: Page) => page.getByRole('navigation', { name: '개인공간 보기' });
const sync = (page: Page) => page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('status');
const continueWhole = (page: Page) => editor(page).getByRole('button', { name: /전체.*계속.*편집|전체.*편집.*계속/ });
type Mock = Awaited<ReturnType<typeof mockCloudflareRelease>>;
type Run = { page: Page; mock: Mock; area: Locator; partial: boolean; seed: TextWorkspaceState };

/** Build one state, then clone it into separate browser contexts. Native whole
 * and region input therefore start with the same bytes, IDs and dated records.
 * No account, API, source fetch or operating storage is used to seed this data. */
function fixture(existingBlank = false) {
  let text = M.addDocument(createEmptyTextWorkspace(), { title });
  text = { ...text, folders: [...text.folders,
    { id: ids.parent, title: '회사', parentId: null }, { id: ids.work, title: '업무', parentId: ids.parent },
    { id: ids.child, title: '하위', parentId: ids.work }, { id: ids.personal, title: '개인', parentId: null },
    { id: ids.homonym, title: '업무', parentId: ids.personal }] };
  const docId = text.documents[0].id;
  const append = (raw: string) => { text = M.editText(text, docId, [M.raw(M.getDocument(text, docId)), raw].filter(Boolean).join('\n')); };
  const linked = (folderId: string, body: string) => {
    append('- ');
    const index = M.getDocument(text, docId)!.lines.length - 1;
    text = M.attachScope(text, docId, index, folderId);
    if (M.rowMeta(text, docId)[index]?.scopeId !== folderId) throw Error('writing-interactions-synthetic-scope-rejected');
    append(body);
  };
  append('숨은 앞 문장  \t\n[2026-10-01]');
  linked(ids.work, '  - 일반 목록 메모\n  일반 본문 메모\n  - [ ] 앞 할 일\n  - [ ] 첫 할 일\n    - 메모: 첫 설명\n    - 시간: 09:00\n    - [ ] 하위 할 일\n  - [ ] 단독 할 일' + (existingBlank ? '\n  - [ ] ' : ''));
  append('숨은 사이 문장\u200b  \n- [ ] 숨은 할 일\n[2026-10-02]');
  linked(ids.work, '  - 둘째 영역 메모\n  - [ ] 둘째 영역 할 일');
  linked(ids.child, '  - 하위 영역 메모\n  - [ ] 하위 영역 할 일');
  append('숨은 끝 문장  ');
  const first = M.tasks(text).find(task => task.title === '첫 할 일')!;
  text = M.recordProgress(text, first.id, '2026-09-30', 20);
  text = M.addDocument(text, { title: '변경하지 않는 문서', folderId: ids.homonym });
  text = M.editText(text, text.documents.at(-1)!.id, '다른 문서 원문  \n- [ ] 다른 경로 할 일');
  if (!M.validate(text)) throw Error('writing-interactions-synthetic-text-invalid');
  return text;
}

async function choose(page: Page, folderId: string) {
  if (!await scope(page).isVisible()) await page.getByRole('button', { name: /^문서·폴더 열기/ }).click();
  await scope(page).selectOption(folderId);
}

async function boot(page: Page, seed = fixture(), partial = false): Promise<Run> {
  // Empty account position is valid for both exact clones; opening the seeded
  // document below is an ordinary zero-write navigation action.
  const mock = await mockCloudflareRelease(page, { prepareText: () => structuredClone(seed) });
  await page.goto(`${RELEASE_ORIGIN}/alpha`); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await management.locator('summary').click();
  // Auth identity is visible before the asynchronous workspace read settles.
  // The seeded empty position always opens the library once that read completes.
  await expect(page.locator('#program-library')).toBeVisible();
  await page.locator('#program-library').getByRole('button', { name: new RegExp(`^${title}`) }).click();
  await expect(fullArea(page)).toHaveValue(M.raw(seed.documents[0]));
  if (partial) { await choose(page, ids.work); await expect(regionAreas(page)).toHaveCount(3); }
  const area = partial ? regionAreas(page).first() : fullArea(page);
  await expect(area).toBeVisible(); await expect(area).toBeEditable();
  return { page, mock, area, partial, seed };
}

async function pair(page: Page, browser: Browser, info: TestInfo, action: (runs: Run[]) => Promise<void>, seed = fixture()) {
  const full = await boot(page, seed);
  const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined, serviceWorkers: 'block' });
  try {
    const partial = await boot(await context.newPage(), seed, true);
    expect((await full.mock.current()).space.text).toEqual((await partial.mock.current()).space.text);
    await action([full, partial]);
    await full.mock.assertBoundary(info); await partial.mock.assertBoundary(info);
  } finally { await context.close(); }
}

async function pause(run: Run) {
  await run.page.clock.install();
  // Never move virtual time backwards from the clock's installation instant.
  await run.page.clock.pauseAt(await run.page.evaluate(() => Date.now() + 1_000));
}

async function caret(run: Run, needle: string, location: 'start' | 'end' = 'end') {
  await run.area.focus();
  await run.area.evaluate((area: HTMLTextAreaElement, options) => {
    const index = area.value.indexOf(options.needle);
    if (index < 0) throw Error(`synthetic-key-row-missing:${options.needle}`);
    const end = area.value.indexOf('\n', index);
    const offset = options.location === 'start' ? index : end < 0 ? area.value.length : end;
    area.setSelectionRange(offset, offset);
  }, { needle, location });
}

function assembled(run: Run, raw: string) {
  if (!run.partial) return raw;
  const view = readProgramFolderRegions(run.seed, run.seed.documents[0].id, ids.work)!;
  const region = view.regions[0], lines = view.fullRaw.split('\n');
  lines.splice(region.startIndex, region.endIndex - region.startIndex, ...raw.split('\n'));
  return lines.join('\n');
}

function protectedState(before: TextWorkspaceState, after: TextWorkspaceState, edited: Set<string>) {
  const source = before.documents[0], result = M.getDocument(after, source.id)!;
  const originalIds = new Set(source.lines.map(line => line.id));
  const hidden = source.lines.filter(line => !edited.has(line.id)), hiddenIds = new Set(hidden.map(line => line.id));
  expect(result.lines.filter(line => hiddenIds.has(line.id))).toEqual(hidden);
  expect(result.lines.filter(line => originalIds.has(line.id)).map(line => line.id)).toEqual(source.lines.map(line => line.id));
  expect(after.documents.slice(1)).toEqual(before.documents.slice(1)); expect(after.flows).toEqual(before.flows);
  expect(after.folders).toEqual(before.folders); expect(after.bindings).toEqual(before.bindings);
  expect(after.progressRecords).toEqual(before.progressRecords);
  for (const kind of ['taskScopes', 'itemScopes'] as const) {
    for (const [id, value] of Object.entries(before[kind])) expect(after[kind][id]).toBe(value);
  }
  for (const task of M.tasks(before)) {
    const current = M.tasks(after).find(entry => entry.id === task.id)!;
    expect(current).toBeTruthy();
    for (const field of ['date', 'groupDate', 'scopeId', 'parentItemId', 'parentTaskId', 'isCanonical', 'done'] as const) expect(current[field]).toEqual(task[field]);
  }
}

const editedRegionIds = (run: Run) => new Set(readProgramFolderRegions(run.seed, run.seed.documents[0].id, ids.work)!.regions[0].lineIds);
const savedRaw = async (run: Run) => M.raw((await run.mock.current()).space.text.documents[0]);
async function saveTimer(run: Run, expected: string) {
  await run.page.clock.runFor(700);
  await expect.poll(() => savedRaw(run)).toBe(expected);
}

test('W1 same native mirror and display modes retain source; five viewports expose keyboard controls without writes', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      const before = await run.mock.current(), diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
      await expect(run.area).toHaveClass(/tle-textarea/);
      expect(await run.area.evaluate(area => !!area.closest('.tle-root')?.querySelector('.tle-presentation .tle-line'))).toBe(true);
      for (const mode of ['원문', '문서']) {
        await editor(run.page).getByRole('button', { name: mode, exact: true }).click();
        await expect(run.area).toHaveValue(raw);
        expect(await run.area.evaluate(area => area.closest<HTMLElement>('.tle-root')?.dataset.mode)).toBe(mode === '원문' ? 'text' : 'live');
      }
      await run.page.evaluate(() => scrollTo(0, 0));
      const screenshotPath = info.outputPath(`${run.partial ? 'region' : 'whole'}-first-viewport.png`);
      await run.page.screenshot({ path: screenshotPath });
      await info.attach(`${run.partial ? 'region' : 'whole'}-first-viewport`, { contentType: 'image/png', path: screenshotPath });
      const geometry = await editor(run.page).evaluate(element => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        targets: [...element.firstElementChild!.querySelectorAll<HTMLElement>('button,summary')].filter(control => control.checkVisibility())
          .map(control => ({ name: control.getAttribute('aria-label') || control.textContent?.trim(), height: control.getBoundingClientRect().height })),
      }));
      expect(geometry.overflow).toBeLessThanOrEqual(1); expect(geometry.targets.every(control => control.height >= 48)).toBe(true);
      await run.area.scrollIntoViewIfNeeded(); await run.area.focus(); await run.area.press('Escape'); await run.area.press('Tab');
      await expect(run.area).not.toBeFocused(); await expect(run.area).toHaveValue(raw);
      expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics);
      await info.attach(`${run.partial ? 'region' : 'whole'}-geometry`, { contentType: 'application/json', body: JSON.stringify(geometry) });
    }
  });
});

test('W2 actual Todo Enter keeps sibling depth and exits only its new empty scaffold, preserving old Items and hidden bytes', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const raw = await run.area.inputValue();
      await caret(run, '단독 할 일'); await run.area.press('Enter');
      await expect(run.area).toHaveValue(raw.replace('단독 할 일', '단독 할 일\n  - [ ] '));
      await run.area.pressSequentially('새 키 할 일'); await run.area.press('Enter'); await run.area.press('Enter');
      const expected = raw.replace('단독 할 일', '단독 할 일\n  - [ ] 새 키 할 일\n');
      await expect(run.area).toHaveValue(expected); await saveTimer(run, assembled(run, expected));
      const after = (await run.mock.current()).space.text;
      protectedState(run.seed, after, editedRegionIds(run));
      expect(M.tasks(after)).toHaveLength(M.tasks(run.seed).length + 1);
      const added = M.tasks(after).find(task => task.title === '새 키 할 일')!;
      expect(added.scopeId).toBe(ids.work); expect(added.depth).toBe(1); expect(added.date).toBe('2026-10-01');
    }
    expect(await savedRaw(runs[0])).toBe(await savedRaw(runs[1]));
  });
});

test('W13 task-title end Enter creates its sibling after memo/time/children without reparenting any existing Item', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const raw = await run.area.inputValue();
      await caret(run, '첫 할 일'); await run.area.press('Enter');
      const scaffold = raw.replace('하위 할 일\n', '하위 할 일\n  - [ ] \n');
      await expect(run.area).toHaveValue(scaffold);
      await run.area.pressSequentially('새 형제 할 일');
      const expected = raw.replace('하위 할 일\n', '하위 할 일\n  - [ ] 새 형제 할 일\n');
      await expect(run.area).toHaveValue(expected); await saveTimer(run, assembled(run, expected));
      const after = (await run.mock.current()).space.text;
      protectedState(run.seed, after, editedRegionIds(run));
      const original = M.tasks(run.seed).find(item => item.title === '첫 할 일')!, current = M.tasks(after).find(item => item.id === original.id)!;
      expect(current.note).toBe(original.note); expect(current.time).toBe(original.time);
      expect(current.subchecks.map(item => item.id)).toEqual(original.subchecks.map(item => item.id));
      expect(M.tasks(after).find(item => item.title === '새 형제 할 일')?.parentItemId).toBe(original.parentItemId);
    }
    expect(await savedRaw(runs[0])).toBe(await savedRaw(runs[1]));
  });
});

test('W14 Enter then save-pause then ordinary memo typing preserves a scoped source blank identity and hidden Items', async ({ page }, info) => {
  const run = await boot(page, fixture(), true); await pause(run); const raw = await run.area.inputValue();
  await caret(run, '일반 본문 메모'); await run.area.press('Enter');
  const withBlank = raw.replace('일반 본문 메모\n', '일반 본문 메모\n  \n');
  await expect(run.area).toHaveValue(withBlank); await saveTimer(run, assembled(run, withBlank));
  const paused = (await run.mock.current()).space.text, doc = paused.documents[0];
  const blank = doc.lines.find((line, index) => line.text === '  ' && doc.lines[index - 1]?.text.includes('일반 본문 메모'))!;
  expect(blank).toBeTruthy();
  await run.area.pressSequentially('잠시 뒤 메모');
  const expected = raw.replace('일반 본문 메모\n', '일반 본문 메모\n  잠시 뒤 메모\n');
  await expect(run.area).toHaveValue(expected); await saveTimer(run, assembled(run, expected));
  const after = (await run.mock.current()).space.text;
  expect(after.documents[0].lines.find(line => line.id === blank.id)?.text).toBe('  잠시 뒤 메모');
  protectedState(run.seed, after, editedRegionIds(run));
  expect(M.tasks(after)).toHaveLength(M.tasks(run.seed).length); await run.mock.assertBoundary(info);
});

test('W15 saved partial blank materializes its old ID then one immediate same-depth memo without promoting an Item', async ({ page }, info) => {
  const run = await boot(page, fixture(), true); await pause(run); const raw = await run.area.inputValue();
  await caret(run, '일반 본문 메모'); await run.area.press('Enter');
  const withBlank = raw.replace('일반 본문 메모\n', '일반 본문 메모\n  \n');
  await expect(run.area).toHaveValue(withBlank); await saveTimer(run, assembled(run, withBlank));
  const paused = (await run.mock.current()).space.text, doc = paused.documents[0];
  const blank = doc.lines.find((line, index) => line.text === '  ' && doc.lines[index - 1]?.text === '  일반 본문 메모')!;
  expect(blank).toBeTruthy();
  const diagnostics = run.mock.diagnostics(), commands = run.mock.commands.length;
  // The clock is paused throughout these actual keys: no 450 ms autosave can
  // split old-blank materialization from its immediately following new memo.
  await run.area.pressSequentially('쉬었다 쓴 메모'); await run.area.press('Enter');
  await run.area.pressSequentially('바로 다음 메모');
  const expected = raw.replace('일반 본문 메모\n', '일반 본문 메모\n  쉬었다 쓴 메모\n  바로 다음 메모\n');
  await expect(run.area).toHaveValue(expected);
  expect(run.mock.diagnostics()).toEqual(diagnostics); expect(run.mock.commands).toHaveLength(commands);
  await saveTimer(run, assembled(run, expected));
  const after = (await run.mock.current()).space.text, result = after.documents[0];
  expect(result.lines.find(line => line.id === blank.id)?.text).toBe('  쉬었다 쓴 메모');
  protectedState(run.seed, after, new Set()); protectedState(paused, after, new Set([blank.id]));
  const pausedIds = new Set(doc.lines.map(line => line.id)), added = result.lines.filter(line => !pausedIds.has(line.id));
  expect(added).toHaveLength(1); expect(added[0].text).toBe('  바로 다음 메모');
  const addedRow = M.rowMeta(after, result.id).find(row => row.id === added[0].id)!;
  expect(addedRow.kind).toBe('note'); expect(addedRow.depth).toBe(1);
  expect(addedRow.ancestorScopeId).toBe(ids.work); expect(addedRow.groupDate).toBe('2026-10-01');
  const items = (state: TextWorkspaceState) => JSON.parse(JSON.stringify(M.parseDocument(state.documents[0], state).items,
    (key, value) => key === 'sourceIndex' ? undefined : value));
  expect(items(after)).toEqual(items(paused));
  expect(run.mock.diagnostics()).toEqual({ mutations: diagnostics.mutations + 1, operations: diagnostics.operations + 1 });
  expect(run.mock.commands).toHaveLength(commands + 1); await run.mock.assertBoundary(info);
});

test('W3 actual ordinary-list Enter continues ordinary notes without creating a Todo in either writer', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const raw = await run.area.inputValue();
      await caret(run, '일반 목록 메모'); await run.area.press('Enter'); await run.area.pressSequentially('후속 목록 메모');
      const expected = raw.replace('일반 목록 메모', '일반 목록 메모\n  - 후속 목록 메모');
      await expect(run.area).toHaveValue(expected); await saveTimer(run, assembled(run, expected));
      const after = (await run.mock.current()).space.text;
      protectedState(run.seed, after, editedRegionIds(run)); expect(M.tasks(after)).toHaveLength(M.tasks(run.seed).length);
      expect(M.rowMeta(after, after.documents[0].id).find(row => row.text.includes('후속 목록 메모'))!.kind).toBe('note');
    }
    expect(await savedRaw(runs[0])).toBe(await savedRaw(runs[1]));
  });
});

test('W4 memo-property Enter and ShiftEnter repeat existing memo syntax and append multiline note to the same Item', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const raw = await run.area.inputValue(), task = M.tasks(run.seed).find(entry => entry.title === '첫 할 일')!;
      await caret(run, '메모: 첫 설명'); await run.area.press('Enter'); await run.area.pressSequentially('둘째 설명');
      await run.area.press('Shift+Enter'); await run.area.pressSequentially('셋째 설명');
      const expected = raw.replace('메모: 첫 설명', '메모: 첫 설명\n    - 메모: 둘째 설명\n    - 메모: 셋째 설명');
      await expect(run.area).toHaveValue(expected); await saveTimer(run, assembled(run, expected));
      const after = (await run.mock.current()).space.text, same = M.tasks(after).find(entry => entry.id === task.id)!;
      expect(same.note).toBe('첫 설명\n둘째 설명\n셋째 설명'); expect(same.time).toBe('09:00');
      expect(M.tasks(after)).toHaveLength(M.tasks(run.seed).length); protectedState(run.seed, after, editedRegionIds(run));
    }
    expect(await savedRaw(runs[0])).toBe(await savedRaw(runs[1]));
  });
});

test('W5 whole Tab then immediate ShiftTab restores exactly the affected subtree; region structure keys are zero-write with whole recovery', async ({ page, browser }, info) => {
  await pair(page, browser, info, async ([whole, region]) => {
    for (const run of [whole, region]) await pause(run);
    const original = await whole.area.inputValue(), before = await whole.mock.current(), diagnostics = whole.mock.diagnostics();
    await caret(whole, '첫 할 일'); await whole.area.press('Tab');
    await expect(whole.area).not.toHaveValue(original); await expect(whole.area).toBeFocused();
    await whole.area.press('Shift+Tab'); await expect(whole.area).toHaveValue(original);
    await whole.page.clock.runFor(700); expect(await whole.mock.current()).toEqual(before); expect(whole.mock.diagnostics()).toEqual(diagnostics);
    const fragment = await region.area.inputValue(), regionBefore = await region.mock.current(), regionDiagnostics = region.mock.diagnostics();
    for (const key of ['Tab', 'Shift+Tab']) {
      await caret(region, '첫 할 일'); await region.area.press(key); await expect(region.area).toHaveValue(fragment);
      await expect(continueWhole(region.page)).toBeVisible();
      expect(await region.mock.current()).toEqual(regionBefore); expect(region.mock.diagnostics()).toEqual(regionDiagnostics);
    }
    await region.area.focus();
    await region.area.evaluate((area: HTMLTextAreaElement) => {
      const lines = area.value.split('\n'), index = lines.findIndex(line => /^ *- \[ \] *$/.test(line));
      if (index < 0) throw Error('synthetic-existing-empty-scaffold-missing');
      const offset = lines.slice(0, index + 1).join('\n').length;
      area.setSelectionRange(offset, offset);
    });
    await region.area.press('Enter'); await expect(region.area).toHaveValue(fragment);
    await expect(continueWhole(region.page)).toBeVisible();
    expect(await region.mock.current()).toEqual(regionBefore); expect(region.mock.diagnostics()).toEqual(regionDiagnostics);
    await region.area.focus(); await region.area.press('Escape'); await region.area.press('Tab'); await expect(region.area).not.toBeFocused();
    await region.page.clock.runFor(700); expect(await region.mock.current()).toEqual(regionBefore);
  }, fixture(true));
});

test('W6 rejected partial key plus pending typing stages exact full raw and caret with zero writes; prose ShiftEnter remains a literal newline', async ({ page }, info) => {
  const run = await boot(page, fixture(), true); await pause(run);
  const before = await run.mock.current(), diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
  await caret(run, '일반 본문 메모'); await run.area.pressSequentially('x'); await run.area.press('Tab');
  const fragment = raw.replace('일반 본문 메모', '일반 본문 메모x');
  await expect(run.area).toHaveValue(fragment); await expect(continueWhole(page)).toBeVisible();
  const expected = assembled(run, fragment), expectedCaret = expected.indexOf('일반 본문 메모x') + '일반 본문 메모x'.length;
  await continueWhole(page).click(); await expect(fullArea(page)).toBeVisible(); await expect(fullArea(page)).toHaveValue(expected); await expect(fullArea(page)).toBeFocused();
  expect(await fullArea(page).evaluate((area: HTMLTextAreaElement) => ({ start: area.selectionStart, end: area.selectionEnd }))).toEqual({ start: expectedCaret, end: expectedCaret });
  expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics);
  await fullArea(page).press('Shift+Enter');
  await expect(fullArea(page)).toHaveValue(expected.slice(0, expectedCaret) + '\n' + expected.slice(expectedCaret));
  expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics); await run.mock.assertBoundary(info);
});

test('W7 one real pending keystroke is undone by toolbar and CtrlZ without a native remount or save', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const before = await run.mock.current(), diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
      await caret(run, '일반 목록 메모'); await run.area.pressSequentially('x');
      await expect(run.area).toHaveValue(raw.replace('일반 목록 메모', '일반 목록 메모x'));
      await editor(run.page).getByRole('button', { name: '입력 되돌리기', exact: true }).click(); await expect(run.area).toHaveValue(raw);
      await caret(run, '일반 목록 메모'); await run.area.pressSequentially('y'); await run.area.press('Control+z'); await expect(run.area).toHaveValue(raw);
      await run.page.clock.runFor(700); expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics);
    }
  });
});

test('W8 keyboard region save survives whole/period/original return, saved Undo and reload with hidden IDs intact', async ({ page }, info) => {
  const run = await boot(page, fixture(), true), before = await run.mock.current(), task = M.tasks(run.seed).find(entry => entry.title === '첫 할 일')!;
  const raw = await run.area.inputValue(); await caret(run, '일반 목록 메모'); await run.area.pressSequentially('x');
  await expect.poll(() => savedRaw(run)).toBe(assembled(run, raw.replace('일반 목록 메모', '일반 목록 메모x')));
  const saved = await run.mock.current(); protectedState(before.space.text, saved.space.text, editedRegionIds(run));
  await views(page).getByRole('button', { name: '전체 할 일', exact: true }).click();
  const row = page.locator(`[data-task-id="${task.id}"]`); await expect(row).toContainText('회사 / 업무 / 키보드 합성 문서');
  await row.getByRole('button', { name: /^첫 할 일 2026-10-01/ }).click();
  await expect(fullArea(page)).toBeVisible(); await expect(fullArea(page)).toHaveValue(M.raw(saved.space.text.documents[0]));
  await expect.poll(() => fullArea(page).evaluate((area: HTMLTextAreaElement) => area.value.slice(0, area.selectionStart).split('\n').length - 1)).toBe(task.sourceIndex);
  await editor(page).getByRole('button', { name: '입력 되돌리기', exact: true }).click();
  await expect.poll(() => savedRaw(run)).toBe(M.raw(before.space.text.documents[0]));
  await page.reload(); await expect(fullArea(page)).toHaveValue(M.raw(before.space.text.documents[0]));
  expect((await run.mock.current()).space.text).toEqual(before.space.text); await run.mock.assertBoundary(info);
});

test('W9 synthetic composition blocks parser/save/scope navigation in both native writers and publishes exact input once at end', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const before = await run.mock.current(), diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
      await caret(run, '일반 목록 메모'); await run.area.dispatchEvent('compositionstart', { data: '' }); await run.area.pressSequentially('x');
      await choose(run.page, run.partial ? ids.child : ids.work);
      await expect(scope(run.page)).toHaveValue(run.partial ? ids.work : '');
      await expect(run.area).toHaveValue(raw.replace('일반 목록 메모', '일반 목록 메모x'));
      await run.page.clock.runFor(700); expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics);
      await run.area.dispatchEvent('compositionend', { data: 'x' });
      const expected = assembled(run, raw.replace('일반 목록 메모', '일반 목록 메모x')); await saveTimer(run, expected);
      expect(run.mock.diagnostics()).toEqual({ mutations: diagnostics.mutations + 1, operations: diagnostics.operations + 1 });
      protectedState(run.seed, (await run.mock.current()).space.text, editedRegionIds(run));
    }
  });
});

test('W10 rejected keyboard save retains exact newer input and retries one full model without changing hidden source', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const before = await run.mock.current(), diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
      run.mock.state.rejectNextExecute = 'limit'; await caret(run, '일반 목록 메모'); await run.area.pressSequentially('x');
      await run.page.clock.runFor(700); await expect(editor(run.page).getByRole('button', { name: '다시 저장', exact: true })).toBeVisible();
      expect(await run.mock.current()).toEqual(before); expect(run.mock.diagnostics()).toEqual(diagnostics);
      await caret(run, '일반 목록 메모x'); await run.area.pressSequentially('y');
      const fragment = raw.replace('일반 목록 메모', '일반 목록 메모xy'); await expect(run.area).toHaveValue(fragment);
      // Valid new input clears the old error and schedules its ordinary retry.
      // Do not require a stale error's button to survive that transition.
      await run.page.clock.runFor(700);
      await expect.poll(() => savedRaw(run)).toBe(assembled(run, fragment)); await expect(run.area).toHaveValue(fragment);
      await run.page.clock.runFor(700); expect(run.mock.diagnostics()).toEqual({ mutations: diagnostics.mutations + 1, operations: diagnostics.operations + 1 });
      protectedState(run.seed, (await run.mock.current()).space.text, editedRegionIds(run));
    }
  });
});

test('W11 a lost keyboard-save receipt confirms the same request without duplicate mutation or caret loss and reloads exact text', async ({ page, browser }, info) => {
  await pair(page, browser, info, async runs => {
    for (const run of runs) {
      await pause(run); const diagnostics = run.mock.diagnostics(), raw = await run.area.inputValue();
      run.mock.state.loseNextReceipt = true; await caret(run, '일반 목록 메모'); await run.area.pressSequentially('x');
      const selection = await run.area.evaluate((area: HTMLTextAreaElement) => ({ start: area.selectionStart, end: area.selectionEnd }));
      await run.page.clock.runFor(700); await expect(sync(run.page)).toHaveText('저장 결과 확인이 필요합니다');
      const own = run.mock.state.lostRequestId; expect(own).not.toBeNull();
      await run.page.getByRole('button', { name: '저장 결과 확인 · 같은 요청 재시도', exact: true }).click();
      await expect(sync(run.page)).toHaveText('서버 저장 확인');
      expect(run.mock.lookups).toContain(own); expect(run.mock.commands.filter(command => command.requestId === own)).toHaveLength(1);
      expect(run.mock.diagnostics()).toEqual({ mutations: diagnostics.mutations + 1, operations: diagnostics.operations + 1 });
      await expect(run.area).toHaveValue(raw.replace('일반 목록 메모', '일반 목록 메모x'));
      expect(await run.area.evaluate((area: HTMLTextAreaElement) => ({ start: area.selectionStart, end: area.selectionEnd }))).toEqual(selection);
      const saved = await run.mock.current(); protectedState(run.seed, saved.space.text, editedRegionIds(run));
      await run.page.reload(); await expect(fullArea(run.page)).toHaveValue(M.raw(saved.space.text.documents[0]));
      expect((await run.mock.current()).space.text).toEqual(saved.space.text);
    }
  });
});

test('W12 stale external revision blocks region-to-whole staging and preserves exact recoverable draft without an extra local command', async ({ page }, info) => {
  const run = await boot(page, fixture(), true); await pause(run);
  const original = await run.mock.current(), raw = await run.area.inputValue(), commands = run.mock.commands.length;
  await caret(run, '일반 목록 메모'); await run.area.pressSequentially('x');
  const fragment = raw.replace('일반 목록 메모', '일반 목록 메모x');
  await run.area.press('Tab'); await expect(run.area).toHaveValue(fragment); await expect(continueWhole(page)).toBeVisible();
  await run.mock.externalTextEdit(run.seed.documents[0].id, M.raw(run.seed.documents[0]).replace('숨은 사이 문장', '외부 저장 문장'));
  await page.clock.fastForward(20_100);
  await expect(page.getByRole('region', { name: '다른 기기 변경과 입력 보호', exact: true })).toBeVisible();
  await expect(run.area).toHaveValue(fragment); await expect(continueWhole(page)).toBeVisible();
  // Advancing to the polling interval may also fire the original autosave:
  // its older CAS can be rejected without a mutation. The protected handoff
  // below must neither stage the input nor issue another command.
  const protectedCommands = run.mock.commands.length, protectedDiagnostics = run.mock.diagnostics();
  expect(protectedDiagnostics).toEqual({ mutations: 1, operations: 1 });
  await info.attach('stale-handoff-before', { contentType: 'application/json', body: JSON.stringify({
    commandsBefore: commands, commandsNow: run.mock.commands.length, diagnostics: run.mock.diagnostics(),
    originalRevision: original.revision, savedRevision: (await run.mock.current()).revision,
    continueEnabled: await continueWhole(page).isEnabled(), fragment: await run.area.inputValue(),
  }) });
  if (await continueWhole(page).isEnabled()) await continueWhole(page).click();
  await info.attach('stale-handoff-after', { contentType: 'application/json', body: JSON.stringify({
    commandsNow: run.mock.commands.length, diagnostics: run.mock.diagnostics(),
    regionVisible: await run.area.isVisible(), wholeVisible: await fullArea(page).isVisible(),
    wholeRaw: await fullArea(page).count() ? await fullArea(page).inputValue() : null,
  }) });
  await expect(run.area).toBeVisible(); await expect(run.area).toHaveValue(fragment); await expect(fullArea(page)).not.toBeVisible();
  expect(run.mock.commands).toHaveLength(protectedCommands); expect(run.mock.diagnostics()).toEqual(protectedDiagnostics);
  const saved = await run.mock.current(); expect(M.raw(saved.space.text.documents[0])).toContain('외부 저장 문장');
  expect(M.raw(saved.space.text.documents[0])).not.toContain('일반 목록 메모x');
  const downloadPromise = page.waitForEvent('download');
  await editor(page).getByRole('button', { name: '입력한 원문 받기', exact: true }).first().click();
  const stream = await (await downloadPromise).createReadStream(); expect(stream).not.toBeNull();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(assembled(run, fragment));
  expect((await run.mock.current()).space.text).toEqual(saved.space.text);
  expect(original.space.text.documents[0].lines.map(line => line.id)).toEqual(saved.space.text.documents[0].lines.map(line => line.id));
  await run.mock.assertBoundary(info);
});
