import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { expect, type TestInfo } from '@playwright/test';
import { folderIds, mockFolderContentEntry } from '../../tests/e2e/folder-content-entry.fixture';
import { RELEASE_ORIGIN } from '../../tests/e2e/cloudflare-release.fixture';
import { emptyAccount, login } from '../../tests/e2e/alpha-auth.fixture';
import { seedJourneyNative } from '../../tests/e2e/flow-execution-journey.fixture';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { programFolderLinkPreview } from '../../lib/flow/integrated-poc/folder-link-preview';
import { ALPHA_UI_RECOVERY_PREFIX, ALPHA_UI_RECOVERY_SCHEMA, alphaUiRecoveryKey, validateAlphaUiRecovery } from '../../lib/flow/integrated-poc/alpha-ui-recovery';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';
import { planProgramRegionEdit, readProgramFolderRegions } from '../../lib/flow/integrated-poc/folder-document-regions';
import inputPlans from '../../lib/flow/integrated-poc/text-input-plan.cjs';
import { journeyViewports } from './flow-execution-journey-contract';
import { feedbackDateRaw, prepareFeedbackDateAccount, runFeedbackDateBrowser } from './feedback-ux-date-browser';
import { verifyFeedbackServerHtml } from './feedback-ux-regression.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const label = process.env.FLOWME_FEEDBACK_QA_LABEL ?? 'candidate';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('feedback-qa-label-rejected');
const cases = ['folder-direct', 'folder-input', 'today-source', 'writing-enter', 'writing-memo', 'writing-region', 'writing-identity-reject'] as const;
type Case = typeof cases[number];
type Mock = Awaited<ReturnType<typeof mockFolderContentEntry>>;
type Evidence = { type: string; data: unknown };
type Result = { name: Case; width: number; height: number; ok: boolean; error?: string; evidence: Evidence[] };
type BuildInput = { path: string; sha256: string };
type BuildManifest = { root: string; workspace: string; sources: BuildInput[] };
const today = '2026-10-02';
const writingRaw = '숨은 앞 원문  \t\n[2026-10-01]\n- 업무\n  - 부모 목록\n    - 선택 목록\n      - 메모 줄\n      - [x] 완료 자식\n    - 뒤 형제 목록\n  - [20%] 같은 제목\n    - 메모: 첫 날짜 메모\n    - 시간: 09:00\n    - [ ] 자식\n      - 메모: 자식 메모\n      - [ ] 손자\n  - [ ] 뒤 할 일\n  - [ ] \n숨은 중간 원문\u200b  \n[2026-10-02]\n- 업무\n  - [x] 같은 제목\n    - 메모: 둘째 날짜 메모\n숨은 끝 원문  ';
const rawByCase: Record<Case, string> = {
  'folder-direct': '- 부모 원문\n  - 자식 메모\n    - 손자 메모\n- 바깥 줄\n[2026-10-02]\n- [ ] 직접 할 일\n- \n- 업무',
  'folder-input': '- 이름 입력 앞\n- \n- 같은 이름 뒤\n- ',
  'today-source': feedbackDateRaw,
  'writing-enter': writingRaw,
  'writing-memo': writingRaw,
  'writing-region': writingRaw,
  'writing-identity-reject': '- [ ] 첫째둘째\n- [ ] 뒤 할 일',
};
const directory = resolve(root, `output/playwright/feedback-ux-${label}`);
let outputOwnedThisRun = false;
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
const area = (page: Page) => editor(page).locator('[data-native-editor="v11-core"] textarea');
const regionAreas = (page: Page) => editor(page).getByRole('textbox', { name: /^폴더 영역 \d+ 원문$/ });
const scope = (page: Page) => page.getByRole('combobox', { name: '폴더', exact: true });
const suggestion = (page: Page) => editor(page).getByRole('region', { name: '폴더 연결 제안', exact: true });
const undo = (page: Page) => page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('button', { name: '되돌리기', exact: true });
const redo = (page: Page) => page.locator('details[aria-label="계정 및 자료 관리"]').getByRole('button', { name: '다시 실행', exact: true });
type IdentityStorageCall = { method: 'setItem' | 'removeItem' | 'clear'; storage: 'local' | 'session'; key: string | null; value: string | null };
type IdentityStorageSnapshot = { calls: IdentityStorageCall[]; local: Record<string, string>; session: Record<string, string> };

async function installIdentityStorageAudit(page: Page) {
  // A literal browser script avoids tsx's keepNames helper in nested functions.
  await page.addInitScript(`(() => {
    const audit = [];
    Object.defineProperty(window, '__feedbackIdentityStorageAudit', { value: audit });
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(...args) {
        audit.push({ method, storage: this === localStorage ? 'local' : 'session', key: args[0] ?? null,
          value: method === 'setItem' ? String(args[1]) : null });
        return Reflect.apply(original, this, args);
      } });
    }
  })()`);
}
async function identityStorage(page: Page): Promise<IdentityStorageSnapshot> {
  return page.evaluate(() => {
    const local: Record<string, string> = {}, session: Record<string, string> = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)!; local[key] = localStorage.getItem(key)!;
    }
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index)!; session[key] = sessionStorage.getItem(key)!;
    }
    return { calls: (window as unknown as { __feedbackIdentityStorageAudit: IdentityStorageCall[] }).__feedbackIdentityStorageAudit,
      local, session };
  });
}

function buildPreflight() {
  assert.equal(process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local', 'local', 'Only fixed loopback assets are allowed');
  assert.equal(process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT, '3107', 'This driver is restricted to prepared QA3107');
  const input = process.env.FLOWME_FEEDBACK_QA_BUILD_WORKSPACE;
  assert(input && isAbsolute(input), 'An exact isolated build workspace is required');
  const workspace = resolve(input), within = relative(root, workspace);
  assert(within && !within.startsWith('..') && !isAbsolute(within), 'The copied build must be inside this task worktree');
  const manifest = JSON.parse(readFileSync(resolve(workspace, '../inputs.json'), 'utf8')) as BuildManifest;
  assert.equal(resolve(manifest.root), root); assert.equal(resolve(manifest.workspace), workspace);
  assert(Array.isArray(manifest.sources) && manifest.sources.length > 0);
  for (const required of ['components/flow/integrated-poc/ProgramTextEditor.tsx', 'components/flow/integrated-poc/ProgramSpace.tsx',
    'lib/flow/integrated-poc/folder-link-preview.ts', 'lib/flow/integrated-poc/execution-presentation.ts']) {
    assert(manifest.sources.some(source => source.path === required), `Frozen build omitted ${required}`);
  }
  const buildId = readFileSync(resolve(workspace, '.next/BUILD_ID'), 'utf8').trim(); assert(buildId);
  function unchanged() {
    assert.equal(readFileSync(resolve(workspace, '.next/BUILD_ID'), 'utf8').trim(), buildId, 'Copied build ID drift');
    for (const source of manifest.sources) {
      assert(typeof source.path === 'string' && !isAbsolute(source.path) && !source.path.split(/[\\/]/).includes('..'));
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
      assert.equal(hash(resolve(root, source.path)), source.sha256, `Current source drift: ${source.path}`);
      assert.equal(hash(resolve(workspace, source.path)), source.sha256, `Copied source drift: ${source.path}`);
    }
  }
  unchanged();
  return { workspace, buildId, sourceCount: manifest.sources.length, unchanged,
    inputHash: createHash('sha256').update(JSON.stringify(manifest.sources)).digest('hex') };
}

async function serverPreflight(buildId: string) {
  const response = await fetch('http://127.0.0.1:3107/alpha', { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, 'QA3107 is not ready');
  verifyFeedbackServerHtml(await response.text(), buildId);
}

function seedText(initial: TextWorkspaceState, name: Case) {
  let text = M.addDocument(initial, { title: `합성 UX · ${name}` });
  const docId = text.documents.at(-1)!.id;
  if (name === 'today-source') return { text, docId }; // The date helper owns fresh-document seed construction.
  if (['writing-enter', 'writing-memo', 'writing-region'].includes(name)) {
    // Bind childless scope anchors before introducing Items. Never relocate an
    // existing Item to manufacture a successful scoped-writing result.
    text = M.editText(text, docId, '숨은 앞 원문  \t\n[2026-10-01]\n- 업무\n숨은 중간 원문\u200b  \n[2026-10-02]\n- 업무\n숨은 끝 원문  ');
    for (const index of [2, 5]) {
      text = M.attachScope(text, docId, index, folderIds.work);
      assert.equal(M.rowMeta(text, docId)[index]?.scopeId, folderIds.work, 'Writing seed scope attachment rejected');
    }
  }
  text = M.editText(text, docId, rawByCase[name]);
  if (name === 'folder-direct') text = M.attachScope(text, docId, 7, folderIds.work);
  if (name.startsWith('writing-')) for (const task of M.tasks(text).filter(task => task.docId === docId && task.isCanonical)) {
    text = M.recordProgress(text, task.id, '2026-09-30', task.done ? 100 : task.title === '같은 제목' ? 20 : 0);
  }
  assert.equal(M.raw(M.getDocument(text, docId)), rawByCase[name], `Seed source mismatch: ${name}`); assert(M.validate(text));
  return { text, docId };
}

function seed(name: Case) {
  return (initial: AlphaAccount): AlphaAccount => {
    // Existing native creator owner supplies an unchanged-origin sentinel.
    // All direct model transitions in this driver are confined to initial seed.
    let account = seedJourneyNative(initial);
    const { text, docId } = seedText(account.space.text, name);
    account.space.text = text;
    if (name === 'today-source') account = prepareFeedbackDateAccount(account, docId);
    assert.equal(M.raw(M.getDocument(account.space.text, docId)), rawByCase[name], `Actual account seed source mismatch: ${name}`);
    account.space.position = { documentId: docId, lineId: M.getDocument(account.space.text, docId)!.lines[0]?.id ?? null, start: 0, end: 0, scrollTop: 0 };
    return account;
  };
}

async function click(target: Locator) {
  await expect(target).toBeVisible();
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(element => {
    const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
      && !!hit && (hit === element || element.contains(hit));
  }), { message: 'The action is in view and uncovered' }).toBe(true);
  await target.click();
}
async function caret(page: Page, lineIndex: number, atEnd = false) {
  const field = area(page); await expect(field).toBeVisible();
  await field.evaluate((element, selection) => {
    const textarea = element as HTMLTextAreaElement, lines = textarea.value.split('\n');
    const offset = lines.slice(0, selection.lineIndex).reduce((count, line) => count + line.length + 1, 0)
      + (selection.atEnd ? lines[selection.lineIndex].length : 0);
    textarea.focus(); textarea.setSelectionRange(offset, offset); textarea.dispatchEvent(new Event('select', { bubbles: true }));
  }, { lineIndex, atEnd });
}
async function needleCaret(field: Locator, needle: string, afterNeedle = false) {
  await expect(field).toBeEditable(); await field.focus();
  await field.evaluate((element, selection) => {
    const textarea = element as HTMLTextAreaElement, at = textarea.value.indexOf(selection.needle);
    if (at < 0 || textarea.value.indexOf(selection.needle, at + 1) >= 0) throw Error(`Nonunique exact caret anchor: ${selection.needle}`);
    const newline = textarea.value.indexOf('\n', at);
    const offset = selection.afterNeedle ? at + selection.needle.length : newline < 0 ? textarea.value.length : newline;
    textarea.setSelectionRange(offset, offset); textarea.dispatchEvent(new Event('select', { bubbles: true }));
  }, { needle, afterNeedle });
}
async function chooseScope(page: Page, id: string) {
  if (!await scope(page).isVisible()) await click(page.getByRole('button', { name: /^문서·폴더 열기/ }));
  await expect(scope(page)).toBeVisible(); await scope(page).selectOption(id);
}
async function pauseWriting(page: Page) {
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
}
async function savedWriting(page: Page, mock: Mock, docId: string, raw: string) {
  await page.clock.runFor(700);
  await expect.poll(async () => M.raw(M.getDocument((await mock.current()).space.text, docId))).toBe(raw);
  await expect(editor(page)).toHaveAttribute('data-dirty', 'false');
}
function assertWritingPreserved(initial: AlphaAccount, current: AlphaAccount, docId: string, changed = new Set<string>(), noteChanges = new Map<string, string>(), escapedScaffolds = new Set<string>()) {
  protectOwners(initial, current, docId);
  const before = initial.space.text, after = current.space.text, source = M.getDocument(before, docId)!, result = M.getDocument(after, docId)!;
  const originalIds = new Set(source.lines.map(line => line.id));
  for (const id of escapedScaffolds) {
    assert(/^ *- \[ \] *$/.test(source.lines.find(line => line.id === id)!.text));
    assert(!M.tasks(before).some(task => task.id === id), 'Only a non-Item empty scaffold may lose its source line identity');
    assert(!result.lines.some(line => line.id === id), 'Current checkbox escape replaces this scaffold ID');
  }
  assert.deepEqual(result.lines.filter(line => originalIds.has(line.id)).map(line => line.id), source.lines.filter(line => !escapedScaffolds.has(line.id)).map(line => line.id));
  for (const line of source.lines) if (!changed.has(line.id)) assert.deepEqual(result.lines.find(entry => entry.id === line.id), line, `Protected source line: ${line.id}`);
  assert.deepEqual(after.folders, before.folders); assert.deepEqual(after.bindings, before.bindings);
  assert.deepEqual(after.progressRecords, before.progressRecords);
  for (const key of ['taskScopes', 'itemScopes'] as const) for (const [id, value] of Object.entries(before[key])) assert.equal(after[key][id], value);
  for (const task of M.tasks(before).filter(task => task.docId === docId)) {
    const same = M.tasks(after).find(entry => entry.id === task.id); assert(same, `Existing Item lost: ${task.id}`);
    for (const key of ['title', 'date', 'groupDate', 'scopeId', 'depth', 'parentItemId', 'parentTaskId', 'isCanonical', 'done', 'time'] as const) assert.deepEqual(same[key], task[key], `Item ${task.id} changed ${key}`);
    assert.equal(same.note, noteChanges.get(task.id) ?? task.note);
  }
}
function assertOneSave(mock: Mock, before: Awaited<ReturnType<typeof snapshot>>, current: AlphaAccount) {
  assert.equal(mock.commands.length, before.commands + 1, 'One settled keyboard batch must submit one command');
  assert.deepEqual(mock.diagnostics(), { mutations: before.counts.mutations + 1, operations: before.counts.operations + 1 });
  assert.equal(mock.commands.at(-1)!.expectedRevision, before.account.revision); assert.equal(current.revision, before.account.revision + 1);
}
async function reloadWriting(page: Page, mock: Mock, expected: AlphaAccount, docId: string, raw: string) {
  const counts = mock.diagnostics(), commands = mock.commands.length;
  await page.reload(); await expect(area(page)).toHaveValue(raw);
  assert.deepEqual((await mock.current()).space.text, expected.space.text);
  assert.deepEqual(mock.diagnostics(), counts); assert.equal(mock.commands.length, commands);
  assert.equal(M.raw(M.getDocument((await mock.current()).space.text, docId)), raw);
}
async function pasteResult(page: Page, value: string) {
  // Simulate only the paste result at the DOM selection. No clipboard APIs,
  // OS clipboard, model, controller, repository or storage are accessed.
  await area(page).evaluate((element, text) => {
    const field = element as HTMLTextAreaElement; field.focus();
    field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
    field.dispatchEvent(new Event('select', { bubbles: true }));
  }, value);
}
async function snapshot(page: Page, mock: Mock) {
  return { account: await mock.current(), counts: mock.diagnostics(), commands: mock.commands.length,
    storage: await page.evaluate(() => (window as unknown as { __folderContentStorage: { calls: number } }).__folderContentStorage.calls) };
}
async function noChange(page: Page, mock: Mock, before: Awaited<ReturnType<typeof snapshot>>) {
  assert.deepEqual(await snapshot(page, mock), before, 'Reading/cancellation must add no command, mutation or storage write');
}
function assertInverseShadowCapture(before: Awaited<ReturnType<typeof snapshot>>, after: Awaited<ReturnType<typeof snapshot>>,
  storageBefore: IdentityStorageSnapshot, storageAfter: IdentityStorageSnapshot, docId: string, transientRaw: string) {
  const slotId = storageBefore.session['flow:poc:personal-workspace:v1:alpha-m3:tab']; assert(slotId);
  const key = alphaUiRecoveryKey(before.account.ownerId, slotId), document = M.getDocument(before.account.space.text, docId)!; assert(document);
  const record = { schema: ALPHA_UI_RECOVERY_SCHEMA, ownerId: before.account.ownerId, slotId,
    drafts: [{ documentId: docId, title: document.title, raw: transientRaw }] };
  const bytes = canonicalJson(record), parsed: unknown = JSON.parse(storageAfter.session[key]);
  assert(validateAlphaUiRecovery(parsed, before.account.ownerId, slotId)); assert.deepEqual(parsed, record);
  assert.deepEqual(after, { ...before, storage: before.storage + 1 }, 'A real edit/inverse captures only its intermediate draft; the account and commands stay unchanged');
  assert.deepEqual(storageAfter.calls.slice(storageBefore.calls.length), [{ method: 'setItem', storage: 'session', key, value: bytes }]);
  assert.equal(storageAfter.calls.filter(call => call.method === 'clear').length, 0);
  assert.deepEqual(storageAfter.local, storageBefore.local);
  assert.deepEqual(storageAfter.session, { ...storageBefore.session, [key]: bytes });
  return { key, bytes };
}
async function settle(page: Page, mock: Mock, docId: string, raw: string) {
  await expect.poll(async () => M.raw(M.getDocument((await mock.current()).space.text, docId))).toBe(raw);
  await expect(area(page)).toHaveValue(raw); await expect(editor(page)).toHaveAttribute('data-dirty', 'false');
}
async function screenshot(page: Page, name: Case, width: number, step: string, evidence: Evidence[]) {
  const path = resolve(directory, `${name}-${width}-${step}.png`); await page.screenshot({ path, fullPage: true });
  const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth }));
  assert(overflow.document <= 1 && overflow.body <= 1, JSON.stringify(overflow)); evidence.push({ type: step, data: { path, overflow } });
}
async function openFolder(page: Page, index: number) {
  await caret(page, index);
  await editor(page).getByRole('button', { name: '＋ 추가', exact: true }).focus(); await page.keyboard.press('Enter');
  await click(page.getByRole('dialog').getByRole('button', { name: '폴더 연결', exact: true }));
  const dialog = page.getByRole('dialog', { name: '폴더 연결', exact: true }); await expect(dialog).toBeVisible(); return dialog;
}
function protectOwners(initial: AlphaAccount, current: AlphaAccount, docId: string) {
  assert.deepEqual(current.space.creatorWorkspace, initial.space.creatorWorkspace);
  assert.deepEqual(current.space.copies, initial.space.copies);
  assert.deepEqual(current.space.text.documents.filter(doc => doc.id !== docId), initial.space.text.documents.filter(doc => doc.id !== docId));
  assert.deepEqual(current.space.text.flows, initial.space.text.flows);
}

async function folderDirect(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  const source = M.getDocument(initial.space.text, docId)!;
  // Independent cancellations expose the current contract, not a new placement
  // policy. A null/end choice is not reachable from this nonempty UI seed.
  for (const [index, relation] of [[3, 'same-line'], [6, 'same-line'], [4, 'after-line'], [5, 'after-line'], [7, 'inside-scope']] as const) {
    const exact = programFolderLinkPreview(initial.space.text, docId, source.lines[index].id)!;
    assert.equal(exact.destination.relation, relation);
    await caret(page, index); const selection = await area(page).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd }));
    const untouched = await snapshot(page, mock), dialog = await openFolder(page, index);
    await expect(dialog.locator('[aria-label="폴더 연결 위치"]')).toContainText(exact.locationLabel);
    await expect(dialog.locator('[aria-label="폴더 연결 위치"]')).toContainText(`기준 줄: ${source.lines[index].text}`);
    await page.keyboard.press('Tab'); await expect(dialog).toBeVisible();
    assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Tab stays inside the modal');
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible(); await expect(area(page)).toBeFocused();
    assert.deepEqual(await area(page).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd })), selection);
    await noChange(page, mock, untouched);
    evidence.push({ type: 'folder-cancelled-exact-slot', data: { index, relation, locationLabel: exact.locationLabel, mutationDelta: 0, modalTabContained: true, sourceFocusAndCaretRestored: true } });
  }
  const preview = programFolderLinkPreview(initial.space.text, docId, source.lines[0].id)!;
  assert.equal(preview.destination.relation, 'after-subtree'); assert.equal(preview.destination.index, 3);
  const before = await snapshot(page, mock), cancelled = await openFolder(page, 0);
  await expect(cancelled.locator('[aria-label="폴더 연결 위치"]')).toContainText(preview.locationLabel);
  await expect(cancelled.locator('[aria-label="폴더 연결 위치"]')).toContainText('기준 줄: - 부모 원문');
  await screenshot(page, 'folder-direct', width, 'exact-subtree-position', evidence);
  await page.keyboard.press('Escape'); await expect(cancelled).not.toBeVisible(); await noChange(page, mock, before);
  const dialog = await openFolder(page, 0); await click(dialog.getByRole('button', { name: '개인 / 업무', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => M.getDocument((await mock.current()).space.text, docId)!.lines.length).toBe(source.lines.length + 1);
  const linked = await mock.current(), linkedDoc = M.getDocument(linked.space.text, docId)!;
  assert.deepEqual(linkedDoc.lines.slice(0, 3), source.lines.slice(0, 3)); assert.deepEqual(linkedDoc.lines.slice(4), source.lines.slice(3));
  const lineId = linkedDoc.lines[3].id; assert(!source.lines.some(line => line.id === lineId));
  assert.equal(linkedDoc.lines[3].text, '- 업무');
  assert.deepEqual(linked.space.text.bindings.find(binding => binding.lineId === lineId),
    { kind: 'scope', docId, lineId, scopeId: folderIds.homonym });
  assert.equal(mock.diagnostics().mutations, before.counts.mutations + 1); protectOwners(initial, linked, docId);
  await click(undo(page)); await expect.poll(async () => (await mock.current()).space.text).toEqual(initial.space.text);
  await settle(page, mock, docId, M.raw(source));
  const saved = await mock.current(), counts = mock.diagnostics(), commands = mock.commands.length;
  await page.reload(); await expect(area(page)).toHaveValue(M.raw(source));
  assert.deepEqual((await mock.current()).space.text, saved.space.text); assert.deepEqual(mock.diagnostics(), counts); assert.equal(mock.commands.length, commands);
  evidence.push({ type: 'folder-direct-contract', data: { selectedLineId: source.lines[0].id, insertedLineId: lineId,
    insertionIndex: 3, subtreeAndSiblingIdsPreserved: true, cancelMutationDelta: 0, explicitMutationDelta: 1, undoRestoredSource: true, reloadMutationDelta: 0 } });
  evidence.push({ type: 'folder-end-slot-boundary', data: { nullLineAppend: 'PURE_AND_JSX_ONLY; nonempty UI seed supplies a current source anchor, not null', newlyChosenPlacementPolicy: false } });
}

async function folderInput(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  const original = M.getDocument(initial.space.text, docId)!;
  await caret(page, 1, true); await area(page).pressSequentially('업무');
  const typedRaw = rawByCase['folder-input'].split('\n').map((line, index) => index === 1 ? '- 업무' : line).join('\n');
  await settle(page, mock, docId, typedRaw);
  const typed = await snapshot(page, mock), typedId = original.lines[1].id;
  await expect(suggestion(page).getByRole('button', { name: '회사 / 업무 연결', exact: true })).toBeVisible();
  await expect(suggestion(page).getByRole('button', { name: '개인 / 업무 연결', exact: true })).toBeVisible();
  assert(!typed.account.space.text.bindings.some(binding => binding.lineId === typedId));
  await screenshot(page, 'folder-input', width, 'typed-exact-homonyms', evidence);
  await area(page).press('Escape'); await expect(suggestion(page)).not.toBeVisible(); await noChange(page, mock, typed);
  await caret(page, 0); await caret(page, 1, true);
  await click(suggestion(page).getByRole('button', { name: '회사 / 업무 연결', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.bindings.find(binding => binding.lineId === typedId))
    .toEqual({ kind: 'scope', docId, lineId: typedId, scopeId: folderIds.work });
  assert.deepEqual(M.getDocument((await mock.current()).space.text, docId)!.lines, M.getDocument(typed.account.space.text, docId)!.lines);
  await caret(page, 3, true); await pasteResult(page, '업무');
  const pastedRaw = typedRaw.split('\n').map((line, index) => index === 3 ? '- 업무' : line).join('\n');
  await settle(page, mock, docId, pastedRaw);
  const pasted = await snapshot(page, mock), pastedId = original.lines[3].id;
  assert(!pasted.account.space.text.bindings.some(binding => binding.lineId === pastedId));
  await expect(suggestion(page).getByRole('button', { name: '개인 / 업무 연결', exact: true })).toBeVisible();
  await click(suggestion(page).getByRole('button', { name: '제안 닫기', exact: true }));
  await expect(suggestion(page)).not.toBeVisible(); await noChange(page, mock, pasted);
  await caret(page, 2); await caret(page, 3, true);
  await click(suggestion(page).getByRole('button', { name: '개인 / 업무 연결', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.bindings.find(binding => binding.lineId === pastedId))
    .toEqual({ kind: 'scope', docId, lineId: pastedId, scopeId: folderIds.homonym });
  const linked = await mock.current(); assert.deepEqual(M.getDocument(linked.space.text, docId)!.lines, M.getDocument(pasted.account.space.text, docId)!.lines);
  assert.deepEqual(linked.space.text.folders, initial.space.text.folders); protectOwners(initial, linked, docId);
  await click(undo(page)); await expect.poll(async () => (await mock.current()).space.text).toEqual(pasted.account.space.text);
  const beforeReload = mock.diagnostics(), commandCount = mock.commands.length;
  await page.reload(); await expect(area(page)).toHaveValue(pastedRaw);
  assert.deepEqual((await mock.current()).space.text, pasted.account.space.text); assert.deepEqual(mock.diagnostics(), beforeReload); assert.equal(mock.commands.length, commandCount);
  evidence.push({ type: 'folder-input-contract', data: { typedId, pastedId, exactHomonymIds: [folderIds.work, folderIds.homonym],
    proposalMutationDelta: 0, dismissAndEscapeMutationDelta: 0, originalLineIdsRetained: true,
    pasteEvidence: 'DOM selection setRangeText + insertFromPaste input event: paste-result simulation only', clipboardCalls: 0, nativeClipboard: 'NOT_RUN' } });
}

async function writingEnter(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  await pauseWriting(page);
  const source = M.getDocument(initial.space.text, docId)!, oldTasks = M.tasks(initial.space.text).filter(task => task.docId === docId);
  const parent = oldTasks.find(task => task.title === '같은 제목' && task.date === '2026-10-01')!;
  const empty = source.lines.find(line => line.text === '  - [ ] ')!; assert(parent && empty);
  await needleCaret(area(page), '  - [20%] 같은 제목'); const before = await snapshot(page, mock);
  await area(page).press('Enter');
  const scaffold = writingRaw.replace('      - [ ] 손자\n', '      - [ ] 손자\n  - [ ] \n');
  await expect(area(page)).toHaveValue(scaffold); await expect(area(page)).toBeFocused();
  await area(page).pressSequentially('새 형제');
  const created = writingRaw.replace('      - [ ] 손자\n', '      - [ ] 손자\n  - [ ] 새 형제\n');
  await expect(area(page)).toHaveValue(created);
  await needleCaret(area(page), '  - [ ] \n숨은 중간'); await area(page).press('Enter');
  const expected = created.replace('  - [ ] \n숨은 중간', '\n숨은 중간');
  await expect(area(page)).toHaveValue(expected); await savedWriting(page, mock, docId, expected);
  const saved = await mock.current(); assertOneSave(mock, before, saved);
  assertWritingPreserved(initial, saved, docId, new Set([empty.id]), new Map(), new Set([empty.id]));
  const added = M.tasks(saved.space.text).find(task => task.docId === docId && task.title === '새 형제')!;
  assert(added && !oldTasks.some(task => task.id === added.id)); assert.equal(added.parentItemId, parent.parentItemId);
  assert.equal(added.scopeId, parent.scopeId); assert.equal(added.depth, parent.depth); assert.equal(added.date, parent.date);
  assert.equal(M.tasks(saved.space.text).filter(task => task.docId === docId).length, oldTasks.length + 1);
  assert(!M.getDocument(saved.space.text, docId)!.lines.some(line => line.id === empty.id));
  assert.equal(M.getDocument(saved.space.text, docId)!.lines.find((line, index, lines) => lines[index + 1]?.text.startsWith('숨은 중간'))?.text, '');
  await screenshot(page, 'writing-enter', width, 'saved-sibling-after-subtree-and-empty-exit', evidence);
  await click(undo(page)); await expect.poll(async () => (await mock.current()).space.text).toEqual(initial.space.text);
  await settle(page, mock, docId, writingRaw); const undone = await mock.current();
  await reloadWriting(page, mock, undone, docId, writingRaw);
  // The preceding successful save was explicitly undone. Repeat the same UI
  // gesture once to prove the successful postimage survives reload; this is not
  // a retry of failed input, nor an assumption that Undo survives page creation.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await needleCaret(area(page), '  - [20%] 같은 제목'); const repeatedBefore = await snapshot(page, mock);
  await area(page).press('Enter'); await expect(area(page)).toHaveValue(scaffold);
  await area(page).pressSequentially('새 형제'); await expect(area(page)).toHaveValue(created);
  await needleCaret(area(page), '  - [ ] \n숨은 중간'); await area(page).press('Enter');
  await expect(area(page)).toHaveValue(expected); await savedWriting(page, mock, docId, expected);
  const repeatedSuccess = await mock.current(); assertOneSave(mock, repeatedBefore, repeatedSuccess);
  assertWritingPreserved(initial, repeatedSuccess, docId, new Set([empty.id]), new Map(), new Set([empty.id]));
  const repeatedItem = M.tasks(repeatedSuccess.space.text).find(task => task.docId === docId && task.title === '새 형제')!;
  assert(repeatedItem && !oldTasks.some(task => task.id === repeatedItem.id));
  assert.equal(repeatedItem.parentItemId, parent.parentItemId); assert.equal(repeatedItem.scopeId, parent.scopeId);
  assert.equal(repeatedItem.depth, parent.depth); assert.equal(repeatedItem.date, parent.date);
  assert.equal(M.tasks(repeatedSuccess.space.text).filter(task => task.docId === docId).length, oldTasks.length + 1);
  const successfulSource = M.getDocument(repeatedSuccess.space.text, docId)!;
  const successfulItems = M.tasks(repeatedSuccess.space.text).filter(task => task.docId === docId);
  const successfulProgress = repeatedSuccess.space.text.progressRecords;
  await reloadWriting(page, mock, repeatedSuccess, docId, expected);
  const reloadedSuccess = await mock.current();
  assert.equal(reloadedSuccess.revision, repeatedSuccess.revision, 'Successful-state reload must not advance CAS revision');
  assert.deepEqual(M.getDocument(reloadedSuccess.space.text, docId), successfulSource);
  assert.deepEqual(M.tasks(reloadedSuccess.space.text).filter(task => task.docId === docId), successfulItems);
  assert.deepEqual(reloadedSuccess.space.text.progressRecords, successfulProgress);
  assert.equal(M.tasks(reloadedSuccess.space.text).find(task => task.id === repeatedItem.id)?.title, '새 형제');
  assertWritingPreserved(initial, reloadedSuccess, docId, new Set([empty.id]), new Map(), new Set([empty.id]));
  evidence.push({ type: 'writing-enter-contract', data: { parentId: parent.id, newSiblingId: added.id, escapedBlankLineId: empty.id,
    insertion: 'after memo/time/child/grandchild, before existing sibling', originalItemIdsAndHiddenBytesPreserved: true,
    existingEmptyCheckboxExit: true, nonItemScaffoldSourceId: 'replaced by a new blank line ID, not preserved', oneSettledSave: true, savedUndoRestoredOriginal: true, reloadMutationDelta: 0,
    successRepeatAfterUndo: 'same user gesture once, not failure retry', successfulReloadSiblingId: repeatedItem.id,
    successfulSourceIdsItemsNotesTimeAndProgressReloadedExactly: true, successfulReloadCommandMutationDelta: 0 } });
}

async function writingMemo(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  await pauseWriting(page);
  const tasks = M.tasks(initial.space.text).filter(task => task.docId === docId);
  const parent = tasks.find(task => task.title === '같은 제목' && task.date === '2026-10-01')!, homonym = tasks.find(task => task.title === '같은 제목' && task.date === today)!;
  assert(parent && homonym); assert.notEqual(parent.id, homonym.id);
  const items = (text: TextWorkspaceState) => M.parseDocument(M.getDocument(text, docId)!, text).items;
  const children = items(initial.space.text).filter(item => item.title === '자식' && item.parentItemId === parent.id);
  assert.equal(children.length, 1); const child = children[0];
  const assertChild = (text: TextWorkspaceState, note: string) => {
    const current = items(text).find(item => item.id === child.id); assert(current, 'Exact nested source Item must survive');
    assert.equal(current.note, note);
    for (const key of ['title', 'date', 'groupDate', 'time', 'parentItemId', 'parentTaskId', 'scopeId', 'depth', 'done'] as const) assert.deepEqual(current[key], child[key]);
    assert.deepEqual(items(text).map(item => item.id), items(initial.space.text).map(item => item.id));
  };
  await needleCaret(area(page), '    - 메모: 첫 날짜 메모'); const before = await snapshot(page, mock);
  await area(page).press('Enter');
  await expect(area(page)).toHaveValue(writingRaw.replace('첫 날짜 메모\n', '첫 날짜 메모\n    - 메모: \n'));
  await area(page).pressSequentially('부모 추가 설명');
  await needleCaret(area(page), '      - 메모: 자식 메모'); await area(page).press('Shift+Enter'); await area(page).pressSequentially('자식 추가 설명');
  const expected = writingRaw.replace('첫 날짜 메모\n', '첫 날짜 메모\n    - 메모: 부모 추가 설명\n')
    .replace('자식 메모\n', '자식 메모\n      - 메모: 자식 추가 설명\n');
  await expect(area(page)).toHaveValue(expected); await savedWriting(page, mock, docId, expected);
  const saved = await mock.current(); assertOneSave(mock, before, saved);
  assertWritingPreserved(initial, saved, docId, new Set(), new Map([[parent.id, `${parent.note}\n부모 추가 설명`], [child.id, `${child.note}\n자식 추가 설명`]]));
  assertChild(saved.space.text, `${child.note}\n자식 추가 설명`);
  assert.deepEqual(M.tasks(saved.space.text).find(task => task.id === homonym.id), { ...homonym, sourceIndex: homonym.sourceIndex + 2 });
  assert.equal(M.tasks(saved.space.text).filter(task => task.docId === docId).length, tasks.length);
  await screenshot(page, 'writing-memo', width, 'same-item-memo-enter-and-shiftenter', evidence);
  await click(undo(page)); await expect.poll(async () => (await mock.current()).space.text).toEqual(initial.space.text);
  await settle(page, mock, docId, writingRaw); await reloadWriting(page, mock, await mock.current(), docId, writingRaw);
  assertChild((await mock.current()).space.text, child.note);
  assert.deepEqual(M.tasks((await mock.current()).space.text).find(task => task.id === homonym.id), homonym);
  // Keep the original Undo proof, then separately restore the successful
  // multiline-memo postimage through a second normal keyboard interaction.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await needleCaret(area(page), '    - 메모: 첫 날짜 메모'); const repeatedBefore = await snapshot(page, mock);
  await area(page).press('Enter');
  await expect(area(page)).toHaveValue(writingRaw.replace('첫 날짜 메모\n', '첫 날짜 메모\n    - 메모: \n'));
  await area(page).pressSequentially('부모 추가 설명');
  await needleCaret(area(page), '      - 메모: 자식 메모'); await area(page).press('Shift+Enter'); await area(page).pressSequentially('자식 추가 설명');
  await expect(area(page)).toHaveValue(expected); await savedWriting(page, mock, docId, expected);
  const repeatedSuccess = await mock.current(); assertOneSave(mock, repeatedBefore, repeatedSuccess);
  const expectedNotes = new Map([[parent.id, `${parent.note}\n부모 추가 설명`], [child.id, `${child.note}\n자식 추가 설명`]]);
  const expectedHomonym = { ...homonym, sourceIndex: homonym.sourceIndex + 2 }; // Two memo rows precede this unchanged Item.
  assertWritingPreserved(initial, repeatedSuccess, docId, new Set(), expectedNotes);
  assertChild(repeatedSuccess.space.text, `${child.note}\n자식 추가 설명`);
  assert.equal(M.tasks(repeatedSuccess.space.text).filter(task => task.docId === docId).length, tasks.length);
  assert.deepEqual(M.tasks(repeatedSuccess.space.text).find(task => task.id === homonym.id), expectedHomonym);
  const successfulSource = M.getDocument(repeatedSuccess.space.text, docId)!;
  const successfulItems = M.tasks(repeatedSuccess.space.text).filter(task => task.docId === docId);
  const successfulProgress = repeatedSuccess.space.text.progressRecords;
  await reloadWriting(page, mock, repeatedSuccess, docId, expected);
  const reloadedSuccess = await mock.current();
  assert.equal(reloadedSuccess.revision, repeatedSuccess.revision, 'Successful-state reload must not advance CAS revision');
  assert.deepEqual(M.getDocument(reloadedSuccess.space.text, docId), successfulSource);
  assert.deepEqual(M.tasks(reloadedSuccess.space.text).filter(task => task.docId === docId), successfulItems);
  assert.deepEqual(reloadedSuccess.space.text.progressRecords, successfulProgress);
  assertWritingPreserved(initial, reloadedSuccess, docId, new Set(), expectedNotes);
  assertChild(reloadedSuccess.space.text, `${child.note}\n자식 추가 설명`);
  assert.deepEqual(M.tasks(reloadedSuccess.space.text).find(task => task.id === homonym.id), expectedHomonym);
  evidence.push({ type: 'writing-memo-contract', data: { parentId: parent.id, childId: child.id, otherSameTitleId: homonym.id,
    parentEnterAndChildShiftEnterUseRepeatedMemoSyntax: true, sameItemMultilineNotes: true, otherHomonymNoteUnchanged: true,
    originalDateTimeParentsProgressAndHiddenSourcePreserved: true, newItems: 0, savedUndoRestoredOriginal: true, reloadMutationDelta: 0,
    successRepeatAfterUndo: 'same user gesture once, not failure retry', successfulMultilineNotesReloadedExactly: true,
    successfulSourceIdsDateTimeProgressAndOtherSameTitleItemUnchanged: true, successfulReloadCommandMutationDelta: 0 } });
}

async function immediateInverse(page: Page, mock: Mock, first: 'Tab' | 'Shift+Tab', expectedRaw: string, docId: string, evidence: Evidence[]) {
  // Tab requires an actual preceding same-depth sibling. The selected list
  // directly after its parent cannot be indented across a skipped level.
  await needleCaret(area(page), first === 'Tab' ? '뒤 형제 목록' : '선택', true);
  const selection = await area(page).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd }));
  const before = await snapshot(page, mock);
  const storageBefore = await identityStorage(page);
  // No caret event, refocus, screenshot or timer advancement between these
  // actual keys: the current native lease intentionally requires immediacy.
  await area(page).press(first);
  const transientRaw = await area(page).inputValue();
  assert.notEqual(transientRaw, expectedRaw, `${first} must really change the subtree before its inverse`);
  await area(page).press(first === 'Tab' ? 'Shift+Tab' : 'Tab');
  await expect(area(page)).toHaveValue(expectedRaw); await expect(area(page)).toBeFocused();
  assert.deepEqual(await area(page).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd })), selection);
  await page.clock.runFor(700); await expect(editor(page)).toHaveAttribute('data-dirty', 'false');
  const after = await snapshot(page, mock), storageAfter = await identityStorage(page);
  // Diagnostic evidence precedes the bounded shadow-capture assertion. This fresh mock context
  // contains only fixture-owned synthetic values; no existing user storage is read.
  evidence.push({ type: 'writing-inverse-storage-diagnostic', data: { first,
    expectedRawSha256: createHash('sha256').update(expectedRaw).digest('hex'),
    actualTransientRaw: transientRaw,
    storageCallCount: { before: before.storage, after: after.storage },
    exactNewCalls: storageAfter.calls.slice(storageBefore.calls.length),
    exactSyntheticLocalEntries: { before: storageBefore.local, after: storageAfter.local },
    exactSyntheticSessionEntries: { before: storageBefore.session, after: storageAfter.session },
    accountBytesUnchanged: canonicalJson(before.account) === canonicalJson(after.account),
    CASRevisionDelta: after.account.revision - before.account.revision, commandDelta: after.commands - before.commands,
    mutationDelta: after.counts.mutations - before.counts.mutations, operationDelta: after.counts.operations - before.counts.operations,
    assertionPolicy: 'real edit/inverse only: one exact intermediate-draft shadow capture; global read/cancel noChange unchanged' } });
  const capture = assertInverseShadowCapture(before, after, storageBefore, storageAfter, docId, transientRaw);
  return { before, after, storageBefore, storageAfter, transientRaw, ...capture };
}

async function writingRegion(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  await pauseWriting(page);
  const view = readProgramFolderRegions(initial.space.text, docId, folderIds.work)!; assert.equal(view.regions.length, 2);
  await chooseScope(page, folderIds.work); await expect(regionAreas(page)).toHaveCount(2);
  const source = M.getDocument(initial.space.text, docId)!, firstLine = source.lines.find(line => line.text.includes('메모: 첫 날짜 메모'))!, secondLine = source.lines.find(line => line.text.includes('메모: 둘째 날짜 메모'))!;
  const tasks = M.tasks(initial.space.text).filter(task => task.docId === docId && task.title === '같은 제목');
  const firstItem = tasks.find(task => task.date === '2026-10-01')!, secondItem = tasks.find(task => task.date === today)!;
  assert.notEqual(firstItem.id, secondItem.id);
  const visible = new Set(view.regions.flatMap(region => region.lineIds)), hidden = source.lines.filter(line => !visible.has(line.id));
  const originalItems = M.parseDocument(source, initial.space.text).items;
  const assertRegionState = (account: AlphaAccount, first: boolean, second: boolean) => {
    const notes = new Map([[firstItem.id, `${firstItem.note}${first ? 'x' : ''}`], [secondItem.id, `${secondItem.note}${second ? 'y' : ''}`]]);
    assertWritingPreserved(initial, account, docId, new Set([firstLine.id, secondLine.id]), notes);
    const document = M.getDocument(account.space.text, docId)!;
    assert.deepEqual(document.lines.filter(line => hidden.some(entry => entry.id === line.id)), hidden);
    assert.deepEqual(M.parseDocument(document, account.space.text).items, originalItems.map(item => ({ ...item, note: notes.get(item.id) ?? item.note })));
  };
  const historyOperations: { kind: string; requestId: string; expectedRevision: number; revision: number; operationId?: string }[] = [];
  const historyStep = async (mode: 'undo' | 'redo', target: AlphaAccount, operationId?: string) => {
    const before = await snapshot(page, mock);
    const management = page.locator('details[aria-label="계정 및 자료 관리"]');
    if (mode === 'redo' && await management.getAttribute('open') === null) await click(management.locator('summary'));
    await expect(mode === 'undo' ? undo(page) : redo(page)).toBeEnabled();
    await click(mode === 'undo' ? undo(page) : redo(page));
    await expect.poll(async () => (await mock.current()).space.text).toEqual(target.space.text);
    await expect(editor(page)).toHaveAttribute('data-dirty', 'false');
    const current = await mock.current(); assertOneSave(mock, before, current);
    const command = mock.commands.at(-1)!;
    assert(!mock.commands.slice(0, -1).some(previous => previous.requestId === command.requestId), 'Each history action has one new operation ID');
    if (mode === 'undo') {
      assert.equal(command.kind, 'undo-private'); assert(command.kind === 'undo-private');
      assert.equal(command.operationId, operationId); await expect(undo(page)).toBeDisabled();
    } else {
      assert.equal(command.kind, 'change-private'); assert(command.kind === 'change-private');
      assert(command.changes.some(change => change.field === 'text'), 'Redo submits the exact retained text postimage');
      for (const change of command.changes) {
        assert(['text', 'position'].includes(change.field)); assert(change.present);
        assert.deepEqual(change.value, target.space[change.field]);
      }
      if (await management.getAttribute('open') !== null) await click(management.locator('summary'));
    }
    historyOperations.push({ kind: command.kind, requestId: command.requestId, expectedRevision: command.expectedRevision,
      revision: current.revision, ...(command.kind === 'undo-private' ? { operationId: command.operationId } : {}) });
    return current;
  };
  for (const index of [0, 1]) await expect(regionAreas(page).nth(index)).toHaveValue(view.regions[index].raw);
  assert(!(await regionAreas(page).evaluateAll(fields => fields.map(field => (field as HTMLTextAreaElement).value).join('\n'))).includes('숨은 중간'));
  await needleCaret(regionAreas(page).nth(0), '메모: 첫 날짜 메모'); const beforeFirst = await snapshot(page, mock);
  await regionAreas(page).nth(0).pressSequentially('x');
  const firstRaw = writingRaw.replace('첫 날짜 메모', '첫 날짜 메모x'); await savedWriting(page, mock, docId, firstRaw);
  const firstSaved = await mock.current(); assertOneSave(mock, beforeFirst, firstSaved);
  assertRegionState(firstSaved, true, false); const firstOperation = mock.commands.at(-1)!.requestId;
  // Server history retains one latest successful transaction, not a stack.
  // Exercise each region transaction independently through real Undo and Redo.
  assertRegionState(await historyStep('undo', initial, firstOperation), false, false);
  const firstRestored = await historyStep('redo', firstSaved); assertRegionState(firstRestored, true, false);
  await needleCaret(regionAreas(page).nth(1), '메모: 둘째 날짜 메모'); const beforeSecond = await snapshot(page, mock);
  await regionAreas(page).nth(1).pressSequentially('y');
  const secondRaw = firstRaw.replace('둘째 날짜 메모', '둘째 날짜 메모y'); await savedWriting(page, mock, docId, secondRaw);
  const bothSaved = await mock.current(); assertOneSave(mock, beforeSecond, bothSaved);
  assertRegionState(bothSaved, true, true); const secondOperation = mock.commands.at(-1)!.requestId;
  await screenshot(page, 'writing-region', width, 'two-disjoint-regions-saved', evidence);
  assertRegionState(await historyStep('undo', firstRestored, secondOperation), true, false);
  const bothRestored = await historyStep('redo', bothSaved); assertRegionState(bothRestored, true, true);
  const restoredView = readProgramFolderRegions(bothRestored.space.text, docId, folderIds.work)!;
  const rejected = await snapshot(page, mock);
  for (const key of ['Tab', 'Shift+Tab'] as const) {
    await needleCaret(regionAreas(page).nth(0), key === 'Tab' ? '뒤 형제 목록' : '선택', true); await regionAreas(page).nth(0).press(key);
    await expect(regionAreas(page).nth(0)).toHaveValue(restoredView.regions[0].raw);
    const notice = editor(page).getByRole('status').filter({ hasText: '이 조작은 전체 문서에서 할 수 있습니다. 입력은 그대로 남아 있습니다.' });
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText('이 조작은 전체 문서에서 할 수 있습니다. 입력은 그대로 남아 있습니다.');
    await page.clock.runFor(700); await noChange(page, mock, rejected);
  }
  const continuation = editor(page).getByRole('button', { name: '전체 문서에서 계속 편집', exact: true });
  const localSelection = await regionAreas(page).nth(0).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd }));
  const prefixOffset = M.getDocument(bothRestored.space.text, docId)!.lines.slice(0, restoredView.regions[0].startIndex).reduce((offset, line) => offset + line.text.length + 1, 0);
  const wholeSelection = { start: prefixOffset + localSelection.start, end: prefixOffset + localSelection.end };
  await click(continuation); await expect(area(page)).toHaveValue(secondRaw); await expect(area(page)).toBeFocused();
  assert.deepEqual(await area(page).evaluate((field: HTMLTextAreaElement) => ({ start: field.selectionStart, end: field.selectionEnd })), wholeSelection,
    'Explicit region-to-whole handoff preserves the exact original-document caret');
  await noChange(page, mock, rejected);
  const firstInverse = await immediateInverse(page, mock, 'Tab', secondRaw, docId, evidence);
  const secondInverse = await immediateInverse(page, mock, 'Shift+Tab', secondRaw, docId, evidence);
  assert.equal(firstInverse.key, secondInverse.key); assert.notEqual(firstInverse.transientRaw, secondInverse.transientRaw);
  assert.deepEqual(firstInverse.before, rejected);
  assert.deepEqual(secondInverse.before, firstInverse.after);
  assert.deepEqual(secondInverse.after, { ...rejected, storage: rejected.storage + 2 });
  assert.deepEqual(secondInverse.storageAfter.calls.slice(firstInverse.storageBefore.calls.length), [
    { method: 'setItem', storage: 'session', key: firstInverse.key, value: firstInverse.bytes },
    { method: 'setItem', storage: 'session', key: secondInverse.key, value: secondInverse.bytes },
  ]);
  assert.deepEqual(secondInverse.storageAfter.local, firstInverse.storageBefore.local);
  assert.deepEqual(secondInverse.storageAfter.session, { ...firstInverse.storageBefore.session, [secondInverse.key]: secondInverse.bytes });
  // Escape explicitly gives Tab back to normal keyboard navigation.
  const beforeEscape = await snapshot(page, mock);
  await area(page).press('Escape'); await area(page).press('Tab'); await expect(area(page)).not.toBeFocused();
  await noChange(page, mock, beforeEscape);
  // Net-inverse account state is unchanged, but the intermediate real input is
  // intentionally still recoverable. Remove only this synthetic backup through UI.
  assert.equal(firstInverse.storageBefore.session[firstInverse.key], undefined);
  const recoverySummary = page.getByText('보관한 입력 1개', { exact: true });
  const recovery = page.locator('details').filter({ has: recoverySummary }); await expect(recovery).toHaveCount(1);
  if (await recovery.getAttribute('open') === null) await click(recoverySummary);
  await expect(recovery.getByRole('textbox', { name: '보관한 입력 1', exact: true })).toHaveValue(secondInverse.transientRaw);
  await click(recovery.getByRole('button', { name: '보관 입력 버리기', exact: true })); await expect(recoverySummary).toHaveCount(0);
  const afterDiscard = await snapshot(page, mock), storageDiscarded = await identityStorage(page);
  assert.deepEqual(afterDiscard, { ...beforeEscape, storage: beforeEscape.storage + 1 });
  assert.deepEqual(storageDiscarded.calls.slice(secondInverse.storageAfter.calls.length), [{ method: 'removeItem', storage: 'session', key: secondInverse.key, value: null }]);
  assert.deepEqual(storageDiscarded.local, firstInverse.storageBefore.local); assert.deepEqual(storageDiscarded.session, firstInverse.storageBefore.session);
  assert.equal(storageDiscarded.calls.filter(call => call.method === 'clear').length, 0);
  await expect(area(page)).toHaveValue(secondRaw); assertRegionState(afterDiscard.account, true, true);
  await reloadWriting(page, mock, bothRestored, docId, secondRaw);
  const reloaded = await mock.current(); assert.equal(reloaded.revision, bothRestored.revision); assertRegionState(reloaded, true, true);
  evidence.push({ type: 'writing-region-contract', data: { regionCount: 2, regionItemIds: [firstItem.id, secondItem.id], hiddenLineIds: hidden.map(line => line.id),
    independentNativeTypingAndCheckedFullModelSaves: true, eachTransactionUndoAndRedoExactPostimages: true, historyOperations,
    serverHistory: 'one latest successful transaction; multi-level Undo stack not supported or claimed', hiddenWhitespaceAndZeroWidthSourcePreserved: true,
    itemIdsDatesScopesCompletionAndProgressPreserved: true, partialStructureKeys: 'REJECTED_ZERO_WRITE', explicitWholeDocumentHandoff: true,
    wholeDocumentHandoffSelection: wholeSelection, wholeTabShiftTabAndShiftTabTab: 'exact raw/caret/model inverse; zero account save, two exact intermediate-input backup writes',
    intermediateInputRecovery: { key: secondInverse.key, exactSetCalls: 2, explicitDiscardRemoveCalls: 1, clearCalls: 0, otherLocalAndSessionBytesUnchanged: true },
    escapeTabLeavesEditor: true, escapeUsesStrictNoChangeAfterInverse: true, savedReloadPreservesSameIds: true } });
}

async function writingIdentityReject(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  await pauseWriting(page); await needleCaret(area(page), '첫째', true); const before = await snapshot(page, mock);
  const storageBefore = await identityStorage(page);
  // AlphaWorkspace owns this exact per-tab slot in sessionStorage; the UI
  // recovery record is also session-only, never a localStorage exemption.
  const slotId = storageBefore.session['flow:poc:personal-workspace:v1:alpha-m3:tab']; assert(slotId);
  const key = alphaUiRecoveryKey(initial.ownerId, slotId), document = M.getDocument(initial.space.text, docId)!;
  assert.equal(Object.keys(storageBefore.local).filter(entry => entry.startsWith(ALPHA_UI_RECOVERY_PREFIX)).length, 0);
  assert.equal(Object.keys(storageBefore.session).filter(entry => entry.startsWith(ALPHA_UI_RECOVERY_PREFIX)).length, 0);
  await area(page).press('Enter'); const rejectedRaw = '- [ ] 첫째\n- [ ] 둘째\n- [ ] 뒤 할 일';
  await expect(area(page)).toHaveValue(rejectedRaw); await expect(editor(page)).toHaveAttribute('data-dirty', 'true');
  await expect(editor(page).getByRole('alert')).toContainText('여러 줄의 변경을 기존 항목과 연결하지 못해 반영하지 않았습니다.');
  await expect(editor(page).getByRole('button', { name: '다시 저장', exact: true })).toBeDisabled();
  await page.clock.runFor(700);
  const retained = await snapshot(page, mock), storageRetained = await identityStorage(page);
  assert.deepEqual(retained, { ...before, storage: before.storage + 1 }, 'Rejected input adds only the bounded UI recovery write, never an account command');
  const expectedRecord = { schema: ALPHA_UI_RECOVERY_SCHEMA, ownerId: initial.ownerId, slotId,
    drafts: [{ documentId: docId, title: document.title, raw: rejectedRaw }] };
  const expectedBytes = canonicalJson(expectedRecord), parsed: unknown = JSON.parse(storageRetained.session[key]);
  assert(validateAlphaUiRecovery(parsed, initial.ownerId, slotId)); assert.deepEqual(parsed, expectedRecord);
  assert.equal(storageRetained.session[key], expectedBytes);
  assert.deepEqual(storageRetained.local, storageBefore.local);
  assert.deepEqual(storageRetained.session, { ...storageBefore.session, [key]: expectedBytes });
  assert.deepEqual(storageRetained.calls.slice(storageBefore.calls.length), [{ method: 'setItem', storage: 'session', key, value: expectedBytes }]);
  assert.deepEqual((await mock.current()).space.text, initial.space.text);
  await screenshot(page, 'writing-identity-reject', width, 'ambiguous-title-split-retained-with-zero-writer', evidence);
  await click(editor(page).getByRole('button', { name: '저장본으로 되돌리기', exact: true }));
  await expect(area(page)).toHaveValue(rawByCase['writing-identity-reject']); await expect(editor(page)).toHaveAttribute('data-dirty', 'false');
  // Editor restoration does not silently erase the safe backup. Its deletion
  // requires the separate, explicit recovery-drawer action below.
  await noChange(page, mock, retained); assert.deepEqual(await identityStorage(page), storageRetained);
  const recoverySummary = page.getByText('보관한 입력 1개', { exact: true });
  const recovery = page.locator('details').filter({ has: recoverySummary }); await expect(recovery).toHaveCount(1);
  if (await recovery.getAttribute('open') === null) await click(recoverySummary);
  const draft = recovery.getByRole('textbox', { name: '보관한 입력 1', exact: true });
  await expect(draft).toHaveValue(rejectedRaw); await expect(draft).toHaveAttribute('readonly', '');
  await click(recovery.getByRole('button', { name: '보관 입력 버리기', exact: true })); await expect(recoverySummary).toHaveCount(0);
  const discarded = await snapshot(page, mock), storageDiscarded = await identityStorage(page);
  assert.deepEqual(discarded, { ...before, storage: before.storage + 2 });
  assert.deepEqual(storageDiscarded.calls.slice(storageBefore.calls.length), [
    { method: 'setItem', storage: 'session', key, value: expectedBytes }, { method: 'removeItem', storage: 'session', key, value: null },
  ]);
  assert.deepEqual(storageDiscarded.local, storageBefore.local); assert.deepEqual(storageDiscarded.session, storageBefore.session);
  assert.equal(storageDiscarded.calls.filter(call => call.method === 'clear').length, 0);
  await reloadWriting(page, mock, await mock.current(), docId, rawByCase['writing-identity-reject']);
  const storageReloaded = await identityStorage(page);
  assert.deepEqual(storageReloaded.local, storageBefore.local); assert.deepEqual(storageReloaded.session, storageBefore.session);
  assert.equal(storageReloaded.calls.filter(call => call.method === 'clear').length, 0);
  evidence.push({ type: 'writing-identity-rejection-contract', data: { titleMiddleEnter: 'identity-ambiguous, not a successful save', retainedRaw: rejectedRaw,
    sourceIdsAndProgressUnchanged: true, writerCommandDelta: 0, mutationDelta: 0, CASRevisionDelta: 0,
    recovery: { key, storage: 'session', schema: parsed.schema, documentId: parsed.drafts[0].documentId,
      recordSha256: createHash('sha256').update(expectedBytes).digest('hex'), draftSha256: createHash('sha256').update(rejectedRaw).digest('hex'),
      exactCalls: [{ method: 'setItem', key }, { method: 'removeItem', key }], clearCalls: 0, otherLocalAndSessionBytesUnchanged: true },
    explicitActions: ['저장본으로 되돌리기 retains the recovery record', '보관 입력 버리기 removes only that exact synthetic record'],
    explicitDiscardBeforeReload: true, reloadAccountCommandDelta: 0 } });
}

async function todaySource(page: Page, mock: Mock, initial: AlphaAccount, docId: string, width: number, evidence: Evidence[]) {
  await runFeedbackDateBrowser({ page, mock, initial, docId, width, evidence,
    ui: { click, area, editor, undo, caret, settle, screenshot, snapshot, noChange } });
}

function verifyParameterContracts() {
  const empty = createEmptyTextWorkspace();
  const catalog = { ...empty, folders: [...empty.folders,
    { id: folderIds.company, title: '회사', parentId: null }, { id: folderIds.work, title: '업무', parentId: folderIds.company },
    { id: folderIds.personal, title: '개인', parentId: null }, { id: folderIds.homonym, title: '업무', parentId: folderIds.personal }] };
  const seeds = new Map(cases.map(name => {
    const prepared = seedText(catalog, name);
    if (name === 'today-source') {
      const synthetic = emptyAccount('a') as AlphaAccount; synthetic.space.text = prepared.text;
      prepared.text = prepareFeedbackDateAccount(synthetic, prepared.docId).space.text;
    }
    return [name, prepared] as const;
  }));
  for (const name of cases) assert.equal(M.raw(M.getDocument(seeds.get(name)!.text, seeds.get(name)!.docId)), rawByCase[name]);
  const folder = seeds.get('folder-direct')!, doc = M.getDocument(folder.text, folder.docId)!;
  for (const [index, relation] of [[0, 'after-subtree'], [3, 'same-line'], [6, 'same-line'], [4, 'after-line'], [5, 'after-line'], [7, 'inside-scope']] as const) {
    assert.equal(programFolderLinkPreview(folder.text, folder.docId, doc.lines[index].id)?.destination.relation, relation);
  }
  const source = seeds.get('writing-enter')!, rows = M.rowMeta(source.text, source.docId);
  const end = writingRaw.indexOf('  - [20%] 같은 제목') + '  - [20%] 같은 제목'.length;
  const plan = inputPlans.planTaskEnter(writingRaw, { start: end, end }, rows.find(row => row.text === '  - [20%] 같은 제목'));
  const scaffold = writingRaw.replace('      - [ ] 손자\n', '      - [ ] 손자\n  - [ ] \n'); assert.equal(plan?.nextRaw, scaffold);
  const scaffoldEdit = M.editTextResult(source.text, source.docId, scaffold); assert.equal(scaffoldEdit.reason, null);
  const created = writingRaw.replace('      - [ ] 손자\n', '      - [ ] 손자\n  - [ ] 새 형제\n');
  const createdEdit = M.editTextResult(scaffoldEdit.state, source.docId, created); assert.equal(createdEdit.reason, null);
  const exit = created.replace('  - [ ] \n숨은 중간', '\n숨은 중간');
  const exited = M.editTextResult(createdEdit.state, source.docId, exit); assert.equal(exited.reason, null);
  const seedDoc = M.getDocument(source.text, source.docId)!, scaffoldId = seedDoc.lines.find(line => line.text === '  - [ ] ')!.id;
  const existingIds = seedDoc.lines.map(line => line.id);
  assert(!M.getDocument(exited.state, source.docId)!.lines.some(line => line.id === scaffoldId));
  assert.deepEqual(M.getDocument(exited.state, source.docId)!.lines.filter(line => existingIds.includes(line.id)).map(line => line.id), existingIds.filter(id => id !== scaffoldId));
  const accountFor = (text: TextWorkspaceState) => { const account = emptyAccount('a') as AlphaAccount; account.space.text = text; return account; };
  assertWritingPreserved(accountFor(source.text), accountFor(exited.state), source.docId, new Set([scaffoldId]), new Map(), new Set([scaffoldId]));
  const memoSeed = seeds.get('writing-memo')!;
  let memoState = memoSeed.text, memoRaw = writingRaw;
  for (const [needle, addition, prefix] of [['첫 날짜 메모', '부모 추가 설명', '    '], ['자식 메모', '자식 추가 설명', '      ']] as const) {
    const at = memoRaw.indexOf(needle) + needle.length, meta = M.rowMeta(memoState, memoSeed.docId).find(row => row.text.endsWith(`메모: ${needle}`));
    const memo = inputPlans.planMemoEnter(memoRaw, { start: at, end: at }, meta); assert(memo);
    assert.equal(memo.nextRaw, memoRaw.replace(`${needle}\n`, `${needle}\n${prefix}- 메모: \n`));
    const pending = M.editTextResult(memoState, memoSeed.docId, memo.nextRaw); assert.equal(pending.reason, null);
    memoRaw = memo.nextRaw.slice(0, memo.selectionAfter.start) + addition + memo.nextRaw.slice(memo.selectionAfter.start);
    const completed = M.editTextResult(pending.state, memoSeed.docId, memoRaw); assert.equal(completed.reason, null); memoState = completed.state;
  }
  const oldMemoTasks = M.tasks(memoSeed.text).filter(task => task.docId === memoSeed.docId);
  assert.equal(M.tasks(memoState).filter(task => task.docId === memoSeed.docId).length, oldMemoTasks.length);
  for (const task of oldMemoTasks) {
    const current = M.tasks(memoState).find(entry => entry.id === task.id)!; assert(current);
    assert.equal(current.note, task.title === '자식' ? `${task.note}\n자식 추가 설명`
      : task.title === '같은 제목' && task.date === '2026-10-01' ? `${task.note}\n부모 추가 설명` : task.note);
  }
  assertWritingPreserved(accountFor(memoSeed.text), accountFor(memoState), memoSeed.docId, new Set(), new Map(oldMemoTasks.map(task => [task.id,
    task.title === '자식' ? `${task.note}\n자식 추가 설명` : task.title === '같은 제목' && task.date === '2026-10-01' ? `${task.note}\n부모 추가 설명` : task.note])));
  const oldMemoItems = M.parseDocument(M.getDocument(memoSeed.text, memoSeed.docId)!, memoSeed.text).items;
  const newMemoItems = M.parseDocument(M.getDocument(memoState, memoSeed.docId)!, memoState).items;
  const exactParent = oldMemoItems.find(item => item.title === '같은 제목' && item.date === '2026-10-01')!; assert(exactParent);
  const children = oldMemoItems.filter(item => item.title === '자식' && item.parentItemId === exactParent.id); assert.equal(children.length, 1);
  const exactChild = children[0], savedChild = newMemoItems.find(item => item.id === exactChild.id)!; assert(savedChild);
  assert(!oldMemoTasks.some(task => task.id === exactChild.id), 'Nested source Items are not top-level canonical execution tasks');
  assert.equal(savedChild.note, `${exactChild.note}\n자식 추가 설명`);
  for (const key of ['title', 'date', 'groupDate', 'time', 'parentItemId', 'parentTaskId', 'scopeId', 'depth', 'done'] as const) assert.deepEqual(savedChild[key], exactChild[key]);
  assert.deepEqual(newMemoItems.map(item => item.id), oldMemoItems.map(item => item.id));
  const otherMemoItem = oldMemoTasks.find(task => task.title === '같은 제목' && task.date === today)!;
  assert.deepEqual(M.tasks(memoState).find(task => task.id === otherMemoItem.id), { ...otherMemoItem, sourceIndex: otherMemoItem.sourceIndex + 2 });
  const regional = seeds.get('writing-region')!, view = readProgramFolderRegions(regional.text, regional.docId, folderIds.work)!;
  assert.equal(view.regions.length, 2);
  let regionalState = regional.text;
  for (const [index, needle, text] of [[0, '첫 날짜 메모', '첫 날짜 메모x'], [1, '둘째 날짜 메모', '둘째 날짜 메모y']] as const) {
    const currentView = readProgramFolderRegions(regionalState, regional.docId, folderIds.work)!;
    const changed = planProgramRegionEdit(regionalState, currentView, currentView.regions[index].key, currentView.regions[index].raw.replace(needle, text));
    assert(changed.ok, 'Exact independent region typing must be accepted'); regionalState = changed.next;
  }
  assert.equal(M.raw(M.getDocument(regionalState, regional.docId)), writingRaw.replace('첫 날짜 메모', '첫 날짜 메모x').replace('둘째 날짜 메모', '둘째 날짜 메모y'));
  const regionalDoc = M.getDocument(regional.text, regional.docId)!;
  const modified = new Set(regionalDoc.lines.filter(line => /메모: (첫|둘째) 날짜 메모/.test(line.text)).map(line => line.id));
  assertWritingPreserved(accountFor(regional.text), accountFor(regionalState), regional.docId, modified,
    new Map(M.tasks(regional.text).filter(task => task.docId === regional.docId && task.title === '같은 제목').map(task => [task.id, `${task.note}${task.date === today ? 'y' : 'x'}`])));
  // Pure sanity for the same regional-writing contract, not an additional UI
  // case: only one exact intermediate-draft capture may differ from net inverse.
  const shadowBefore = { account: accountFor(regionalState), counts: { mutations: 0, operations: 0 }, commands: 0, storage: 0 };
  const shadowStorageBefore: IdentityStorageSnapshot = { calls: [], local: { 'synthetic-local': 'unchanged' },
    session: { 'flow:poc:personal-workspace:v1:alpha-m3:tab': 'synthetic-feedback-slot' } };
  const currentRegionalRaw = M.raw(M.getDocument(regionalState, regional.docId)), atSibling = currentRegionalRaw.indexOf('뒤 형제 목록') + '뒤 형제 목록'.length;
  const transient = inputPlans.planIndent(currentRegionalRaw, { start: atSibling, end: atSibling }, M.rowMeta(regionalState, regional.docId), false); assert(transient);
  const shadowKey = alphaUiRecoveryKey(shadowBefore.account.ownerId, 'synthetic-feedback-slot');
  const shadowBytes = canonicalJson({ schema: ALPHA_UI_RECOVERY_SCHEMA, ownerId: shadowBefore.account.ownerId, slotId: 'synthetic-feedback-slot',
    drafts: [{ documentId: regional.docId, title: M.getDocument(regionalState, regional.docId)!.title, raw: transient.nextRaw }] });
  const shadowStorageAfter: IdentityStorageSnapshot = { calls: [{ method: 'setItem', storage: 'session', key: shadowKey, value: shadowBytes }],
    local: { ...shadowStorageBefore.local }, session: { ...shadowStorageBefore.session, [shadowKey]: shadowBytes } };
  assertInverseShadowCapture(shadowBefore, { ...shadowBefore, storage: 1 }, shadowStorageBefore, shadowStorageAfter, regional.docId, transient.nextRaw);
  assert.throws(() => assertInverseShadowCapture(shadowBefore, { ...shadowBefore, storage: 1 }, shadowStorageBefore,
    { ...shadowStorageAfter, calls: [...shadowStorageAfter.calls, { method: 'clear', storage: 'session', key: null, value: null }] }, regional.docId, transient.nextRaw));
  assert.throws(() => assertInverseShadowCapture(shadowBefore, { ...shadowBefore, storage: 1 }, shadowStorageBefore,
    { ...shadowStorageAfter, local: { 'synthetic-local': 'changed' } }, regional.docId, transient.nextRaw));
  assert.throws(() => assertInverseShadowCapture(shadowBefore, { ...shadowBefore, storage: 1 }, shadowStorageBefore, shadowStorageAfter, regional.docId, currentRegionalRaw));
  for (const outdent of [false, true]) {
    const needle = outdent ? '선택' : '뒤 형제 목록';
    const offset = writingRaw.indexOf(needle) + needle.length, selection = { start: offset, end: offset, direction: 'none' as const };
    const first = inputPlans.planIndent(writingRaw, selection, rows, outdent, [], null, 0); assert(first && first.nextRaw !== writingRaw);
    const edited = M.editTextResult(regional.text, regional.docId, first.nextRaw); assert.equal(edited.reason, null, `Whole structure key must be admissible: ${outdent}`);
    const inverse = inputPlans.planIndent(first.nextRaw, first.selectionAfter, M.rowMeta(edited.state, regional.docId), !outdent, [], inputPlans.indentLease(first, 1), 1);
    assert.equal(inverse?.nextRaw, writingRaw); assert.deepEqual(inverse?.selectionAfter, selection);
    const restored = M.editTextResult(edited.state, regional.docId, writingRaw); assert.equal(restored.reason, null); assert.deepEqual(restored.state, regional.text);
    const fragment = view.regions[0], localAt = fragment.raw.indexOf(needle) + needle.length;
    const previewRows = M.rowMeta(regional.text, regional.docId).slice(fragment.startIndex, fragment.endIndex).map(row => ({ ...row, subtreeEndIndex: Math.min(fragment.endIndex, row.subtreeEndIndex) - fragment.startIndex }));
    const rejected = inputPlans.planIndent(fragment.raw, { start: localAt, end: localAt }, previewRows, outdent); assert(rejected);
    assert.equal(planProgramRegionEdit(regional.text, view, fragment.key, rejected.nextRaw).ok, false, 'Partial structural edit must remain a rejection');
  }
  const gapAt = writingRaw.indexOf('선택') + '선택'.length;
  const skippedLevel = inputPlans.planIndent(writingRaw, { start: gapAt, end: gapAt }, rows, false); assert(skippedLevel);
  assert.equal(M.editTextResult(regional.text, regional.docId, skippedLevel.nextRaw).reason, 'invalid-format', 'Skipped-level Tab is not an inverse success');
  const identity = seeds.get('writing-identity-reject')!, rejectedRaw = '- [ ] 첫째\n- [ ] 둘째\n- [ ] 뒤 할 일';
  const rejected = M.editTextResult(identity.text, identity.docId, rejectedRaw); assert.equal(rejected.reason, 'identity-ambiguous'); assert.equal(rejected.state, identity.text);
  return { evidence: 'PURE PARAMETERS ONLY: isolated seed/model/input-plan contracts; no DOM, callback, Auth/API mock, server or browser execution',
    seedCases: cases.length, writingParameterContracts: 4, folderSlotContracts: 6, actualBrowserRuns: 0, mockInvocations: 0,
    plannedCases: cases, plannedViewportRuns: cases.length * journeyViewports.length,
    explicitLimits: ['Non-Item empty-checkbox source ID is replaced on escape', 'Tab across a skipped level is invalid-format, not inverse success', 'Null/end folder slot is pure/JSX only'],
    initialParameterAssertionFailures: [
      { assumption: 'Every existing source line ID survives empty-checkbox escape', observed: 'Non-Item scaffold ID is replaced by a new blank line ID', seedChanged: false },
      { assumption: 'Tab on a direct child with no preceding same-depth sibling is admissible', observed: 'invalid-format skipped-level rejection; successful inverse uses a legal preceding-sibling anchor', seedChanged: false },
    ] };
}

async function main() {
  const parameters = verifyParameterContracts();
  if (process.argv.slice(2).length) {
    assert.deepEqual(process.argv.slice(2), ['--contract-only'], 'Unknown driver argument');
    console.log(JSON.stringify(parameters, null, 2)); return;
  }
  const build = buildPreflight();
  const single = process.env.FLOWME_FEEDBACK_QA_SINGLE, selected = process.env.FLOWME_FEEDBACK_QA_CASE;
  if (single !== undefined && single !== '1') throw Error('feedback-single-option-rejected');
  if (selected !== undefined && !cases.some(name => name === selected)) throw Error('feedback-case-option-rejected');
  const selectedCases = selected ? cases.filter(name => name === selected) : cases;
  const viewports = single === '1' ? [[1440, 900] as const] : journeyViewports;
  assert(!existsSync(directory), 'Use a fresh feedback QA label; previous evidence must not be overwritten');
  const qaPaths = ['scripts/alpha/feedback-ux-browser.ts', 'scripts/alpha/feedback-ux-date-browser.ts', 'scripts/alpha/feedback-ux-regression.mjs',
    'scripts/alpha/flow-execution-journey-contract.ts', 'tests/e2e/flow-execution-journey.fixture.ts',
    'tests/e2e/folder-content-entry.fixture.ts', 'tests/e2e/cloudflare-release.fixture.ts', 'tests/e2e/alpha-auth.fixture.ts'];
  const qaSources = qaPaths.map(path => ({ path, sha256: hash(resolve(root, path)) }));
  const qaUnchanged = () => { for (const source of qaSources) assert.equal(hash(resolve(root, source.path)), source.sha256, `QA source drift: ${source.path}`); };
  await serverPreflight(build.buildId);
  mkdirSync(directory, { recursive: true });
  outputOwnedThisRun = true;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results: Result[] = [];
  try {
    for (const [width, height] of viewports) for (const name of selectedCases) {
      const evidence: Evidence[] = [];
      let context: BrowserContext | undefined, page: Page | undefined, mock: Mock | undefined;
      const info = { outputPath: (file: string) => resolve(directory, `${name}-${width}-${file}`),
        attach: async (type: string, attachment: { body?: string | Buffer }) => {
          if (attachment.body) evidence.push({ type, data: JSON.parse(attachment.body.toString()) });
        } } as TestInfo;
      try {
        context = await browser.newContext({ viewport: { width, height }, baseURL: RELEASE_ORIGIN, serviceWorkers: 'block', timezoneId: 'Asia/Seoul' });
        page = await context.newPage(); await page.clock.setFixedTime(new Date('2026-10-02T03:00:00Z'));
        if (name === 'writing-identity-reject' || name === 'writing-region') await installIdentityStorageAudit(page);
        mock = await mockFolderContentEntry(page, { creatorExecution: true, prepareAccount: seed(name) });
        const document = await page.goto('/alpha');
        assert(document && (await document.text()).includes(build.buildId), 'Served HTML does not identify the frozen build');
        await login(page);
        const management = page.locator('details[aria-label="계정 및 자료 관리"]');
        if (await management.getAttribute('open') !== null) await click(management.locator('summary'));
        const initial = await mock.current(), docId = initial.space.position.documentId!;
        assert.equal(M.raw(M.getDocument(initial.space.text, docId)), rawByCase[name], 'Exact seed source must reach the synthetic account unchanged');
        await expect(area(page)).toHaveValue(rawByCase[name]);
        if (name === 'folder-direct') await folderDirect(page, mock, initial, docId, width, evidence);
        else if (name === 'folder-input') await folderInput(page, mock, initial, docId, width, evidence);
        else if (name === 'today-source') await todaySource(page, mock, initial, docId, width, evidence);
        else if (name === 'writing-enter') await writingEnter(page, mock, initial, docId, width, evidence);
        else if (name === 'writing-memo') await writingMemo(page, mock, initial, docId, width, evidence);
        else if (name === 'writing-region') await writingRegion(page, mock, initial, docId, width, evidence);
        else if (name === 'writing-identity-reject') await writingIdentityReject(page, mock, initial, docId, width, evidence);
        else assert.fail(`Unimplemented case: ${name}`);
        await mock.assertBoundary(info);
        const boundary = evidence.find(item => item.type === 'release-boundary')?.data as { assets?: { path: string; sha256: string }[] } | undefined;
        assert(boundary?.assets?.length, 'Actual static asset hashes are required');
        for (const asset of boundary.assets) {
          assert(/^\/_next\/static\/[A-Za-z0-9_./%-]+$/.test(asset.path) && !asset.path.includes('..'));
          const path = resolve(build.workspace, '.next', asset.path.slice('/_next/'.length)); assert(existsSync(path));
          assert.equal(hash(path), asset.sha256, `Served asset is not the frozen build: ${asset.path}`);
        }
        build.unchanged(); qaUnchanged();
        evidence.push({ type: 'frozen-build-identity', data: { buildId: build.buildId, inputHash: build.inputHash, sources: build.sourceCount,
          currentAndCopiedSourceDrift: 0, actualServedAssetHashMatches: boundary.assets.length } });
        await screenshot(page, name, width, 'final', evidence); results.push({ name, width, height, ok: true, evidence });
      } catch (error) {
        evidence.push({ type: 'failed-synthetic-commands', data: mock?.commands ?? [] });
        evidence.push({ type: 'case-runtime-failure', data: { error: String(error), stack: error instanceof Error ? error.stack : null,
          contextCreated: !!context, pageCreated: !!page, mockSeedCompleted: !!mock, expectedRaw: rawByCase[name], inputsRetriedOrChanged: false } });
        if (mock) try { await mock.assertBoundary(info); } catch (boundaryError) { evidence.push({ type: 'boundary-failure', data: String(boundaryError) }); }
        if (page) await page.screenshot({ path: info.outputPath('failure.png'), fullPage: true }).catch(() => {});
        results.push({ name, width, height, ok: false, error: String(error), evidence });
      } finally {
        if (context) await context.close().catch(error => {
          evidence.push({ type: 'context-close-failure', data: String(error) });
          const result = results.at(-1)!; result.ok = false; result.error = result.error ?? String(error);
        });
      }
      writeFileSync(resolve(directory, 'results.json'), JSON.stringify({
        scope: 'Actual frozen production JS/CSS + synthetic Auth/API/CAS; real textarea key/input actions; DOM paste-result simulation; no real DB, OS clipboard, IME, device or observed-user evidence',
        expectedCases: selectedCases, expectedViewports: viewports, fullMatrix: !selected && !single, buildId: build.buildId, inputHash: build.inputHash, results,
        pureParameterPreflight: parameters, qaSources, runtimeFailureStatus: results.some(result => !result.ok) ? 'FAIL' : 'NONE',
        runtimeFailurePolicy: 'Case runtime failures remain FAIL; exact inputs are never retried or replaced',
      }, null, 2));
    }
  } finally { await browser.close(); }
  const expected = viewports.flatMap(([width, height]) => selectedCases.map(name => `${name}:${width}x${height}`));
  const actual = results.map(({ name, width, height }) => `${name}:${width}x${height}`);
  assert.deepEqual(actual, expected); assert.equal(new Set(actual).size, expected.length); build.unchanged(); qaUnchanged();
  await serverPreflight(build.buildId);
  console.log(JSON.stringify({ directory, buildId: build.buildId, passed: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length, fullMatrix: !selected && !single,
    failures: results.filter(result => !result.ok).map(({ name, width, error }) => ({ name, width, error })) }, null, 2));
  if (results.some(result => !result.ok)) process.exitCode = 1;
}

void main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1;
  if (!process.argv.includes('--contract-only')) {
    try {
      if (!outputOwnedThisRun && existsSync(directory)) {
        console.error('Previous evidence directory exists; no failure artifact will overwrite it.'); return;
      }
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, 'runtime-failure.json'), JSON.stringify({ status: 'FAIL', error: String(error),
        stack: error instanceof Error ? error.stack : null, plannedCases: cases, expectedViewports: journeyViewports,
        remainingCases: 'NOT_RUN', inputsRetriedOrChanged: false }, null, 2));
    } catch (artifactError) { console.error(`Runtime failure artifact could not be saved: ${String(artifactError)}`); }
  }
});
