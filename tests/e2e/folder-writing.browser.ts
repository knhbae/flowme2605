import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';
import { readProgramFolderRegions } from '../../lib/flow/integrated-poc/folder-document-regions';

const ids = { parent: 'qa-company', work: 'qa-work', child: 'qa-child', personal: 'qa-personal', homonym: 'qa-homonym' };
const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
const fullArea = (page: Page) => editor(page).locator('[data-native-editor] textarea');
const scope = (page: Page) => page.getByRole('combobox', { name: '폴더', exact: true });
const areas = (page: Page) => editor(page).getByRole('textbox', { name: /^폴더 영역 \d+ 원문$/ });
const views = (page: Page) => page.getByRole('navigation', { name: '개인공간 보기' });
const sync = (page: Page) => page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('status');
type Mock = Awaited<ReturnType<typeof mockCloudflareRelease>>;

/** Only synthetic fixture state. Bind empty scopes through the existing model
 * before adding children; this never repairs or reassigns a production Item. */
function prepareText(initial: TextWorkspaceState): TextWorkspaceState {
  let text = { ...initial, folders: [...initial.folders,
    { id: ids.parent, title: '회사', parentId: null }, { id: ids.work, title: '업무', parentId: ids.parent },
    { id: ids.child, title: '하위', parentId: ids.work }, { id: ids.personal, title: '개인', parentId: null },
    { id: ids.homonym, title: '업무', parentId: ids.personal }] };
  const docId = text.documents[0].id;
  const append = (raw: string) => { text = M.editText(text, docId, [M.raw(M.getDocument(text, docId)), raw].filter(Boolean).join('\n')); };
  const linked = (folderId: string, body: string) => {
    append('- ');
    const at = M.getDocument(text, docId)!.lines.length - 1;
    text = M.attachScope(text, docId, at, folderId);
    if (M.rowMeta(text, docId)[at]?.scopeId !== folderId) throw Error('folder-writing-synthetic-link-failed');
    append(body);
  };
  append('[2026-10-01]');
  linked(ids.work, '  - 첫 메모\n  - [ ] 첫 할 일\n    - 메모: 설명 보존\n    - 시간: 09:00');
  append('외부 문장 보존\n- [ ] 외부 할 일\n[2026-10-02]');
  linked(ids.work, '  - 둘째 메모\n  - [ ] 둘째 할 일');
  linked(ids.child, '  - 하위 메모\n  - [ ] 하위 할 일');
  append('- 업무');
  text = M.addDocument(text, { title: '다른 문서', folderId: ids.homonym });
  const otherId = text.documents.at(-1)!.id;
  text = M.editText(text, otherId, '다른 문서 일반 메모\n- [ ] 다른 경로 할 일');
  if (!M.validate(text)) throw Error('folder-writing-synthetic-text-invalid');
  return text;
}

async function boot(page: Page) {
  const mock = await mockCloudflareRelease(page, { document: { title: '합성 폴더 작성', raw: '' }, prepareText });
  await page.goto('/alpha'); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await management.locator('summary').click();
  await expect(fullArea(page)).toHaveValue(M.raw((await mock.current()).space.text.documents[0]));
  return mock;
}

async function choose(page: Page, folderId: string) {
  if (!await scope(page).isVisible()) await page.getByRole('button', { name: /^문서·폴더 열기/ }).click();
  await scope(page).selectOption(folderId);
}

async function checkBoundary(page: Page, mock: Mock, info: TestInfo) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await mock.assertBoundary(info);
}

async function firstAreaEdit(page: Page, mock: Mock, change: (raw: string) => string) {
  const area = areas(page).first(), raw = change(await area.inputValue());
  await area.fill(raw);
  await expect.poll(async () => {
    const state = (await mock.current()).space.text;
    return readProgramFolderRegions(state, state.documents[0].id, ids.work)?.regions[0].raw;
  }).toBe(raw);
  await expect(area).toHaveValue(raw);
}

test('folder range is a zero-write view: disjoint regions, parent, homonym, other-document-only and whole return', async ({ page }, info) => {
  const mock = await boot(page), before = await mock.current(), diagnostics = mock.diagnostics();
  await choose(page, ids.work);
  await expect(areas(page)).toHaveCount(3);
  expect(await areas(page).nth(0).inputValue()).toContain('첫 메모');
  expect(await areas(page).nth(1).inputValue()).toContain('둘째 메모');
  expect(await areas(page).nth(2).inputValue()).toContain('하위 메모');
  expect((await areas(page).evaluateAll(entries => entries.map(entry => (entry as HTMLTextAreaElement).value))).join('\n')).not.toContain('외부 문장 보존');
  await choose(page, ids.parent); await expect(areas(page)).toHaveCount(3);
  await choose(page, ids.child); await expect(areas(page)).toHaveCount(1);
  expect(await areas(page).inputValue()).toContain('하위 할 일');
  await choose(page, ids.homonym); await expect(areas(page)).toHaveCount(0);
  await expect(editor(page)).toContainText('현재 문서에는 이 폴더의 연결 영역이나 할 일이 없습니다.');
  await expect(page.locator('#program-library').getByRole('button', { name: /^다른 문서/ })).toBeVisible();
  await expect(scope(page).locator('option:checked')).toHaveText('개인 / 업무');
  await choose(page, ''); await expect(fullArea(page)).toBeVisible();
  await expect(fullArea(page)).toHaveValue(M.raw(before.space.text.documents[0]));
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await checkBoundary(page, mock, info);
});

test('region note, task and time share original IDs through whole, period, Undo and reload', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0];
  const task = M.tasks(original.space.text).find(entry => entry.title === '첫 할 일')!;
  const view = readProgramFolderRegions(original.space.text, doc.id, ids.work)!;
  const visible = new Set(view.regions[0].lineIds), hidden = doc.lines.filter(line => !visible.has(line.id));
  await choose(page, ids.work);
  await firstAreaEdit(page, mock, raw => raw.replace('첫 메모', '첫 메모 수정'));
  await firstAreaEdit(page, mock, raw => raw.replace('첫 할 일', '첫 할 일 수정'));
  const beforeTime = await mock.current();
  await firstAreaEdit(page, mock, raw => raw.replace('09:00', '10:30'));
  let saved = await mock.current();
  expect(saved.space.text.documents[0].lines.filter(line => !visible.has(line.id))).toEqual(hidden);
  expect(saved.space.text.documents[0].lines.map(line => line.id)).toEqual(doc.lines.map(line => line.id));
  expect(saved.space.text.taskScopes).toEqual(original.space.text.taskScopes);
  expect(saved.space.text.itemScopes).toEqual(original.space.text.itemScopes);
  expect(saved.space.text.progressRecords).toEqual(original.space.text.progressRecords);
  await choose(page, ''); await expect(fullArea(page)).toHaveValue(M.raw(saved.space.text.documents[0]));
  await editor(page).getByRole('button', { name: '입력 되돌리기', exact: true }).click();
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toBe(M.raw(beforeTime.space.text.documents[0]));
  await choose(page, ids.work); await firstAreaEdit(page, mock, raw => raw.replace('09:00', '10:30'));
  saved = await mock.current();
  await views(page).getByRole('button', { name: '전체 할 일', exact: true }).click();
  const row = page.locator(`[data-task-id="${task.id}"]`);
  await expect(row).toContainText('첫 할 일 수정'); await expect(row).toContainText('10:30');
  await expect(row).toContainText('회사 / 업무 / 합성 폴더 작성');
  await row.getByRole('button', { name: /^첫 할 일 수정 2026-10-01/ }).click();
  await expect(fullArea(page)).toBeVisible();
  await expect.poll(() => fullArea(page).evaluate((area: HTMLTextAreaElement) => area.value.slice(0, area.selectionStart).split('\n').length - 1)).toBe(task.sourceIndex);
  await page.reload(); await expect(fullArea(page)).toHaveValue(M.raw(saved.space.text.documents[0]));
  expect((await mock.current()).space.text).toEqual(saved.space.text);
  await checkBoundary(page, mock, info);
});

test('pending region typing uses native toolbar and keyboard Undo without a save', async ({ page }, info) => {
  const mock = await boot(page); await choose(page, ids.work);
  // Stop the 450 ms save timer while real key events create the browser's
  // editing history. fill() is deliberately not used for this assertion.
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  const area = areas(page).first(), original = await area.inputValue();
  const before = await mock.current(), diagnostics = mock.diagnostics();
  // A browser may allocate one undo unit per input event. Verify one actual
  // keystroke at a time instead of assuming a whole word is a single unit.
  await area.press('Control+End'); await area.pressSequentially('x');
  await expect(area).toHaveValue(`${original}x`);
  await editor(page).getByRole('button', { name: '입력 되돌리기', exact: true }).click();
  await expect(area).toHaveValue(original);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await area.press('Control+End'); await area.pressSequentially('y');
  await expect(area).toHaveValue(`${original}y`);
  await area.press('Control+z'); await expect(area).toHaveValue(original);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await page.clock.runFor(600);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await checkBoundary(page, mock, info);
});

test('creating a document flushes pending folder input then uses the confirmed next revision', async ({ page }, info) => {
  const mock = await boot(page); await choose(page, ids.work);
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  const before = await mock.current(), diagnostics = mock.diagnostics(), commandCount = mock.commands.length;
  const source = before.space.text.documents[0], area = areas(page).first(), raw = await area.inputValue();
  const view = readProgramFolderRegions(before.space.text, source.id, ids.work)!;
  const editedIds = new Set(view.regions[0].lineIds), hidden = source.lines.filter(line => !editedIds.has(line.id));
  // A real keyboard edit remains pending until the document action flushes it.
  await area.press('Control+Home'); await area.press('End'); await area.pressSequentially(' added');
  await expect(area).toHaveValue(raw.replace('첫 메모', '첫 메모 added'));
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  if (!await scope(page).isVisible()) await page.getByRole('button', { name: /^문서·폴더 열기/ }).click();
  await expect(scope(page)).toBeVisible();
  await page.getByLabel('새 문서', { exact: true }).fill('폴더 안 새 문서');
  await page.getByRole('button', { name: '만들기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '폴더 안 새 문서', exact: true })).toBeVisible();
  await expect(fullArea(page)).toBeVisible(); await expect(fullArea(page)).toBeEditable();
  await expect(fullArea(page)).toHaveValue('');
  const saved = await mock.current(), newDoc = saved.space.text.documents.find(doc => doc.title === '폴더 안 새 문서')!;
  expect(newDoc).toBeTruthy(); expect(newDoc.folderId).toBe(ids.work);
  expect(saved.space.text.documents).toHaveLength(before.space.text.documents.length + 1);
  const changed = M.getDocument(saved.space.text, source.id)!;
  expect(M.raw(changed)).toBe(M.raw(source).replace('첫 메모', '첫 메모 added'));
  expect(changed.lines.filter(line => !editedIds.has(line.id))).toEqual(hidden);
  expect(changed.lines.map(line => line.id)).toEqual(source.lines.map(line => line.id));
  expect(saved.space.text.taskScopes).toEqual(before.space.text.taskScopes);
  expect(saved.space.text.itemScopes).toEqual(before.space.text.itemScopes);
  expect(saved.space.text.progressRecords).toEqual(before.space.text.progressRecords);
  expect(mock.diagnostics()).toEqual({ mutations: diagnostics.mutations + 2, operations: diagnostics.operations + 2 });
  expect(saved.revision).toBe(before.revision + 2);
  expect(mock.commands.slice(commandCount).map(command => command.expectedRevision)).toEqual([before.revision, before.revision + 1]);
  if (!await scope(page).isVisible()) await page.getByRole('button', { name: /^문서·폴더 열기/ }).click();
  await expect(scope(page)).toHaveValue('');
  await checkBoundary(page, mock, info);
});

test('exact-name suggestions are dismissible without writes and explicitly connect the same line ID', async ({ page }, info) => {
  const mock = await boot(page), before = await mock.current(), doc = before.space.text.documents[0];
  const lineId = doc.lines.at(-1)!.id;
  await fullArea(page).focus(); await fullArea(page).press('Control+End');
  const suggestions = editor(page).getByRole('region', { name: '기존 폴더 연결 제안' });
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole('button', { name: '회사 / 업무 연결', exact: true })).toBeVisible();
  await expect(suggestions.getByRole('button', { name: '개인 / 업무 연결', exact: true })).toBeVisible();
  const diagnostics = mock.diagnostics();
  await suggestions.getByRole('button', { name: '제안 닫기', exact: true }).click();
  await expect(suggestions).not.toBeVisible();
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await fullArea(page).press('Control+Home'); await fullArea(page).press('Control+End');
  await expect(suggestions).toBeVisible();
  await suggestions.getByRole('button', { name: '회사 / 업무 연결', exact: true }).click();
  await expect.poll(async () => (await mock.current()).space.text.bindings.find(binding => binding.lineId === lineId)).toEqual({ kind: 'scope', docId: doc.id, lineId, scopeId: ids.work });
  const after = await mock.current();
  expect(after.space.text.documents[0].lines).toEqual(doc.lines);
  expect(after.space.text.folders).toEqual(before.space.text.folders);
  expect(after.space.text.taskScopes).toEqual(before.space.text.taskScopes);
  await checkBoundary(page, mock, info);
});

test('synthetic composition and invalid boundary preserve draft without a save or scope escape', async ({ page }, info) => {
  const mock = await boot(page); await choose(page, ids.work);
  const area = areas(page).first(), before = await mock.current(), diagnostics = mock.diagnostics(), raw = await area.inputValue();
  await area.dispatchEvent('compositionstart', { data: '' });
  await area.fill(raw.replace('첫 메모', '첫 메모 조합'));
  await choose(page, ids.child);
  await expect(scope(page)).toHaveValue(ids.work);
  await expect(editor(page)).toContainText('한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.');
  await views(page).getByRole('button', { name: '전체 할 일', exact: true }).click();
  await expect(area).toBeVisible();
  await expect(area).toHaveValue(raw.replace('첫 메모', '첫 메모 조합'));
  await expect(scope(page)).toHaveValue(ids.work);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await area.dispatchEvent('compositionend', { data: '조합' });
  await area.fill(`${raw}\n- 범위 밖 붙여넣기`);
  await editor(page).getByRole('button', { name: '영역 저장', exact: true }).click();
  await expect(editor(page).getByRole('alert').first()).toBeVisible();
  await expect(area).toHaveValue(`${raw}\n- 범위 밖 붙여넣기`);
  await views(page).getByRole('button', { name: '오늘', exact: true }).click();
  await expect(area).toBeVisible();
  await expect(area).toHaveValue(`${raw}\n- 범위 밖 붙여넣기`);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await choose(page, '');
  await expect(scope(page)).toHaveValue(ids.work);
  await expect(area).toHaveValue(`${raw}\n- 범위 밖 붙여넣기`);
  const downloadPromise = page.waitForEvent('download');
  await editor(page).getByRole('button', { name: '입력한 원문 받기', exact: true }).click();
  const downloaded = await downloadPromise;
  const stream = await downloaded.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const recoveryRaw = Buffer.concat(chunks).toString('utf8');
  expect(recoveryRaw).toContain('외부 문장 보존');
  expect(recoveryRaw).toContain('둘째 메모');
  expect(recoveryRaw).toContain('범위 밖 붙여넣기');
  await editor(page).getByRole('button', { name: '영역 입력 취소', exact: true }).click();
  await expect(area).toHaveValue(raw);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await choose(page, '');
  await expect(fullArea(page)).toHaveValue(M.raw(before.space.text.documents[0]));
  await checkBoundary(page, mock, info);
});

test('a rejected save keeps region input and retries without changing hidden lines', async ({ page }, info) => {
  const mock = await boot(page); await choose(page, ids.work);
  const before = await mock.current(), diagnostics = mock.diagnostics(), area = areas(page).first();
  const raw = (await area.inputValue()).replace('첫 메모', '거절 뒤 복구 메모');
  mock.state.rejectNextExecute = 'limit';
  await area.fill(raw);
  await expect(editor(page).getByRole('button', { name: '다시 저장', exact: true })).toBeVisible();
  await expect(area).toHaveValue(raw);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await editor(page).getByRole('button', { name: '다시 저장', exact: true }).click();
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toContain('거절 뒤 복구 메모');
  const saved = await mock.current();
  expect(saved.space.text.documents[0].lines.slice(6)).toEqual(before.space.text.documents[0].lines.slice(6));
  await page.reload(); await expect(fullArea(page)).toHaveValue(M.raw(saved.space.text.documents[0]));
  await checkBoundary(page, mock, info);
});

test('region save with lost receipt recovers the same request without a duplicate write', async ({ page }, info) => {
  const mock = await boot(page); await choose(page, ids.work);
  const area = areas(page).first(), raw = (await area.inputValue()).replace('첫 메모', '응답 유실 뒤 메모');
  const before = mock.diagnostics(); mock.state.loseNextReceipt = true;
  await area.fill(raw);
  await expect(sync(page)).toHaveText('저장 결과 확인이 필요합니다');
  await expect(area).toHaveValue(raw);
  const own = mock.state.lostRequestId;
  expect(own).not.toBeNull();
  await page.getByRole('button', { name: '저장 결과 확인 · 같은 요청 재시도', exact: true }).click();
  await expect(sync(page)).toHaveText('서버 저장 확인');
  expect(mock.lookups).toContain(own);
  expect(mock.commands.filter(command => command.requestId === own)).toHaveLength(1);
  expect(mock.diagnostics()).toEqual({ mutations: before.mutations + 1, operations: before.operations + 1 });
  const saved = await mock.current();
  await page.reload(); await expect(fullArea(page)).toHaveValue(M.raw(saved.space.text.documents[0]));
  expect((await mock.current()).space.text).toEqual(saved.space.text);
  await checkBoundary(page, mock, info);
});

test('external synthetic revision rejects a stale region while keeping local input recoverable', async ({ page }, info) => {
  await page.clock.install();
  const mock = await boot(page); await choose(page, ids.work);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  const before = await mock.current(), doc = before.space.text.documents[0], area = areas(page).first();
  const draft = (await area.inputValue()).replace('첫 메모', '내 미저장 메모');
  await area.fill(draft);
  await mock.externalTextEdit(doc.id, M.raw(doc).replace('외부 문장 보존', '다른 기기 외부 문장'));
  await page.clock.fastForward(20_100);
  await expect(page.getByRole('region', { name: '다른 기기 변경과 입력 보호', exact: true })).toBeVisible();
  await expect(area).toHaveValue(draft);
  const server = await mock.current();
  expect(M.raw(server.space.text.documents[0])).toContain('다른 기기 외부 문장');
  expect(M.raw(server.space.text.documents[0])).not.toContain('내 미저장 메모');
  expect(server.space.text.documents[0].lines.map(line => line.id)).toEqual(doc.lines.map(line => line.id));
  await checkBoundary(page, mock, info);
});

test('first editable line fits each configured viewport with no horizontal overflow', async ({ page }, info) => {
  const mock = await boot(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const geometry = await fullArea(page).evaluate((area: HTMLTextAreaElement) => {
    const box = area.getBoundingClientRect(), style = getComputedStyle(area);
    const firstLineTop = box.top + parseFloat(style.paddingTop || '0');
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const firstMirror = area.closest('.tle-root')?.querySelector('.tle-line');
    const mirrorBox = firstMirror?.getBoundingClientRect();
    return { width: innerWidth, height: innerHeight, bodyTop: box.top, firstLineTop,
      firstLineBottom: firstLineTop + lineHeight, firstLineVisible: firstLineTop >= 0 && firstLineTop + lineHeight <= innerHeight,
      firstRawLine: area.value.split('\n')[0], nativeReadOnly: area.readOnly,
      firstMirrorTop: mirrorBox?.top ?? null, firstMirrorBottom: mirrorBox?.bottom ?? null,
      firstMirrorVisible: !!mirrorBox && mirrorBox.top >= 0 && mirrorBox.bottom <= innerHeight,
      visibleBody: Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(0, box.top)),
      overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(geometry.firstLineVisible).toBe(true);
  expect(geometry.firstRawLine).toBe('[2026-10-01]'); expect(geometry.nativeReadOnly).toBe(false);
  expect(geometry.firstMirrorVisible).toBe(true);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await info.attach('first-line-geometry', { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) });
  await page.screenshot({ path: info.outputPath('first-editable-line.png') });
  await choose(page, ids.work);
  await expect(areas(page).first()).toBeVisible();
  await checkBoundary(page, mock, info);
});
