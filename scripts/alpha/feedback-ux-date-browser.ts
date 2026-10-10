import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import type { Locator, Page } from 'playwright';
import type { mockFolderContentEntry } from '../../tests/e2e/folder-content-entry.fixture';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { textWorkspaceModel as M, type TextTask } from '../../lib/flow/integrated-poc/text-workspace';

type DateMock = Awaited<ReturnType<typeof mockFolderContentEntry>>;
export type FeedbackDateEvidence = { type: string; data: unknown };
type DateSnapshot = { account: AlphaAccount; counts: { mutations: number; operations: number }; commands: number; storage: number };
export interface FeedbackDateBrowserInput {
  page: Page; mock: DateMock; initial: AlphaAccount; docId: string; width: number; evidence: FeedbackDateEvidence[];
  ui: {
    click(target: Locator): Promise<void>;
    area(page: Page): Locator;
    editor(page: Page): Locator;
    undo(page: Page): Locator;
    caret(page: Page, lineIndex: number, atEnd?: boolean): Promise<void>;
    settle(page: Page, mock: DateMock, docId: string, raw: string): Promise<void>;
    screenshot(page: Page, name: 'today-source', width: number, step: string, evidence: FeedbackDateEvidence[]): Promise<void>;
    snapshot(page: Page, mock: DateMock): Promise<DateSnapshot>;
    noChange(page: Page, mock: DateMock, before: DateSnapshot): Promise<void>;
  };
}

const today = '2026-10-02', pastDate = '2026-10-01', changedDate = '2026-10-03';
const folderTitles = { parent: '날짜 QA 묶음', child: '날짜 QA 하위', outside: '날짜 QA 바깥' } as const;
export const feedbackDateRaw = [
  '[2026-10-01]', '- 날짜 QA 묶음',
  '  - [ ] 같은 이름', '    - 메모: 지난 원문',
  '  - [x] 지난 완료 확인', '    - 메모: 지난 완료 원문',
  '  - 날짜 QA 하위', '    - [ ] 하위 지난 미완료', '      - 메모: 하위 지난 원문',
  '[2026-10-02]', '- 날짜 QA 묶음',
  '  - [ ] 같은 이름', '    - 메모: 오늘 원문',
  '  - [x] 오늘 완료 확인', '    - 메모: 오늘 완료 원문',
  '  - [ ] 개별 날짜 확인', '    - 날짜: 2026-10-01', '    - 시간: 09:30', '    - 메모: 개별 날짜 원문',
  '  - [ ] 이후 예정 확인', '    - 날짜: 2026-10-03',
  '  - 날짜 QA 하위', '    - [ ] 하위 오늘 확인', '      - 메모: 하위 오늘 원문',
  '- 날짜 QA 바깥', '  - [ ] 다른 폴더 확인', '    - 메모: 다른 폴더 원문',
  '[미정]', '- 날짜 QA 묶음', '  - [ ] 미정 확인', '    - 메모: 미정 원문',
].join('\n');

/** Initial synthetic account only. Bind each empty scope before adding its
 * descendants; no post-boot model transition substitutes for a user action. */
export function prepareFeedbackDateAccount(initial: AlphaAccount, docId: string): AlphaAccount {
  let text = initial.space.text;
  const document = M.getDocument(text, docId);
  assert(document && M.raw(document) === '', 'Date QA requires a fresh empty synthetic document');
  const scopeIds: Partial<Record<keyof typeof folderTitles, string>> = {};
  const written: string[] = [];
  for (const line of feedbackDateRaw.split('\n')) {
    const scope = (Object.keys(folderTitles) as (keyof typeof folderTitles)[])
      .find(key => line.trim() === '- ' + folderTitles[key]);
    const input = scope ? line.match(/^ */)![0] + '- ' : line;
    const appended = [...written, input].join('\n');
    text = M.editText(text, docId, appended);
    assert.equal(M.raw(M.getDocument(text, docId)), appended, 'Date seed append refused');
    if (scope) {
      const index = written.length;
      text = scopeIds[scope] ? M.attachScope(text, docId, index, scopeIds[scope]!)
        : M.createFolderAt(text, docId, index, folderTitles[scope]);
      const row = M.rowMeta(text, docId)[index];
      assert(row?.kind === 'scope' && row.scopeId, 'Date seed scope attachment refused');
      scopeIds[scope] ??= row.scopeId;
      assert.equal(row.scopeId, scopeIds[scope]);
    }
    written.push(line);
    assert.equal(M.raw(M.getDocument(text, docId)), written.join('\n'), 'Date seed source drift');
  }
  const override = M.tasks(text).find(task => task.docId === docId && task.title === '개별 날짜 확인');
  assert(override);
  text = M.recordProgress(text, override.id, '2026-09-30', 20);
  assert(M.validate(text)); assert.equal(M.raw(M.getDocument(text, docId)), feedbackDateRaw);
  assert.equal(text.folders.find(folder => folder.id === scopeIds.child)?.parentId, scopeIds.parent);
  assert.equal(text.folders.find(folder => folder.id === scopeIds.outside)?.parentId, null);
  return { ...initial, space: { ...initial.space, text } };
}

function protectOwners(initial: AlphaAccount, current: AlphaAccount, docId: string) {
  assert.deepEqual(current.space.creatorWorkspace, initial.space.creatorWorkspace);
  assert.deepEqual(current.space.copies, initial.space.copies);
  assert.deepEqual(current.space.text.documents.filter(doc => doc.id !== docId), initial.space.text.documents.filter(doc => doc.id !== docId));
  assert.deepEqual(current.space.text.flows, initial.space.text.flows);
}
function exactTask(tasks: TextTask[], title: string, date?: string | null): TextTask {
  const found = tasks.filter(task => task.title === title && (date === undefined || task.date === date));
  assert.equal(found.length, 1, `Date QA task is not exact: ${title}/${date}`); return found[0];
}

/** Real DOM actions only after boot. Model access below is read-only evidence. */
export async function runFeedbackDateBrowser(input: FeedbackDateBrowserInput): Promise<void> {
  const { page, mock, initial, docId, width, evidence, ui } = input;
  const source = M.getDocument(initial.space.text, docId)!; assert(source);
  assert.equal(M.raw(source), feedbackDateRaw);
  const tasks = M.tasks(initial.space.text).filter(task => task.docId === docId);
  const past = exactTask(tasks, '같은 이름', pastDate), current = exactTask(tasks, '같은 이름', today);
  const pastDone = exactTask(tasks, '지난 완료 확인'), todayDone = exactTask(tasks, '오늘 완료 확인');
  const override = exactTask(tasks, '개별 날짜 확인'), unscheduled = exactTask(tasks, '미정 확인');
  const childPast = exactTask(tasks, '하위 지난 미완료'), childToday = exactTask(tasks, '하위 오늘 확인');
  const outside = exactTask(tasks, '다른 폴더 확인'), future = exactTask(tasks, '이후 예정 확인');
  assert.notEqual(past.id, current.id); assert.equal(past.note, '지난 원문'); assert.equal(current.note, '오늘 원문');
  assert(pastDone.done && todayDone.done); assert.equal(override.time, '09:30');
  const parentFolder = initial.space.text.folders.find(folder => folder.title === folderTitles.parent)!;
  const childFolder = initial.space.text.folders.find(folder => folder.title === folderTitles.child)!;
  const outsideFolder = initial.space.text.folders.find(folder => folder.title === folderTitles.outside)!;
  assert(parentFolder && childFolder && outsideFolder); assert.equal(childFolder.parentId, parentFolder.id);
  assert.equal(past.folderId, parentFolder.id); assert.equal(childPast.folderId, childFolder.id); assert.equal(outside.folderId, outsideFolder.id);
  const views = page.getByRole('navigation', { name: '개인공간 보기', exact: true });
  const row = (task: TextTask) => page.locator(`li[data-task-id="${task.id}"]`);
  const action = (task: TextTask) => row(task).getByRole('button', { name: `${task.title} 작업`, exact: true });
  async function expectRows(visible: TextTask[]) {
    const ids = visible.map(task => task.id).sort();
    await expect.poll(async () => {
      const presence = await Promise.all(tasks.map(async task => await row(task).isVisible() ? task.id : null));
      return presence.filter((id): id is string => id !== null).sort();
    }, { message: 'Exact seeded Item IDs obey the current date/folder view' }).toEqual(ids);
  }
  async function chooseFolder(id: string) {
    const select = page.getByRole('combobox', { name: '폴더', exact: true });
    if (!await select.isVisible()) await ui.click(page.getByRole('button', { name: /^문서·폴더 열기/ }));
    await expect(select).toBeVisible(); await select.scrollIntoViewIfNeeded(); await select.selectOption(id);
    await expect(select).toHaveValue(id);
    const close = page.getByRole('button', { name: /^문서·폴더 접기/ });
    if (await close.isVisible()) await ui.click(close);
  }
  async function openDetail(task: TextTask) {
    const target = action(task); await expect(target).toBeVisible(); await target.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: task.title, exact: true })).toBeVisible(); return dialog;
  }
  async function returnToExactSource(task: TextTask, account: AlphaAccount, step: string) {
    const before = await ui.snapshot(page, mock), doc = M.getDocument(account.space.text, docId)!;
    const index = doc.lines.findIndex(line => line.id === task.id); assert(index >= 0);
    const offset = doc.lines.slice(0, index).reduce((count, line) => count + line.text.length + 1, 0);
    const origin = row(task).getByRole('button').filter({ has: page.locator('small') });
    await expect(origin).toHaveCount(1); await expect(origin).toBeVisible(); await origin.focus(); await page.keyboard.press('Enter');
    const field = ui.area(page); await expect(field).toHaveValue(M.raw(doc)); await expect(field).toBeFocused();
    await expect(ui.editor(page).locator('xpath=ancestor::*[@data-program-document][1]')).toHaveAttribute('data-program-document', docId);
    await expect.poll(() => field.evaluate((element, expected) => {
      const textarea = element as HTMLTextAreaElement;
      const lineIndex = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
      return { focused: document.activeElement === textarea, start: textarea.selectionStart, end: textarea.selectionEnd,
        lineId: expected.lineIds[lineIndex] ?? null };
    }, { lineIds: doc.lines.map(line => line.id) })).toEqual({ focused: true, start: offset, end: offset, lineId: task.id });
    await ui.noChange(page, mock, before);
    evidence.push({ type: step, data: { documentId: docId, taskId: task.id, lineIndex: index, selectionStart: offset,
      selectionEnd: offset, focused: true, explicitKeyboardSourceReturn: true, commandMutationStorageDelta: 0 } });
  }

  const readOnlyBaseline = await ui.snapshot(page, mock);
  await ui.click(views.getByRole('button', { name: '오늘', exact: true }));
  await page.getByLabel('조회 날짜', { exact: true }).fill(today); await chooseFolder('');
  const todayAll = [past, current, todayDone, override, childPast, childToday, outside];
  await expectRows(todayAll);
  await expect(row(past)).toContainText(pastDate); await expect(row(current)).toContainText(today);
  await expect(row(todayDone).getByRole('button', { name: '오늘 완료 확인 다시 열기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '지난 미완료', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘', exact: true }).first()).toBeVisible();
  await ui.screenshot(page, 'today-source', width, 'today-completion-and-original-dates', evidence);
  await chooseFolder(parentFolder.id); await expectRows(todayAll.filter(task => task.id !== outside.id));
  await expect(page.locator('[aria-label="할 일 조회 범위"]')).toContainText(`${folderTitles.parent} · 하위 포함`);
  await expect(row(childPast)).toContainText(`${folderTitles.parent} / ${folderTitles.child}`);
  await chooseFolder(childFolder.id); await expectRows([childPast, childToday]);
  await expect(page.locator('[aria-label="할 일 조회 범위"]')).toContainText(`${folderTitles.parent} / ${folderTitles.child} · 하위 포함`);
  await chooseFolder(outsideFolder.id); await expectRows([outside]);
  await chooseFolder(''); await expectRows(todayAll);
  await ui.click(views.getByRole('button', { name: '전체 할 일', exact: true })); await expectRows(tasks);
  await ui.click(views.getByRole('button', { name: '날짜 미정', exact: true })); await expectRows([unscheduled]);
  let dialog = await openDetail(unscheduled);
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toHaveText('구획 날짜 · 미정');
  await page.keyboard.press('Escape'); await expect(action(unscheduled)).toBeFocused();
  await ui.click(views.getByRole('button', { name: '오늘', exact: true })); await expectRows(todayAll);
  await ui.noChange(page, mock, readOnlyBaseline);
  evidence.push({ type: 'today-date-folder-filter-contract', data: { pastIncompleteIds: [past.id, override.id, childPast.id],
    pastCompletedIdExcluded: pastDone.id, todayCompletedIdIncluded: todayDone.id, futureIdExcluded: future.id,
    undatedIdExcludedFromToday: unscheduled.id, parentFolderId: parentFolder.id, childFolderId: childFolder.id,
    outsideFolderId: outsideFolder.id, allAndSpecificAndDescendantViews: true, mutationCommandStorageDelta: 0 } });

  const beforeRead = await ui.snapshot(page, mock);
  dialog = await openDetail(past);
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toHaveText(`구획 날짜 · ${pastDate}`);
  await dialog.getByLabel('실행 날짜', { exact: true }).fill('2026-10-08'); await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(action(past)).toBeFocused(); await ui.noChange(page, mock, beforeRead);
  dialog = await openDetail(override);
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText(`개별 날짜 · ${pastDate}`);
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText(`구획 날짜 · ${today}`);
  await ui.screenshot(page, 'today-source', width, 'individual-and-section-date', evidence);
  await page.keyboard.press('Escape'); await expect(action(override)).toBeFocused(); await ui.noChange(page, mock, beforeRead);

  dialog = await openDetail(past);
  await dialog.getByLabel('기록 날짜', { exact: true }).fill(today); await dialog.getByLabel('누적 진행 (%)', { exact: true }).fill('40');
  await ui.click(dialog.getByRole('button', { name: '진행 기록', exact: true }));
  await expect.poll(async () => M.latestProgress((await mock.current()).space.text, past.id)).toEqual({ date: today, percent: 40 });
  // The synthetic server can expose the postimage before the browser accepts
  // its receipt. Await this write's UI settlement before one source-return key.
  await expect(ui.undo(page)).toBeEnabled();
  evidence.push({ type: 'progress-write-ui-receipt-ack', data: { taskId: past.id, date: today, percent: 40,
    commandRequestId: mock.commands.at(-1)?.requestId, confirmedRevision: (await mock.current()).revision,
    serverPostimageAndUIUndoEnabled: true, sourceReturnRetried: false } });
  await page.keyboard.press('Escape'); await expect(action(past)).toBeFocused();
  const progressed = await mock.current(); protectOwners(initial, progressed, docId);
  assert.deepEqual(progressed.space.text.documents, initial.space.text.documents);
  assert.deepEqual(progressed.space.text.bindings, initial.space.text.bindings);
  assert.deepEqual(progressed.space.text.taskScopes, initial.space.text.taskScopes); assert.deepEqual(progressed.space.text.itemScopes, initial.space.text.itemScopes);
  assert.equal(M.latestProgress(progressed.space.text, current.id), null);
  assert.deepEqual(M.tasks(progressed.space.text).filter(task => task.docId === docId), tasks);
  await returnToExactSource(past, progressed, 'same-title-past-exact-source-focus');

  await ui.click(views.getByRole('button', { name: '오늘', exact: true })); await expectRows(todayAll);
  const beforeSchedule = await ui.snapshot(page, mock);
  dialog = await openDetail(override); await dialog.getByLabel('실행 날짜', { exact: true }).fill(changedDate);
  await ui.click(dialog.getByRole('button', { name: '날짜·시간 적용', exact: true }));
  await expect.poll(async () => M.tasks((await mock.current()).space.text).find(task => task.id === override.id)?.date).toBe(changedDate);
  await expect(ui.undo(page)).toBeEnabled();
  evidence.push({ type: 'date-write-ui-receipt-ack', data: { taskId: override.id, date: changedDate,
    commandRequestId: mock.commands.at(-1)?.requestId, confirmedRevision: (await mock.current()).revision,
    serverPostimageAndUIUndoEnabled: true, sourceReturnRetried: false } });
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText(`개별 날짜 · ${changedDate}`);
  await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText(`구획 날짜 · ${today}`);
  await ui.screenshot(page, 'today-source', width, 'exact-item-date-applied', evidence);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  const changed = await mock.current(), changedDoc = M.getDocument(changed.space.text, docId)!;
  protectOwners(initial, changed, docId);
  const expectedTasks = M.tasks(beforeSchedule.account.space.text).filter(task => task.docId === docId)
    .map(task => task.id === override.id ? { ...task, date: changedDate } : task);
  assert.deepEqual(M.tasks(changed.space.text).filter(task => task.docId === docId), expectedTasks);
  for (const key of ['bindings', 'folders', 'taskScopes', 'itemScopes', 'progressRecords'] as const)
    assert.deepEqual(changed.space.text[key], beforeSchedule.account.space.text[key]);
  const dateProperty = M.rowMeta(beforeSchedule.account.space.text, docId)
    .filter(entry => entry.kind === 'property' && entry.taskId === override.id && /^ *- 날짜: /.test(entry.text));
  assert.equal(dateProperty.length, 1);
  assert.deepEqual(changedDoc.lines, source.lines.map(line => line.id === dateProperty[0].id
    ? { ...line, text: line.text.replace(pastDate, changedDate) } : line));
  assert.deepEqual(mock.diagnostics(), { mutations: beforeSchedule.counts.mutations + 1, operations: beforeSchedule.counts.operations + 1 });
  assert.equal(mock.commands.length, beforeSchedule.commands + 1);
  await expectRows(todayAll.filter(task => task.id !== override.id));
  await ui.click(views.getByRole('button', { name: '전체 할 일', exact: true })); await expectRows(tasks);
  await expect(row(override)).toContainText(changedDate);
  await returnToExactSource(override, changed, 'changed-override-exact-source-focus');

  const beforeUndo = await ui.snapshot(page, mock); await ui.click(ui.undo(page));
  await expect.poll(async () => (await mock.current()).space.text).toEqual(beforeSchedule.account.space.text);
  await ui.settle(page, mock, docId, feedbackDateRaw);
  const undone = await mock.current(); protectOwners(initial, undone, docId);
  assert.deepEqual(M.tasks(undone.space.text).filter(task => task.docId === docId), tasks);
  assert.deepEqual(mock.diagnostics(), { mutations: beforeUndo.counts.mutations + 1, operations: beforeUndo.counts.operations + 1 });
  assert.equal(mock.commands.length, beforeUndo.commands + 1);
  assert.equal(mock.commands.at(-1)?.kind, 'undo-private');
  const beforeReload = await ui.snapshot(page, mock);
  await page.reload(); await expect(ui.area(page)).toHaveValue(feedbackDateRaw);
  assert.deepEqual((await mock.current()).space.text, undone.space.text);
  assert.deepEqual(mock.diagnostics(), beforeReload.counts); assert.equal(mock.commands.length, beforeReload.commands);
  // A fresh explicit return is checked after reload. Persistence of the previous
  // navigation caret is not an existing account-writing guarantee and is not claimed.
  await ui.click(views.getByRole('button', { name: '전체 할 일', exact: true })); await expectRows(tasks);
  await returnToExactSource(override, await mock.current(), 'reloaded-override-explicit-source-focus');
  evidence.push({ type: 'today-source-date-undo-reload-contract', data: { pastTaskId: past.id, sameTitleTodayTaskId: current.id,
    overrideTaskId: override.id, oldDate: pastDate, appliedDate: changedDate, originalSectionDate: today,
    noteTimeFolderTaskIdsAndHistoryPreserved: true, onlyOwnedDatePropertyChanged: true,
    explicitDateMutationDelta: 1, undoMutationDelta: 1, reloadMutationCommandDelta: 0,
    progressDate: today, progressPercent: 40, exactSourceFocusCheckedBeforeAndAfterReload: true,
    automaticCaretPersistenceAcrossReload: 'NOT_ASSERTED' } });
}
